
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PrinterIcon,
  TrashIcon,
  HistoryIcon,
  FileTextIcon,
  DownloadIcon,
  SearchIcon,
  QrCodeIcon,
  CheckCircle2Icon,
  MenuIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LogOutIcon,
  MailIcon,
  LockIcon,
  UserIcon,
  ArrowRightIcon,
  SaveIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldIcon,
  ActivityIcon,
  EditIcon,
  ShieldCheckIcon,
  UsersIcon,
  Edit2Icon
} from 'lucide-react';
import { Declaration, Equipment, SenderData, CarrierData, RecipientData } from './types';
import { DeclarationPreview } from './components/DeclarationPreview';
import { DeclarationForm } from './components/DeclarationForm';
import { ConsultationView } from './components/ConsultationView';
import { SignatureModal } from './components/SignatureModal';
import { UsersView } from './components/UsersView';
import { NotificationModal, NotificationType } from './components/NotificationModal';
import { LogsView } from './components/LogsView';
import { SmartImportModal } from './components/SmartImportModal';

const INITIAL_SENDER: SenderData = {
  name: '',
  cpf: '',
  cnpj: '',
  address: '',
  number: '',
  bairro: '',
  city: '',
  state: '',
  zipCode: '',
  contact: '',
  phone: '',
  companyName: '',
};

const INITIAL_RECIPIENT: RecipientData = {
  name: 'CTDI do Brasil LTDA',
  address: 'Av Comendador Aladino Selmi, 4630 - GR2 Campinas - Mod. 18 a 21, Vila San Martin',
  cityState: 'Campinas - SP',
  zipCode: '13069-096',
  cnpj: '01.812.661/0001-84',
  ie: '244.698.974.115',
};

const INITIAL_CARRIER: CarrierData = {
  driverName: '',
  rg: '',
  collectionDate: '',
  companyName: 'Wikilog',
};

const INITIAL_EQUIPMENT: Equipment[] = [
  { description: '', model: '', serialNumber: '', unitValue: 0 }
];

type ViewState = 'edit' | 'preview' | 'consultation' | 'signature-mode' | 'users' | 'logs' | 'forgot-password' | 'reset-password';

