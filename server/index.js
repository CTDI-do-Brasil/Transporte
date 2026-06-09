import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';
import fs from 'fs';
import crypto from 'crypto';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // For easier dev, can be tightened later
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Global Rate Limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    message: { error: 'Muitas requisições deste IP, tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(globalLimiter);

// Strict Rate Limiter for Auth/Email
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10, // 10 attempts allowed
    message: { error: 'Limite de tentativas atingido. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// HTML Sanitizer for Emails
const escapeHtml = (unsafe) => {
    return (unsafe || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// Database connection
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: (process.env.DATABASE_URL?.includes('localhost') ||
        process.env.DATABASE_URL?.includes('srv-captain') ||
        process.env.PGSSLMODE === 'disable')
        ? false : { rejectUnauthorized: false }
});

// Ensure request_number and extra metadata columns exist
try {
    await pool.query('ALTER TABLE declarations ADD COLUMN IF NOT EXISTS request_number VARCHAR(50)');
    await pool.query('ALTER TABLE declarations ADD COLUMN IF NOT EXISTS ship_to_address_to VARCHAR(255)');
    await pool.query('ALTER TABLE declarations ADD COLUMN IF NOT EXISTS employee_email VARCHAR(255)');
    await pool.query('ALTER TABLE declarations ADD COLUMN IF NOT EXISTS delivery_date VARCHAR(50)');
    await pool.query('ALTER TABLE declarations ADD COLUMN IF NOT EXISTS request_type VARCHAR(50)');
    await pool.query('ALTER TABLE declarations ADD COLUMN IF NOT EXISTS priority VARCHAR(50)');
    await pool.query('ALTER TABLE declarations ADD COLUMN IF NOT EXISTS legal_hold VARCHAR(50)');
    
    // Auth columns
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP');
} catch (err) {
    console.warn('Could not ensure columns:', err.message);
}

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'srv-captain--mailserver',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // Port 587 uses STARTTLS
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1'
    }
});

const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: `"DocTransporte" <${process.env.SMTP_USER || 'contato@ehspro.com.br'}>`,
            to,
            subject,
            html
        });
        console.log(`Email enviado para ${to}`);
    } catch (err) {
        console.error('Erro ao enviar e-mail:', err);
    }
};

// Helper for Audit Logs
const createLog = async (username, action, entity, entityId, details) => {
    try {
        await pool.query(
            'INSERT INTO audit_logs (username, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [username, action, entity, entityId, details]
        );
    } catch (err) {
        console.error('Error creating log:', err);
    }
};

// Auth Route
app.use('/api/forgot-password', authLimiter);
app.use('/api/users', authLimiter);
app.post('/api/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        // Agora aceita username OU email
        const result = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        // Return role and USERNAME for frontend logic
        res.json({ success: true, username: user.username, role: user.role || 'user' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor ao tentar logar' });
    }
});

// Temporary Setup Route (Visit this once in browser to create admin user)
app.get('/api/setup-admin', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await pool.query(
            `INSERT INTO users (username, password, role, email) VALUES ($1, $2, $3, $4)
             ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, email = EXCLUDED.email`,
            ['admin', hashedPassword, 'master', 'dsantos@ctdi.com']
        );
        res.send('Usuário administrador criado/atualizado com sucesso! Agora você pode logar com admin / admin123 e o e-mail dsantos@ctdi.com está vinculado.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao criar admin: ' + err.message);
    }
});

