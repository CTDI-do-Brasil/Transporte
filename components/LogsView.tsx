import React, { useState, useEffect } from 'react';
import { ShieldIcon, SearchIcon, CalendarIcon, LoaderIcon, ActivityIcon, UserIcon, FileTextIcon } from 'lucide-react';

interface AuditLog {
    id: number;
    username: string;
    action: string;
    entity: string;
    entity_id: string;
    details: string;
    created_at: string;
}

interface Props {
    apiUrl: string;
}

export const LogsView: React.FC<Props> = ({ apiUrl }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/logs`);
            if (response.ok) {
                const data = await response.json();
                setLogs(data);
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar logs de auditoria');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
                        <ActivityIcon className="w-8 h-8 text-zinc-950" />
                        Logs do Sistema
                    </h2>
                    <p className="text-zinc-500 font-medium mt-1">Monitore todas as ações realizadas na plataforma.</p>
                </div>
                <div className="relative w-full md:w-[400px]">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Filtrar por usuário ou ação..."
                        className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-zinc-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-zinc-900 outline-none transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-2xl shadow-zinc-200/50 overflow-hidden">
                {isLoading ? (
                    <div className="py-32 flex flex-col items-center gap-4">
                        <LoaderIcon className="w-8 h-8 animate-spin text-zinc-300" />
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Consultando histórico...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/80 border-b border-zinc-100">
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Data / Hora</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Usuário</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Ação</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Entidade</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-16 text-center text-zinc-400 font-bold uppercase text-[10px] tracking-widest">
                                            Nenhum log encontrado
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-zinc-50/50 transition-all group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
                                                    <CalendarIcon className="w-3.5 h-3.5 opacity-40" />
                                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
                                                        <UserIcon className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-black text-zinc-800 text-sm">{log.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`inline-flex px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${log.action.includes('DELETE') ? 'bg-red-50 text-red-600' :
                                                        log.action.includes('CREATE') ? 'bg-green-50 text-green-600' :
                                                            'bg-zinc-100 text-zinc-900'
                                                    }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 tracking-tighter">
                                                    <FileTextIcon className="w-3 h-3 opacity-30" />
                                                    {log.entity}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="text-zinc-600 text-sm font-medium italic truncate max-w-[300px]" title={log.details}>
                                                    "{log.details}"
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