const API_URL = window.location.origin.includes('localhost') ? 'http://localhost:3000/api' : '/api';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'master' | 'user' | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [history, setHistory] = useState<Declaration[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number>(21525);
  const [activeDeclaration, setActiveDeclaration] = useState<Declaration | null>(null);
  const [view, setView] = useState<ViewState>('edit');
  const [sigModal, setSigModal] = useState<{ open: boolean; type: 'sender' | 'carrier' | null }>({ open: false, type: null });
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState({ pass: '', confirm: '' });

  // Notification Modal State
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: NotificationType;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const handleUpdate = (updatedData: Partial<Declaration>) => {
    const current = activeDeclaration || {
      id: '',
      number: '',
      date: '',
      city: '',
      sender: INITIAL_SENDER,
      recipient: INITIAL_RECIPIENT,
      carrier: INITIAL_CARRIER,
      equipment: INITIAL_EQUIPMENT,
      requestNumber: ''
    };

    const nextState = { ...current };

    if (updatedData.sender) nextState.sender = { ...current.sender, ...updatedData.sender };
    if (updatedData.recipient) nextState.recipient = { ...current.recipient, ...updatedData.recipient };
    if (updatedData.carrier) nextState.carrier = { ...current.carrier, ...updatedData.carrier };
    if (updatedData.equipment) nextState.equipment = updatedData.equipment;
    
    Object.keys(updatedData).forEach(key => {
        if (!['sender', 'recipient', 'carrier', 'equipment'].includes(key)) {
            (nextState as any)[key] = (updatedData as any)[key];
        }
    });

    setActiveDeclaration(nextState);
  };

  const showNotification = (title: string, message: string, type: NotificationType = 'info', onConfirm?: () => void) => {
    setNotification({ isOpen: true, title, message, type, onConfirm });
  };

  const generateFilename = (decl: Declaration) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const d = new Date();
    const day = d.getDate().toString().padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear().toString().slice(-2);
    const dateStr = `${day}${month}${year}`;
    
    const ritm = decl.requestNumber || 'RITM0000000';
    const num = decl.number;
    const company = decl.sender.companyName || 'GE Vernova';
    
    return `SR - ${ritm} - DNI ${num} – ${company} - Reversa – ${dateStr}.pdf`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('declaration-content');
    if (!element || !activeDeclaration) return;

    const opt = {
      margin: 0,
      filename: generateFilename(activeDeclaration),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).save();
  };

  const handleSaveManual = async () => {
    if (!activeDeclaration) return;

    try {
      const response = await fetch(`${API_URL}/declarations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-username': currentUsername || 'admin'
        },
        body: JSON.stringify(activeDeclaration)
      });

      if (response.ok) {
        showNotification('Sucesso', 'Declaração salva com sucesso no histórico.', 'success');
        fetchDeclarations();
      } else {
        showNotification('Erro', 'Houve um problema ao salvar a declaração.', 'error');
      }
    } catch (error) {
      console.error('Error saving manual:', error);
      showNotification('Erro de Conexão', 'Não foi possível conectar ao servidor.', 'error');
    }
  };

  const fetchDeclarations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/declarations`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
        if (data.length > 0) {
          const numbers = data.map((d: any) => parseInt(d.number, 10)).filter((n: any) => !isNaN(n));
          if (numbers.length > 0) {
            const lastNum = Math.max(...numbers);
            setCurrentNumber(lastNum);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching declarations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const auth = sessionStorage.getItem('is_authenticated');
    const role = sessionStorage.getItem('user_role') as 'master' | 'user' | null;
    const username = sessionStorage.getItem('username');

    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchDeclarations();
      if (username) setCurrentUsername(username);

      if (role) {
        setUserRole(role);
      } else if (username) {
        fetch(`${API_URL}/user-role/${username}`)
          .then(res => res.json())
          .then(data => {
            if (data.role) {
              setUserRole(data.role);
              sessionStorage.setItem('user_role', data.role);
            }
          })
          .catch(err => console.error('Error recovering role:', err));
      }
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const viewParam = params.get('view');

    if (token && viewParam === 'reset-password') {
      setResetToken(token);
      setView('reset-password');
      // Clean URL without refresh
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/sign/')) {
        const parts = hash.split('/');
        const id = parts[2];
        const type = parts[3] as 'sender' | 'carrier';
        const found = history.find(h => h.id === id);
        if (found) {
          setActiveDeclaration(found);
          setSigModal({ open: true, type });
          setView('signature-mode');
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [history]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      if (response.ok) {
        showNotification('Sucesso', 'E-mail de redefinição enviado com sucesso!', 'success');
        setView('edit'); // Back to login view (which is default)
      } else {
        const data = await response.json();
        showNotification('Erro', data.error || 'Falha ao enviar e-mail.', 'error');
      }
    } catch (err) {
      showNotification('Erro', 'Erro ao conectar ao servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.pass !== newPassword.confirm) {
      showNotification('Erro', 'As senhas não coincidem.', 'error');
      return;
    }
    if (newPassword.pass.length < 6) {
      showNotification('Erro', 'A senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: newPassword.pass })
      });
      if (response.ok) {
        showNotification('Sucesso', 'Senha redefinida com sucesso!', 'success');
        setResetToken(null);
        setNewPassword({ pass: '', confirm: '' });
        setView('edit');
      } else {
        const data = await response.json();
        showNotification('Erro', data.error || 'Token inválido ou expirado.', 'error');
      }
    } catch (err) {
      showNotification('Erro', 'Erro ao conectar ao servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUserRole(data.role);
        setCurrentUsername(data.username);
        sessionStorage.setItem('is_authenticated', 'true');
        sessionStorage.setItem('user_role', data.role);
        sessionStorage.setItem('username', data.username);
        fetchDeclarations();
        setView('edit');
        setActiveDeclaration(null);
      } else {
        const errorData = await response.json();
        setLoginError(errorData.error || 'Credenciais inválidas. Tente novamente.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUsername(null);
    setLoginForm({ username: '', password: '' });
    sessionStorage.removeItem('is_authenticated');
    sessionStorage.removeItem('user_role');
    sessionStorage.removeItem('username');
    window.location.hash = '';
  };

  const deleteFromHistory = async (id: string) => {
    showNotification(
      'Confirmar Exclusão',
      'Deseja realmente excluir este registro permanentemente?',
      'confirm',
      async () => {
        try {
          const response = await fetch(`${API_URL}/declarations/${id}`, { method: 'DELETE' });
          if (response.ok) {
            setHistory(prev => prev.filter(h => h.id !== id));
            showNotification('Sucesso', 'Declaração excluída com sucesso.', 'success');
            if (activeDeclaration?.id === id) {
              setActiveDeclaration(null);
              setView('edit');
            }
          }
        } catch (error) {
          console.error('Error deleting declaration:', error);
          showNotification('Erro', 'Não foi possível excluir a declaração.', 'error');
        }
      }
    );
  };

  const saveSignature = async (base64: string) => {
    if (!activeDeclaration || !sigModal.type) return;

    const field = sigModal.type === 'sender' ? 'signatureSender' : 'signatureCarrier';
    const updatedDecl = {
      ...activeDeclaration,
      [field]: base64
    };

    try {
      const response = await fetch(`${API_URL}/declarations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-username': currentUsername || 'admin'
        },
        body: JSON.stringify(updatedDecl)
      });

      if (response.ok) {
        setHistory(prev => prev.map(h => h.id === activeDeclaration.id ? updatedDecl : h));
        setActiveDeclaration(updatedDecl);
        setSigModal({ open: false, type: null });

        if (view === 'signature-mode') {
          setView('preview');
          window.location.hash = '';
        }
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Erro ao salvar assinatura');
    }
  };

  const handleGenerate = async (data: Partial<Declaration>) => {
    const nextNum = currentNumber + 1;
    const formattedNum = nextNum.toString().padStart(8, '0');

    const newDeclHost: Declaration = {
      id: crypto.randomUUID(),
      number: formattedNum,
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase(),
      city: 'CAMPINAS',
      recipient: data.recipient || INITIAL_RECIPIENT,
      equipment: data.equipment || INITIAL_EQUIPMENT,
      sender: data.sender || INITIAL_SENDER,
      carrier: data.carrier || INITIAL_CARRIER,
      requestNumber: data.requestNumber,
      shipToAddressTo: data.shipToAddressTo,
      employeeEmail: data.employeeEmail,
      deliveryDate: data.deliveryDate,
      requestType: data.requestType,
      priority: data.priority,
      legalHold: data.legalHold
    };

    setIsLoading(true);
    try {
      setActiveDeclaration(newDeclHost);
      setView('preview');

      setTimeout(async () => {
        const element = document.getElementById('declaration-content');
        let pdfBase64 = null;

        if (element) {
          const opt = {
            margin: 0,
            filename: generateFilename(newDeclHost),
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          try {
            // @ts-ignore
            pdfBase64 = await html2pdf().set(opt).from(element).output('datauristring');
          } catch (pdfErr) {
            console.error('Error generating PDF for email:', pdfErr);
          }
        }

        const response = await fetch(`${API_URL}/declarations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-username': currentUsername || 'admin'
          },
          body: JSON.stringify({ ...newDeclHost, pdfBase64 })
        });

        if (response.ok) {
          setHistory([newDeclHost, ...history]);
          setCurrentNumber(nextNum);
          showNotification('Sucesso', 'Documento gerado, salvo e enviado por e-mail com sucesso!', 'success');
        } else {
          showNotification('Atenção', 'Documento gerado, mas houve um erro ao enviar para o servidor.', 'error');
        }
        setIsLoading(false);
      }, 1000);

    } catch (error) {
      console.error('Error saving declaration:', error);
      showNotification('Erro', 'Houve um problema ao gerar o documento.', 'error');
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!activeDeclaration) return;

    setIsLoading(true);
    const element = document.getElementById('declaration-content');
    let pdfBase64 = null;

    if (element) {
      const opt = {
        margin: 0,
        filename: generateFilename(activeDeclaration),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      try {
        // @ts-ignore
        pdfBase64 = await html2pdf().set(opt).from(element).output('datauristring');
      } catch (pdfErr) {
        console.error('Error generating PDF for resend:', pdfErr);
      }
    }

    try {
      const response = await fetch(`${API_URL}/declarations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-username': currentUsername || 'admin'
        },
        body: JSON.stringify({ ...activeDeclaration, pdfBase64 })
      });

      if (response.ok) {
        showNotification('Sucesso', 'E-mail reenviado com sucesso!', 'success');
      } else {
        showNotification('Erro', 'Falha ao reenviar e-mail.', 'error');
      }
    } catch (error) {
      console.error('Error resending email:', error);
      showNotification('Erro', 'Houve um problema ao reenviar o documento.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setView('edit');
  };

  return (
    <>
      {!isAuthenticated ? (
        <div className="h-screen flex items-center justify-center bg-zinc-100 p-6">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className={`bg-white border border-zinc-200 rounded-[2.5rem] ${view === 'reset-password' ? 'p-6' : 'p-10'} shadow-2xl relative overflow-hidden group`}>
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-zinc-100 rounded-full blur-3xl group-hover:bg-zinc-200 transition-colors"></div>

              <header className="mb-10 text-center flex flex-col items-center">
                 <img src="/LOGOS/LogoPrincipal.png" alt="DNIGen" className="h-24 w-auto mb-4" />
              </header>

              {view === 'forgot-password' ? (
                <form className="space-y-6 relative" onSubmit={handleForgotPassword}>
                  <div className="space-y-4 text-center mb-6">
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Recuperar Senha</h3>
                    <p className="text-[11px] text-zinc-500 font-medium">Insira seu e-mail cadastrado para receber o link de redefinição.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">E-mail</label>
                    <div className="relative">
                      <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 text-sm outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all font-medium"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Enviando...' : 'Enviar Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('edit')}
                    className="w-full text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors"
                  >
                    Voltar para Login
                  </button>
                </form>
              ) : view === 'reset-password' ? (
                <form className="space-y-4 relative" onSubmit={handleResetPassword}>
                  <div className="space-y-1 text-center mb-4">
                    <p className="text-[11px] text-zinc-500 font-medium tracking-tight">Crie sua nova senha de acesso abaixo:</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nova Senha</label>
                    <div className="relative">
                      <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type={showNewPass ? "text" : "password"}
                        required
                        value={newPassword.pass}
                        onChange={(e) => setNewPassword({ ...newPassword, pass: e.target.value })}
                        className="w-full pl-11 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 text-sm outline-none focus:ring-1 focus:ring-zinc-400 transition-all font-medium"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {showNewPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Confirmar</label>
                    <div className="relative">
                      <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type={showConfirmPass ? "text" : "password"}
                        required
                        value={newPassword.confirm}
                        onChange={(e) => setNewPassword({ ...newPassword, confirm: e.target.value })}
                        className="w-full pl-11 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 text-sm outline-none focus:ring-1 focus:ring-zinc-400 transition-all font-medium"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {showConfirmPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 mt-2"
                  >
                    {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                  </button>
                </form>
              ) : (
                <form className="space-y-6 relative" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Usuário ou E-mail</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        required
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                        className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 text-sm outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all font-medium"
                        placeholder="Username ou E-mail"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Senha</label>
                    <div className="relative">
                      <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="w-full pl-12 pr-12 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 text-sm outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all font-medium"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex justify-end px-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setView('forgot-password')}
                        className="text-[9px] font-black text-[#0078d4] uppercase tracking-widest hover:underline"
                      >
                        Esqueci a senha
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <p className="text-red-500 text-[10px] font-black uppercase tracking-tight text-center bg-red-50 py-2 rounded-lg border border-red-100">
                      {loginError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full group flex items-center justify-center gap-3 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-zinc-900/10 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              )}

              <div className="mt-6" />
            </div>
          </div>
        </div>
      ) : (
        <div className="h-screen flex flex-col bg-zinc-50 overflow-hidden font-['Segoe_UI']">
          {/* Header Minimalista */}
          <header className="no-print h-20 bg-white border-b border-zinc-200 flex items-center justify-between px-8 z-50 shrink-0 shadow-sm">
            <div className="flex items-center">
               <img src="/LOGOS/LogoPrincipal.png" alt="DNIGen" className="h-14 w-auto" />
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group"
              title="Sair"
            >
              <LogOutIcon className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 flex overflow-hidden relative">
            {/* Sidebar acinzentado e retrátil (Mini-sidebar quando recolhido) */}
            <aside
              className={`no-print bg-zinc-100 h-full transition-all duration-300 flex flex-col z-40 border-r border-zinc-200 shrink-0 overflow-hidden relative ${isMenuCollapsed ? 'w-20' : 'w-72'}`}
            >
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <SidebarItem
                  icon={<PlusIcon className="w-5 h-5" />}
                  label="Nova Declaração"
                  active={view === 'edit'}
                  collapsed={isMenuCollapsed}
                  onClick={() => { setView('edit'); setActiveDeclaration(null); }}
                />
                <SidebarItem
                  icon={<SearchIcon className="w-5 h-5" />}
                  label="Gerados"
                  active={view === 'consultation'}
                  collapsed={isMenuCollapsed}
                  onClick={() => setView('consultation')}
                />
                {userRole === 'master' && (
                  <>
                    <div className={`pt-6 pb-2 px-4 transition-opacity duration-300 ${isMenuCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Administração</span>
                    </div>
                    <SidebarItem
                      icon={<UserIcon className="w-5 h-5" />}
                      label="Controle de Usuários"
                      active={view === 'users'}
                      collapsed={isMenuCollapsed}
                      onClick={() => setView('users')}
                    />
                    <SidebarItem
                      icon={<ShieldIcon className="w-5 h-5" />}
                      label="Logs de Auditoria"
                      active={view === 'logs'}
                      collapsed={isMenuCollapsed}
                      onClick={() => setView('logs')}
                    />
                  </>
                )}
              </nav>

              {/* Informações do Usuário no rodapé do Sidebar */}
              <div className="p-4 border-t border-zinc-200 bg-zinc-200/20">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-zinc-300 flex items-center justify-center text-zinc-600 shadow-inner overflow-hidden border border-zinc-100">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  {!isMenuCollapsed && (
                    <div className="flex flex-col text-left overflow-hidden animate-in fade-in duration-500">
                      <span className="text-[11px] font-black text-zinc-900 tracking-widest uppercase truncate">{currentUsername}</span>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Marcador de Seta (Bolinha flutuante) */}
            <button
              onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
              className={`no-print absolute top-[24px] flex items-center justify-center w-8 h-8 bg-white border border-zinc-200 rounded-full shadow-lg z-50 transition-all duration-300 hover:scale-110 hover:bg-zinc-50 -ml-4 ${isMenuCollapsed ? 'left-20' : 'left-72'}`}
            >
              {isMenuCollapsed ? (
                <ChevronRightIcon className="w-4 h-4 text-zinc-600" />
              ) : (
                <ChevronLeftIcon className="w-4 h-4 text-zinc-600" />
              )}
            </button>

            {/* Conteúdo Principal */}
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8f9fa] p-8 pb-24 transition-all duration-300">
              <div className="max-w-[1400px] mx-auto">
                {/* Títulos de seção removidos conforme pedido */}

                {view === 'edit' ? (
                  <div className="bg-white rounded-[2.5rem] shadow-xl shadow-zinc-200/40 border border-zinc-200 overflow-hidden">
                    <DeclarationForm
                      sender={activeDeclaration?.sender || INITIAL_SENDER}
                      recipient={activeDeclaration?.recipient || INITIAL_RECIPIENT}
                      carrier={activeDeclaration?.carrier || INITIAL_CARRIER}
                      equipment={activeDeclaration?.equipment || INITIAL_EQUIPMENT}
                      onUpdate={handleUpdate}
                      requestNumber={activeDeclaration?.requestNumber}
                      employeeEmail={activeDeclaration?.employeeEmail}
                      onGenerate={() => handleGenerate(activeDeclaration!)}
                      showNotification={showNotification}
                      onOpenSmartImport={() => setIsSmartModalOpen(true)}
                    />
                  </div>
                ) : view === 'consultation' ? (
                  <ConsultationView
                    history={history}
                    onSelect={(d) => { setActiveDeclaration(d); setView('preview'); }}
                    onDelete={deleteFromHistory}
                    userRole={userRole}
                  />
                ) : view === 'users' ? (
                  <UsersView apiUrl={API_URL} showNotification={showNotification} />
                ) : view === 'logs' ? (
                  <LogsView apiUrl={API_URL} />
                ) : (view === 'preview' || view === 'signature-mode') && activeDeclaration ? (
                  <div className="max-w-[21cm] mx-auto relative group">
                    <div id="declaration-content" className="bg-white shadow-2xl border border-zinc-100 rounded-sm transform origin-top transition-transform duration-500 hover:scale-[1.01]">
                      <DeclarationPreview
                        declaration={activeDeclaration}
                      />
                    </div>

                    {/* Botões Flutuantes Premium */}
                    <div className="no-print fixed bottom-12 right-12 flex flex-col gap-4 z-50">
                      {userRole === 'master' && (
                        <ActionButton
                          icon={<Edit2Icon className="w-5 h-5" />}
                          onClick={handleEdit}
                          title="Editar Dados"
                          variant="secondary"
                        />
                      )}
                      <ActionButton
                        icon={<MailIcon className="w-5 h-5" />}
                        onClick={handleResendEmail}
                        title="Reenviar E-mail"
                        variant="secondary"
                      />
                      <ActionButton
                        icon={<PrinterIcon className="w-5 h-5" />}
                        onClick={handlePrint}
                        title="Imprimir"
                        variant="secondary"
                      />
                      <ActionButton
                        icon={<DownloadIcon className="w-5 h-5" />}
                        onClick={handleDownloadPDF}
                        title="Baixar PDF"
                        variant="primary"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-300">
                    <ActivityIcon className="w-16 h-16 opacity-10 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Selecione uma ação no menu lateral</p>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>

      )}

      {sigModal.open && (
        <SignatureModal
          isOpen={sigModal.open}
          onClose={() => setSigModal({ open: false, type: null })}
          onSave={saveSignature}
          declarationId={activeDeclaration?.id}
          type={sigModal.type}
        />
      )}

      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        onConfirm={notification.onConfirm}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />

      {isSmartModalOpen && (
        <SmartImportModal
          isOpen={isSmartModalOpen}
          onClose={() => setIsSmartModalOpen(false)}
          onImport={handleUpdate}
        />
      )}
    </>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; collapsed: boolean; onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <button
    onClick={onClick}
    title={collapsed ? label : ''}
    className={`relative group w-full flex items-center transition-all ${collapsed ? 'justify-center p-3.5' : 'p-3 gap-3'} rounded-xl font-bold uppercase tracking-widest text-[10px] ${active ? 'bg-zinc-200 text-zinc-950 shadow-sm' : 'text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900'}`}
  >
    <div className={`shrink-0 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
    {!collapsed && <span className="whitespace-nowrap overflow-hidden text-left font-black transition-colors">{label}</span>}
  </button>
);

const ActionButton: React.FC<{ icon: React.ReactNode; onClick: () => void; title: string; variant: 'primary' | 'secondary' }> = ({ icon, onClick, title, variant }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-4 rounded-2xl shadow-2xl transition-all active:scale-90 flex items-center justify-center ${variant === 'primary' ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50'}`}
  >
    {icon}
  </button>
);

export default App;