app.get('/api/setup-audit', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50),
                action VARCHAR(20),
                entity VARCHAR(50),
                entity_id VARCHAR(50),
                details TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
        `);
        res.send('Tabela audit_logs criada com sucesso!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao criar tabela de logs: ' + err.message);
    }
});

// Routes
app.get('/api/declarations', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM declarations ORDER BY created_at DESC');
        // Map database fields to frontend structure
        const declarations = result.rows.map(row => ({
            id: row.id,
            number: row.number,
            date: row.date,
            city: row.city,
            recipient: row.recipient,
            equipment: row.equipment,
            sender: row.sender,
            carrier: row.carrier,
            signatureSender: row.signature_sender,
            signatureCarrier: row.signature_carrier,
            requestNumber: row.request_number,
            shipToAddressTo: row.ship_to_address_to,
            employeeEmail: row.employee_email,
            deliveryDate: row.delivery_date,
            requestType: row.request_type,
            priority: row.priority,
            legalHold: row.legal_hold
        }));
        res.json(declarations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/declarations/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM declarations WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir declaração' });
    }
});

app.post('/api/declarations', async (req, res) => {
    const { 
        id, number, date, city, recipient, equipment, sender, carrier, 
        signatureSender, signatureCarrier, requestNumber,
        shipToAddressTo, employeeEmail, deliveryDate, requestType, priority, legalHold,
        pdfBase64
    } = req.body;
    try {
        await pool.query(
            `INSERT INTO declarations (
                id, number, date, city, recipient, equipment, sender, carrier, 
                signature_sender, signature_carrier, request_number,
                ship_to_address_to, employee_email, delivery_date, request_type, priority, legal_hold
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (id) DO UPDATE SET
            signature_sender = EXCLUDED.signature_sender,
            signature_carrier = EXCLUDED.signature_carrier,
            request_number = EXCLUDED.request_number,
            ship_to_address_to = EXCLUDED.ship_to_address_to,
            employee_email = EXCLUDED.employee_email,
            delivery_date = EXCLUDED.delivery_date,
            request_type = EXCLUDED.request_type,
            priority = EXCLUDED.priority,
            legal_hold = EXCLUDED.legal_hold`,
            [
                id, number, date, city, JSON.stringify(recipient), JSON.stringify(equipment), JSON.stringify(sender), JSON.stringify(carrier), 
                signatureSender, signatureCarrier, requestNumber,
                shipToAddressTo, employeeEmail, deliveryDate, requestType, priority, legalHold
            ]
        );

        // Log the action
        const usernameForLog = req.headers['x-username'] || 'desconhecido';
        await createLog(usernameForLog, 'CREATE/UPDATE', 'DECLARATION', id, `Declaração Nº ${number}`);

        // Notification Email
        try {
            console.log(`Iniciando processo de e-mail para usuário: ${usernameForLog}`);
            const userResult = await pool.query('SELECT email FROM users WHERE username = $1', [usernameForLog]);
            const userEmail = userResult.rows[0]?.email;

            if (userEmail) {
                console.log(`E-mail do usuário encontrado: ${userEmail}`);
                
                const normalizedUserEmail = userEmail.toLowerCase().trim();
                
                // Fetch all Master users to add them in CC
                const mastersResult = await pool.query("SELECT email FROM users WHERE role = 'master'");
                const masterEmails = [...new Set(mastersResult.rows
                    .map(r => r.email?.toLowerCase().trim())
                    .filter(e => e && e !== normalizedUserEmail))];

                // Handle filename generation for attachment
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const d = new Date();
                const day = d.getDate().toString().padStart(2, '0');
                const month = months[d.getMonth()];
                const year = d.getFullYear().toString().slice(-2);
                const dateStr = `${day}${month}${year}`;
                
                const ritm = requestNumber || 'RITM0000000';
                const company = sender.companyName || 'GE Vernova';
                const finalFilename = `SR - ${ritm} - DNI ${number} – ${company} - Reversa – ${dateStr}.pdf`;

                const emailHtml = `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; color: #1a202c;">
                        <div style="padding: 25px 0; text-align: center; background: #f8fafc;">
                            <img src="cid:logo" alt="DNIGen" style="height: 45px; width: auto; margin-bottom: 10px;">
                            <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800; letter-spacing: -0.025em;">Nova Declaração #DNI ${number}</h2>
                        </div>
                        
                        <div style="padding: 30px;">
                            <p style="margin-top: 0; font-size: 14px; color: #475569;">Olá <strong>${escapeHtml(usernameForLog)}</strong>, os detalhes da nova declaração estão abaixo:</p>
                            
                            <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                    <tr>
                                        <td style="padding: 4px 0; color: #64748b; font-weight: 600; width: 90px;">RITM:</td>
                                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${escapeHtml(ritm)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Remetente:</td>
                                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${escapeHtml(sender.name)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Empresa:</td>
                                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${escapeHtml(company)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Destinatário:</td>
                                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${escapeHtml(recipient.name)}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-bottom: 0; text-align: center;">
                                Documento PDF oficial anexado. Disponível também no sistema.
                            </p>
                        </div>
                    </div>
                `;

                // Resolve logo path (handle both local development and CapRover/production)
                let logoPath = path.join(__dirname, '../public/LOGOS/LogoPrincipal.png');
                if (process.env.NODE_ENV === 'production') {
                    logoPath = path.join(__dirname, '../dist/LOGOS/LogoPrincipal.png');
                }

                // Final attempt: if it fails, we still want to send the email without the logo
                const attachments = [];
                if (fs.existsSync(logoPath)) {
                    attachments.push({
                        filename: 'logo.png',
                        path: logoPath,
                        cid: 'logo'
                    });
                } else {
                    console.warn('Logo not found at:', logoPath);
                }

                const mailOptions = {
                    from: `"DNIGen" <${process.env.SMTP_USER}>`,
                    to: userEmail,
                    cc: masterEmails.join(', '),
                    subject: `Declaração de Transporte #${number} - ${recipient.name}`,
                    text: `Olá ${usernameForLog}, uma nova declaração de transporte foi gerada (#${number}).\n\nRITM: ${ritm}\nEmpresa: ${company}\nDestinatário: ${recipient.name}\n\nO PDF está em anexo.`,
                    html: emailHtml,
                    priority: 'high',
                    attachments: attachments
                };

                if (pdfBase64) {
                    console.log('Anexando PDF em Base64...');
                    mailOptions.attachments.push({
                        filename: finalFilename,
                        content: pdfBase64.split('base64,')[1] || pdfBase64,
                        encoding: 'base64'
                    });
                }

                const info = await transporter.sendMail(mailOptions);
                console.log(`Email enviado com sucesso! MessageID: ${info.messageId}`);
                console.log(`Destinatário: ${userEmail}${masterEmails.length > 0 ? ` (com CC para: ${masterEmails.join(', ')})` : ''}`);
            } else {
                console.warn(`Aviso: Usuário ${usernameForLog} não possui e-mail cadastrado.`);
            }
        } catch (mailErr) {
            console.error('ERRO FATAL NO ENVIO DE E-MAIL:', mailErr);
            console.error('Configuração SMTP usada:', {
                host: process.env.SMTP_HOST || 'srv-captain--mailserver',
                port: process.env.SMTP_PORT || '587',
                user: process.env.SMTP_USER
            });
        }

        res.status(201).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/declarations/:id', async (req, res) => {
    const { id } = req.params;
    const username = req.headers['x-username'] || 'desconhecido';
    try {
        await pool.query('DELETE FROM declarations WHERE id = $1', [id]);
        await createLog(username, 'DELETE', 'DECLARATION', id, `Excluiu declaração ID ${id}`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir declaração' });
    }
});

