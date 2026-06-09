import React from 'react';
import { XIcon, CheckCircle2Icon, AlertTriangleIcon, AlertCircleIcon, InfoIcon, HelpCircleIcon } from 'lucide-react';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    type: NotificationType;
    onConfirm?: () => void;
    onClose: () => void;
}

export const NotificationModal: React.FC<Props> = ({ isOpen, title, message, type, onConfirm, onClose }) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle2Icon className="w-8 h-8 text-emerald-500" />;
            case 'warning': return <AlertTriangleIcon className="w-8 h-8 text-amber-500" />;
            case 'error': return <AlertCircleIcon className="w-8 h-8 text-red-500" />;
            case 'confirm': return <HelpCircleIcon className="w-8 h-8 text-blue-500" />;
            default: return <InfoIcon className="w-8 h-8 text-blue-500" />;
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'success': return 'bg-emerald-50';
            case 'warning': return 'bg-amber-50';
            case 'error': return 'bg-red-50';
            case 'confirm': return 'bg-blue-50';
            default: return 'bg-blue-50';
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 flex flex-col items-center text-center">
                    <div className={`w-16 h-16 ${getBgColor()} rounded-full flex items-center justify-center mb-6`}>
                        {getIcon()}
                    </div>

                    <h3 className="text-xl font-black text-zinc-900 tracking-tight mb-2">{title}</h3>
                    <p className="text-sm font-medium text-zinc-500 leading-relaxed whitespace-pre-wrap">{message}</p>
                </div>

                <div className="p-8 border-t border-zinc-50 bg-zinc-50/30 flex gap-3">
                    {type === 'confirm' ? (
                        <>
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Não, Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm?.();
                                    onClose();
                                }}
                                className="flex-1 py-4 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20"
                            >
                                Sim, Confirmar
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20"
                        >
                            Entendido
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
