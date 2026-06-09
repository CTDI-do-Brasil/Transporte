import React, { useState } from 'react';
import { XIcon, SparklesIcon, ClipboardIcon } from 'lucide-react';
import { SenderData, CarrierData, Equipment, Declaration } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: { 
        sender?: Partial<SenderData>; 
        carrier?: Partial<CarrierData>; 
        equipment?: Equipment[];
        requestNumber?: string;
        employeeEmail?: string;
    }) => void;
}

export const SmartImportModal: React.FC<Props> = ({ isOpen, onClose, onImport }) => {
    const [text, setText] = useState('');

    if (!isOpen) return null;

    const handleProcess = (importType: 'all' | 'sender' | 'items') => {
        const sender: Partial<SenderData> = {};
        const carrier: Partial<CarrierData> = {};
        let requestNumber = '';
        const items: Equipment[] = [];

        // Build a key->value map from the raw text
        const kvMap: Record<string, string> = {};
        const lines = text.split('\n');

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            // Try tab-separated first (most common when copying from a table)
            const tabParts = line.split('\t');
            if (tabParts.length >= 2) {
                const key = tabParts[0].trim();
                const val = tabParts.slice(1).join('\t').trim();
                if (key && val) kvMap[key.toLowerCase()] = val;
                continue;
            }

            // Try colon-separated: "key: value" or "key : value"
            const colonIdx = line.indexOf(':');
            if (colonIdx > 0 && colonIdx < 40) {
                const key = line.slice(0, colonIdx).trim();
                const val = line.slice(colonIdx + 1).trim();
                if (key && val) kvMap[key.toLowerCase()] = val;
                continue;
            }

            // Try multiple consecutive spaces: "key   value"
            const spaceParts = line.split(/\s{2,}/);
            if (spaceParts.length >= 2) {
                const key = spaceParts[0].trim();
                const val = spaceParts.slice(1).join(' ').trim();
                if (key && val) kvMap[key.toLowerCase()] = val;
            }
        }

        // Helper to get value
        const get = (...keys: string[]): string => {
            for (const key of keys) {
                const val = kvMap[key.toLowerCase()];
                if (val) return val.trim();
            }
            return '';
        };

        // Fallback scanner
        const scan = (pattern: RegExp): string => {
            const m = text.match(pattern);
            return m ? m[1].trim() : '';
        };

        // ---- Mappings ----
        const careOf = get('shipToCareOf', 'Nome:') || scan(/shipToCareOf\s+(.+)/i);
        if (careOf) { sender.name = careOf; sender.contact = careOf; }

        const taxNum = get('taxNumber', 'CPF:') || scan(/taxNumber\s+([\d.-]+)/i);
        if (taxNum) {
            const digits = taxNum.replace(/\D/g, '');
            sender.cpf = digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : taxNum;
        }

        const addr1 = get('shipToAddress1') || scan(/shipToAddress1\s+(.+)/i);
        const addr2 = get('shipToAddress2') || scan(/shipToAddress2\s+(.+)/i);
        if (addr1 || addr2) {
            let street = addr1;
            let number = 'S/N';

            const match = addr1.match(/(.*?)(\d+.*)$/);
            if (match) {
                street = match[1].trim();
                number = match[2].trim();
                if (street.endsWith(',')) street = street.slice(0, -1).trim();
            }

            sender.address = street;
            sender.number = number;
            sender.bairro = addr2 || 'Centro';
        }

        const city = get('shipToCity', 'Municipio:') || scan(/shipToCity\s+(.+)/i);
        if (city) sender.city = city;

        const state = get('shipToState', 'Estado:') || scan(/shipToState\s+([A-Z]{2})/i);
        if (state) sender.state = state.toUpperCase().slice(0, 2);

        const zip = get('shipToPostalCode', 'CEP:') || scan(/shipToPostalCode\s+([\d-]+)/i);
        if (zip) {
            const zipDigits = zip.replace(/\D/g, '');
            sender.zipCode = zipDigits.length === 8 ? zipDigits.replace(/(\d{5})(\d{3})/, '$1-$2') : zip;
        }

        const lobVal = get('lob') || scan(/\blob\s+(\S+)/i) || get('Razão Social da Empresa');
        if (lobVal) {
            const l = lobVal.toLowerCase().trim();
            if (l === 'gev' || l.includes('vernova')) sender.companyName = 'GE Vernova';
            else if (l === 'geh-br-le1' || l.includes('healthcare')) sender.companyName = 'GE HealthCare';
            else sender.companyName = lobVal;
        }

        const contact = get('contact', 'Contato:') || scan(/contact\s+(.+)/i);
        if (contact) sender.contact = contact;

        const reqNum = get('requestNumber') || scan(/requestNumber\s+(\S+)/i) || scan(/(RITM\d+)/i);
        if (reqNum) requestNumber = reqNum;

        const email = get('employeeEmail', 'E-mail:') || scan(/employeeEmail\s+(\S+@\S+)/i) || scan(/([\w.-]+@[\w.-]+\.\w+)/);
        const extraMetadata = {
            employeeEmail: email || undefined
        };

        const empPhone = get('employeePhone', 'Telefone/Fax:') || scan(/employeePhone\s+(\S+)/i);
        if (empPhone) {
            let processedPhone = empPhone.trim();
            
            // Handle scientific notation like 5,51197E+12 (Excel copy/paste)
            if (processedPhone.toUpperCase().includes('E+')) {
                const normalized = processedPhone.replace(',', '.');
                const num = Number(normalized);
                if (!isNaN(num)) {
                    // Convert to full string without scientific notation and without decimals
                    processedPhone = num.toLocaleString('fullwide', {useGrouping:false, maximumFractionDigits:0});
                }
            }

            const digits = processedPhone.replace(/\D/g, '');
            // Remove country code if it's 55 and it's a long number
            const finalDigits = (digits.startsWith('55') && digits.length >= 12) ? digits.substring(2) : digits;
            
            if (finalDigits.length >= 10) {
                // Formats for 11 digits (9xxxx-xxxx) or 10 digits (xxxx-xxxx)
                if (finalDigits.length === 11) {
                   sender.phone = `(${finalDigits.slice(0, 2)}) ${finalDigits.slice(2, 7)}-${finalDigits.slice(7)}`;
                } else {
                   sender.phone = `(${finalDigits.slice(0, 2)}) ${finalDigits.slice(2, 6)}-${finalDigits.slice(6)}`;
                }
            } else {
                sender.phone = processedPhone;
            }
        }

        const serialNum = get('returnSerialNumber', 'Nº de Série') || scan(/returnSerialNumber\s+(\S+)/i);
        if (serialNum) {
            items.push({
                description: '',
                model: '',
                serialNumber: serialNum,
                unitValue: 0
            });
        }

        onImport({
            sender: (importType === 'all' || importType === 'sender') && Object.keys(sender).length > 0 ? sender : undefined,
            carrier: importType === 'all' && Object.keys(carrier).length > 0 ? carrier : undefined,
            equipment: (importType === 'all' || importType === 'items') && items.length > 0 ? items : undefined,
            requestNumber: requestNumber || undefined,
            ...extraMetadata
        });

        setText('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center shadow-xl">
                            <SparklesIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-zinc-900 tracking-tight">Importação Inteligente</h3>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Cole os dados do sistema para preenchimento automático</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-zinc-100 rounded-2xl transition-all text-zinc-400">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                    <div className="bg-zinc-900/5 border border-zinc-100 p-4 rounded-2xl flex gap-4 items-start">
                        <ClipboardIcon className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight leading-relaxed">
                            Funciona com os campos shipToAddress1, taxNumber, lob, etc. Cole a tabela inteira ou o texto copiado do Paygen.
                        </p>
                    </div>

                    <textarea
                        className="w-full h-32 p-6 bg-zinc-50 border-2 border-zinc-100 rounded-3xl outline-none focus:border-zinc-900 focus:bg-white transition-all font-mono text-sm resize-none"
                        placeholder="Cole aqui os dados copiados do sistema..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="p-8 border-t border-zinc-50 bg-zinc-50/30 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-all"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={() => handleProcess('all')}
                        disabled={!text.trim()}
                        className="px-12 py-4 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-30 shadow-xl shadow-zinc-950/20"
                    >
                        Importar
                    </button>
                </div>
            </div>
        </div>
    );
};