app.get('/api/logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar logs' });
    }
});

// User Management Routes
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, email, created_at FROM users ORDER BY username ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

app.get('/api/user-role/:username', async (req, res) => {
    try {
        const result = await pool.query('SELECT role FROM users WHERE username = $1', [req.params.username]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json({ role: result.rows[0].role || 'user' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar nível de acesso' });
    }
});

app.post('/api/users', async (req, res) => {
    const { username, role, email } = req.body;
    const adminUsername = req.headers['x-username'] || 'admin';
    try {
        // Create user with a random temp password
        const tempPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        const result = await pool.query(
            'INSERT INTO users (username, password, role, email) VALUES ($1, $2, $3, $4) RETURNING id',
            [username, hashedPassword, role || 'user', email]
        );
        
        const userId = result.rows[0].id;

        // Generate welcome/reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 86400000); // 24 hours for first access
        await pool.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [token, expiry, userId]);

        const setupLink = `${req.headers.origin || 'http://localhost:5173'}?token=${token}&view=reset-password`;

        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; color: #1a202c;">
                <div style="padding: 25px 0; text-align: center; background: #f8fafc;">
                    <img src="cid:logo" alt="DNIGen" style="height: 45px; width: auto; margin-bottom: 10px;">
                    <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">Bem-vindo</h2>
                </div>
                <div style="padding: 30px; text-align: center;">
                    <p style="font-size: 14px; color: #475569;">Olá <strong>${escapeHtml(username)}</strong>, sua conta foi criada com sucesso.</p>
                    <p style="font-size: 14px; color: #475569;">Clique no botão abaixo para definir sua senha de acesso:</p>
                    <a href="${setupLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Definir Senha</a>
                    <p style="color: #64748b; font-size: 11px;">Este link é válido por 24 horas.</p>
                </div>
            </div>
        `;

        // Resolve logo path
        let logoPath = path.join(__dirname, '../public/LOGOS/LogoPrincipal.png');
        if (process.env.NODE_ENV === 'production') {
            logoPath = path.join(__dirname, '../dist/LOGOS/LogoPrincipal.png');
        }

        const attachments = [];
        if (fs.existsSync(logoPath)) {
            attachments.push({
                filename: 'logo.png',
                path: logoPath,
                cid: 'logo'
            });
        }

        await transporter.sendMail({
            from: `"DNIGen" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Bem-vindo ao DNIGen - Defina sua Senha',
            html: emailHtml,
            attachments: attachments
        });

        await createLog(adminUsername, 'CREATE', 'USER', username, `Criou usuário ${username} (${role}) e enviou convite para ${email}`);
        res.status(201).json({ success: true });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Usuário já existe' });
        }
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const adminUsername = req.headers['x-username'] || 'admin';
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        await createLog(adminUsername, 'DELETE', 'USER', req.params.id, 'Excluiu um usuário');
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { username, password, role, email } = req.body;
    const adminUsername = req.headers['x-username'] || 'admin';
    try {
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                'UPDATE users SET username = $1, password = $2, role = $3, email = $4 WHERE id = $5',
                [username, hashedPassword, role, email, req.params.id]
            );
        } else {
            await pool.query(
                'UPDATE users SET username = $1, role = $2, email = $3 WHERE id = $4',
                [username, role, email, req.params.id]
            );
        }
        await createLog(adminUsername, 'UPDATE', 'USER', username, `Editou o usuário ${username}`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao editar usuário' });
    }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// Password Reset Routes
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const userResult = await pool.query('SELECT username, id FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'E-mail não encontrado no sistema.' });
        }

        const user = userResult.rows[0];
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000); // 1 hour

        await pool.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [token, expiry, user.id]);

        const resetLink = `${req.headers.origin || 'http://localhost:5173'}?token=${token}&view=reset-password`;

        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; color: #1a202c;">
                <div style="padding: 25px 0; text-align: center; background: #f8fafc;">
                    <img src="cid:logo" alt="DNIGen" style="height: 45px; width: auto; margin-bottom: 10px;">
                    <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">Redefinição de Senha</h2>
                </div>
                <div style="padding: 30px; text-align: center;">
                    <p style="font-size: 14px; color: #475569;">Olá <strong>${escapeHtml(user.username)}</strong>, você solicitou a redefinição de sua senha.</p>
                    <a href="${resetLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Redefinir Senha</a>
                    <p style="color: #64748b; font-size: 11px;">Este link expira em 1 hora. Se você não solicitou isso, ignore este e-mail.</p>
                </div>
            </div>
        `;

        // Resolve logo path
        let logoPath = path.join(__dirname, '../public/LOGOS/LogoPrincipal.png');
        if (process.env.NODE_ENV === 'production') {
            logoPath = path.join(__dirname, '../dist/LOGOS/LogoPrincipal.png');
        }

        const attachments = [];
        if (fs.existsSync(logoPath)) {
            attachments.push({ filename: 'logo.png', path: logoPath, cid: 'logo' });
        }

        await transporter.sendMail({
            from: `"DNIGen" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Redefinição de Senha - DNIGen',
            html: emailHtml,
            attachments: attachments
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const userResult = await pool.query(
            'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
            [token]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Token inválido ou expirado.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
            [hashedPassword, userResult.rows[0].id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
});

