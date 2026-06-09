
import React, { useRef, useState, useEffect } from 'react';
import { XIcon, Trash2Icon, CheckIcon, SmartphoneIcon, ShieldCheckIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (base64: string) => void;
  declarationId?: string;
  type?: 'sender' | 'carrier' | null;
  isStandalone?: boolean;
}

export const SignatureModal: React.FC<Props> = ({ isOpen, onClose, onSave, declarationId, type, isStandalone = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current && isStandalone) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e3a8a'; // Midnight Blue
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      
      const resize = () => {
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
          if (ctx) {
            ctx.strokeStyle = '#1e3a8a';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
          }
        }
      };
      
      resize();
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }
  }, [isOpen, isStandalone]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
    ctx?.moveTo(x, y);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.lineTo(x, y);
    ctx?.stroke();
    if (e.cancelable) e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform antes de limpar
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHasSignature(false);
    }
  };

  const save = () => {
    if (canvasRef.current && hasSignature) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  const signatureUrl = `${window.location.origin}${window.location.pathname}#/sign/${declarationId}/${type}`;
  const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=500x500&chl=${encodeURIComponent(signatureUrl)}`;

  if (isStandalone) {
    return (
      <div className="flex flex-col h-full w-full max-w-lg mx-auto px-2">
         <div className="flex-1 bg-white rounded-[2rem] border-2 border-zinc-200 shadow-xl relative overflow-hidden touch-none flex flex-col">
            <div className="flex-1 relative">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="signature-canvas w-full h-full"
              />
              <div className="absolute bottom-16 left-8 right-8 h-[1px] bg-zinc-200 pointer-events-none"></div>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none text-zinc-300 font-bold text-[10px] uppercase tracking-widest">
                Assine sobre a linha
              </div>
            </div>
         </div>
         
         <div className="grid grid-cols-2 gap-3 mt-6">
            <button type="button" onClick={clear} className="flex items-center justify-center gap-2 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all">
              <Trash2Icon className="w-4 h-4" /> Limpar
            </button>
            <button 
              type="button"
              disabled={!hasSignature}
              onClick={save} 
              className="flex items-center justify-center gap-2 py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest disabled:opacity-30 shadow-lg shadow-zinc-900/20 active:scale-95 transition-all"
            >
              <CheckIcon className="w-4 h-4" /> Finalizar
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-zinc-100">
        <div className="p-8 text-center">
          <div className="flex justify-between items-center mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <SmartphoneIcon className="w-5 h-5" />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 text-zinc-400 rounded-full transition-all">
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-xl font-black text-zinc-900 tracking-tight mb-1">Aproxime o Celular</h2>
          <p className="text-zinc-500 text-xs font-medium mb-8">
            Escanear para assinar como <span className="text-zinc-900 font-bold">{type === 'sender' ? 'Remetente' : 'Motorista'}</span>
          </p>

          <div className="relative inline-block mb-8">
            <div className="absolute -inset-4 bg-zinc-100 rounded-[2rem] -z-10"></div>
            <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-zinc-50">
              <img 
                src={qrCodeUrl} 
                alt="QR Code Assinatura" 
                className="w-48 h-48 md:w-56 md:h-56 object-contain"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-zinc-50 rounded-2xl">
             <ShieldCheckIcon className="w-4 h-4 text-green-500" /> 
             <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-500">Conexão Segura e Criptografada</span>
          </div>
        </div>
      </div>
    </div>
  );
};
