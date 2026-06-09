import React, { useState, useEffect } from 'react';
import { UserPlusIcon, Trash2Icon, UserIcon, ShieldIcon, LoaderIcon, PencilIcon, MailIcon, XIcon } from 'lucide-react';

interface User {
    id: number;
    username: string;
    role: 'master' | 'user';
    email: string;
    created_at: string;
}

interface Props {
    apiUrl: string;
    showNotification: (title: string, message: string, type?: 'info' | 'success' | 'error' | 'warning', onConfirm?: () => void) => void;
}

export const UsersView: React.FC<Props> = ({ apiUrl, showNotification }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isReseting, setIsReseting] = useState<{ [key: number]: boolean }>({});
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' as 'master' | 'user', email: '' });
    const [editingUserId, setEditingUserId] = useState<number | null>(null);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/users`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar usuários');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        try {
            const method = editingUserId ? 'PUT' : 'POST';
            const url = editingUserId ? `${apiUrl}/users/${editingUserId}` : `${apiUrl}/users`;
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            if (response.ok) {
                setShowForm(false);
                setEditingUserId(null);
                setNewUser({ username: '', password: '', role: 'user', email: '' });
                fetchUsers();
                showNotification(
                    'Sucesso',
                    editingUserId ? 'Dados do usuário atualizados.' : 'Usuário criado e convite enviado por e-mail.',
                    'success'
                );
            } else {
                const data = await response.json();
                setError(data.error || 'Erro ao processar usuário');
            }
        } catch (err) {
            console.error(err);
            setError('Erro de conexão');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async (id: number, username: string) => {
        if (username === 'admin') {
            showNotification('Ação Negada', 'O usuário administrador principal não pode ser excluído.', 'warning');
            return;
        }
        
        showNotification(
            'Confirmar Exclusão',
            `Deseja realmente excluir o usuário ${username}? Esta ação não pode ser desfeita.`,
            'confirm',
            async () => {
                try {
                    const response = await fetch(`${apiUrl}/users/${id}`, { method: 'DELETE' });
                    if (response.ok) {
                        setUsers(prev => prev.filter(u => u.id !== id));
                        showNotification('Sucesso', 'Usuário excluído com sucesso.', 'success');
                    }
                } catch (err) {
                    console.error(err);
                    showNotification('Erro', 'Houve um problema ao excluir o usuário.', 'error');
                }
            }
        );
    };

    const handleSendResetEmail = async (user: User) => {
        if (!user.email) {
            showNotification('E-mail Ausente', 'Este usuário não possui um endereço de e-mail cadastrado.', 'warning');
            return;
        }
        
        setIsReseting(prev => ({ ...prev, [user.id]: true }));
        try {
            const response = await fetch(`${apiUrl}/users/${user.id}/reset-password-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                showNotification(
                    'E-mail Enviado',
                    `Um link de redefinição de senha foi enviado com sucesso para ${user.username} (${user.email}).`,
                    'success'
                );
            } else {
                const data = await response.json();
                showNotification('Erro no Envio', data.error || 'Não foi possível enviar o e-mail.', 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification('Erro de Conexão', 'Não foi possível conectar ao servidor.', 'error');
        } finally {
            setIsReseting(prev => ({ ...prev, [user.id]: false }));
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Gestão de Usuários</h2>
                    <p className="text-zinc-500 font-medium mt-1">Cadastre e gerencie os acessos ao sistema.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingUserId(null);
                        setNewUser({ username: '', password: '', role: 'user', email: '' });
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3.5 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
                >
                    <UserPlusIcon className="w-4 h-4" />
                    Novo Usuário
                </button>
            </div>

            {/* Modal de Cadastro */}
            {showForm && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <header className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">
                                    {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
                                </h3>
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">Acesso ao sistema</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors">
                                <XIcon className="w-5 h-5 text-zinc-400" />
                            </button>
                        </header>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Usuário</label>
                                    <input
                                        required
                                        type="text"
                                        value={newUser.username}
                                        onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm font-medium"
                                        placeholder="Nome de identificação"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                                    <input
                                        required
                                        type="email"
                                        value={newUser.email}
                                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm font-medium"
                                        placeholder="usuario@ctdi.com"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Acesso</label>
                                        <select
                                            value={newUser.role}
                                            onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                                            className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm font-medium appearance-none"
                                        >
                                            <option value="user">Comum</option>
                                            <option value="master">Admin</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-[9px] font-black uppercase text-center bg-red-50 py-1.5 rounded-lg">{error}</p>}

                            <button
                                disabled={isSaving}
                                type="submit"
                                className="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg mt-2"
                            >
                                {isSaving ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <ShieldIcon className="w-4 h-4" />}
                                {editingUserId ? 'Salvar' : 'Criar e Enviar Convite'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-2xl shadow-zinc-200/50 overflow-hidden">
                {isLoading ? (
                    <div className="py-32 flex flex-col items-center gap-4">
                        <LoaderIcon className="w-8 h-8 animate-spin text-zinc-300" />
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Carregando usuários...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/80 border-b border-zinc-100">
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Identificador</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">E-mail</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Nível</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Criado em</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-zinc-50/50 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                                                    <UserIcon className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-zinc-900">{user.username}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-semibold text-zinc-500">{user.email || '—'}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${user.role === 'master' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                                                <ShieldIcon className="w-3 h-3" />
                                                {user.role === 'master' ? 'Master' : 'Comum'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-semibold text-zinc-500">
                                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleSendResetEmail(user)}
                                                    disabled={isReseting[user.id]}
                                                    className="p-3 bg-white hover:bg-[#0078d4] text-[#0078d4] hover:text-white rounded-xl shadow-sm border border-zinc-100 transition-all disabled:opacity-50"
                                                    title="Enviar e-mail de redefinição"
                                                >
                                                    {isReseting[user.id] ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <MailIcon className="w-5 h-5" />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingUserId(user.id);
                                                        setNewUser({ username: user.username, password: '', role: user.role, email: user.email });
                                                        setShowForm(true);
                                                    }}
                                                    className="p-3 bg-white hover:bg-zinc-950 text-zinc-400 hover:text-white rounded-xl shadow-sm border border-zinc-100 transition-all"
                                                    title="Editar Usuário"
                                                >
                                                    <PencilIcon className="w-5 h-5" />
                                                </button>
                                                {user.username !== 'admin' && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                                        className="p-3 bg-white hover:bg-red-500 text-zinc-400 hover:text-white rounded-xl shadow-sm border border-zinc-100 transition-all"
                                                        title="Excluir Usuário"
                                                    >
                                                        <Trash2Icon className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