app.post('/api/users/:id/reset-password-email', authLimiter, async (req, res) => {
    const { id } = req.params;
    const adminUsername = req.headers['x-username'] || 'admin';
    try {
        const userResult = await pool.query('SELECT username, email FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const user = userResult.rows[0];
        if (!user.email) {
            return res.status(400).json({ error: 'Usuário não possui e-mail cadastrado.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000); // 1 hour

        await pool.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [token, expiry, id]);

        const resetLink = `${req.headers.origin || 'http://localhost:5173'}?token=${token}&view=reset-password`;

        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; color: #1a202c;">
                <div style="padding: 25px 0; text-align: center; background: #f8fafc;">
                    <img src="cid:logo" alt="DNIGen" style="height: 45px; width: auto; margin-bottom: 10px;">
                    <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">Redefinição de Senha</h2>
                </div>
                <div style="padding: 30px; text-align: center;">
                    <p style="font-size: 14px; color: #475569;">Olá <strong>${escapeHtml(user.username)}</strong>, o administrador solicitou a redefinição de sua senha.</p>
                    <a href="${resetLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Redefinir Senha</a>
                    <p style="color: #64748b; font-size: 11px;">Este link expira em 1 hora.</p>
                </div>
            </div>
        `;

        // Resolve logo path
        let logoPath = path.join(__dirname, '../public/LOGOS/LogoPrincipal.png');
        if (process.env.NODE_ENV === 'production') {
            logoPath = path.join(__dirname, '../dist/LOGOS/LogoPrincipal.png');
        }

        const attachments = [];
        if (fs.existsSync(logoPath)) {
            attachments.push({ filename: 'logo.png', path: logoPath, cid: 'logo' });
        }

        await transporter.sendMail({
            from: `"DNIGen" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Redefinição de Senha - DNIGen',
            html: emailHtml,
            attachments: attachments
        });

        await createLog(adminUsername, 'RESET_PASSWORD', 'USER', id, `Disparou e-mail de redefinição para ${user.username}`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
