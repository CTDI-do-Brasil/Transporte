
import React, { useState } from 'react';
import { Declaration } from '../types';
import { SearchIcon, EyeIcon, Trash2Icon, FilterIcon, CalendarIcon, CheckCircle2Icon, AlertCircleIcon } from 'lucide-react';

interface Props {
  history: Declaration[];
  onSelect: (d: Declaration) => void;
  onDelete: (id: string) => void;
  userRole: 'master' | 'user' | null;
}

export const ConsultationView: React.FC<Props> = ({ history, onSelect, onDelete, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = history.filter(d =>
    d.number.includes(searchTerm) ||
    (d.requestNumber && d.requestNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    d.sender.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.carrier.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Base de Dados</h2>
          <p className="text-zinc-500 font-medium mt-1">Gerenciamento centralizado de documentos e assinaturas.</p>
        </div>
        <div className="relative w-full md:w-[400px]">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por Nº, RITM ou Nome..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-zinc-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#0078d4]/10 focus:border-[#0078d4] outline-none transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-xl shadow-zinc-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Solicitação / Nº</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Data de Coleta</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Envolvidos</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center text-zinc-400">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-zinc-50 rounded-full border border-zinc-100">
                        <SearchIcon className="w-10 h-10 opacity-20" />
                      </div>
                      <p className="font-bold uppercase tracking-widest text-[11px]">Nenhum registro encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(d => (
                  <tr key={d.id} className="hover:bg-zinc-50 transition-all group">
                    <td className="px-8 py-6">
                       <div className="text-[10px] font-black text-[#0078d4] uppercase tracking-widest mb-1">{d.requestNumber || 'S/ RITM'}</div>
                       <div className="font-mono font-black text-zinc-900 text-lg">#{d.number}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600">
                        <CalendarIcon className="w-4 h-4 opacity-40 text-[#0078d4]" />
                        {d.carrier.collectionDate ? new Date(d.carrier.collectionDate).toLocaleDateString('pt-BR') : '--/--/--'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-zinc-900 max-w-[250px] truncate">{d.sender.name}</div>
                      {d.employeeEmail && (
                        <div className="text-[10px] text-[#0078d4] font-bold truncate lowercase mt-0.5">{d.employeeEmail}</div>
                      )}
                      <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-tight mt-1 flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
                         {d.carrier.companyName}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3 transition-all">
                        <button
                          onClick={() => onSelect(d)}
                          className="p-3 bg-white hover:bg-zinc-950 text-[#0078d4] hover:text-white rounded-xl shadow-sm border border-zinc-200 transition-all font-bold text-xs"
                          title="Visualizar"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        {userRole === 'master' && (
                          <button
                            onClick={() => onDelete(d.id)}
                            className="p-3 bg-white hover:bg-red-500 text-zinc-400 hover:text-white rounded-xl shadow-sm border border-zinc-200 transition-all"
                            title="Excluir"
                          >
                            <Trash2Icon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SignatureBadge: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
    {active ? <CheckCircle2Icon className="w-3.5 h-3.5" /> : <AlertCircleIcon className="w-3.5 h-3.5 opacity-40" />}
    {label}
  </div>
);
