
import React, { useState } from 'react';
import { SenderData, CarrierData, Equipment, RecipientData } from '../types';
import {
  PlusCircle,
  Trash2,
  EraserIcon,
  SparklesIcon,
  UserIcon,
  BoxIcon,
  TruckIcon,
  MapPinIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircle2Icon
} from 'lucide-react';
import { SmartImportModal } from './SmartImportModal';
import { NotificationType } from './NotificationModal';

interface Props {
  sender: SenderData;
  recipient: RecipientData;
  carrier: CarrierData;
  equipment: Equipment[];
  requestNumber?: string;
  employeeEmail?: string;
  onUpdate: (data: Partial<{
    sender: SenderData;
    recipient: RecipientData;
    carrier: CarrierData;
    equipment: Equipment[];
    requestNumber: string;
    employeeEmail: string;
  }>) => void;
  onGenerate: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  onSaveManual?: () => void;
  showNotification: (title: string, message: string, type?: NotificationType, onConfirm?: () => void) => void;
  onOpenSmartImport: () => void;
}

export const DeclarationForm: React.FC<Props> = ({
  sender,
  recipient,
  carrier,
  equipment,
  requestNumber,
  employeeEmail,
  onUpdate,
  onGenerate,
  onPrint,
  onDownload,
  onSaveManual,
  showNotification,
  onOpenSmartImport
}) => {
  const [step, setStep] = useState(1);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);

  const formatCPF = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    return raw
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2');
  };

  const formatCEP = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 8);
    return raw.replace(/(\d{5})(\d)/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 10) {
      return raw.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return raw.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatRG = (value: string) => {
    return value.toUpperCase().replace(/[^0-9X]/g, '').slice(0, 12);
  };

  const formatCNPJ = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 14);
    return raw
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseCurrencyToNumber = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return parseFloat(cleanValue) / 100;
  };

  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          onUpdate({
            sender: {
              ...sender,
              address: data.logradouro || '',
              bairro: data.bairro || '',
              city: data.localidade,
              state: data.uf,
              zipCode: formatCEP(cleanCep)
            }
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handleRecipientCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          onUpdate({
            recipient: {
              ...recipient,
              address: data.logradouro || '',
              cityState: `${data.localidade} - ${data.uf}`,
              zipCode: formatCEP(cleanCep)
            }
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CEP Destinatário:', error);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handleCnpjSearch = async (cnpj: string, isRecipient = false) => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length === 14) {
      setIsSearchingCnpj(true);
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        const data = await response.json();
        if (!data.message) { // BrasilAPI returns 'message' on error
          onUpdate({
            sender: {
              ...sender,
              companyName: data.razao_social || data.nome_fantasia || sender.companyName,
              address: data.logradouro || sender.address,
              number: data.numero || sender.number,
              bairro: data.bairro || sender.bairro,
              city: data.municipio || sender.city,
              state: data.uf || sender.state,
              zipCode: formatCEP(data.cep || sender.zipCode),
              phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone_1}` : sender.phone
            }
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CNPJ:', error);
      } finally {
        setIsSearchingCnpj(false);
      }
    }
  };

  const handleSmartImport = (data: { 
    sender?: Partial<SenderData>; 
    carrier?: Partial<CarrierData>; 
    equipment?: Equipment[];
    requestNumber?: string;
  }) => {
    onUpdate(data as any);
  };

  const handleAddEquipment = () => {
    onUpdate({ equipment: [...equipment, { description: '', model: '', serialNumber: '', unitValue: 0 }] });
  };

  const handleRemoveEquipment = (index: number) => {
    onUpdate({ equipment: equipment.filter((_, i) => i !== index) });
  };

  const handleEquipmentChange = (index: number, field: keyof Equipment, value: any) => {
    const updated = [...equipment];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate({ equipment: updated });
  };

  const isStep1Valid = () => {
    const isGEHealthCare = sender.companyName?.trim() === 'GE HealthCare';
    const hasCpfOrCnpj = (sender.cpf && sender.cpf.replace(/\D/g, '').length === 11) ||
      (sender.cnpj && sender.cnpj.replace(/\D/g, '').length === 14);

    return (
      requestNumber && requestNumber.trim().length > 5 &&
      employeeEmail && employeeEmail.trim().length > 5 &&
      sender.name.trim().length > 3 &&
      (isGEHealthCare || hasCpfOrCnpj) &&
      sender.address.trim().length > 5 &&
      sender.number.trim().length > 0 &&
      sender.bairro.trim().length > 2 &&
      sender.city.trim().length > 2 &&
      sender.state.trim().length === 2 &&
      sender.zipCode.replace(/\D/g, '').length === 8 &&
      sender.phone.replace(/\D/g, '').length >= 10
    );
  };

  const isStep2Valid = () => {
    return equipment.length > 0 && equipment.every(item =>
      item.description.trim().length > 2 &&
      item.serialNumber.trim().length > 0 &&
      item.unitValue > 0
    );
  };

  const isStep3Valid = () => {
    return true;
  };

  const isStep4Valid = () => {
    return (
      recipient.name.trim().length > 3 &&
      recipient.address.trim().length > 5 &&
      recipient.cnpj.replace(/\D/g, '').length === 14
    );
  };

  const canNavigateTo = (targetStep: number) => {
    if (targetStep <= step) return true;
    if (targetStep === 2) return isStep1Valid();
    if (targetStep === 3) return isStep1Valid() && isStep2Valid();
    if (targetStep === 4) return isStep1Valid() && isStep2Valid() && isStep3Valid();
    return false;
  };

  const handleClear = () => {
    showNotification(
      'Limpar Formulário',
      'Tem certeza que deseja apagar todos os dados inseridos neste formulário?',
      'confirm',
      () => {
        onUpdate({
          sender: {
            name: '', cpf: '', cnpj: '', address: '', number: '', bairro: '', city: '',
            state: '', zipCode: '', contact: '', phone: '', companyName: ''
          },
          carrier: { driverName: '', rg: '', collectionDate: new Date().toISOString().split('T')[0], companyName: '' },
          equipment: [{ description: '', model: '', serialNumber: '', unitValue: 0 }],
          recipient: { name: '', cnpj: '', ie: '', address: '', zipCode: '', cityState: '' }
        });
        setStep(1);
      }
    );
  };

  const steps = [
    { id: 1, name: 'Remetente', icon: <UserIcon className="w-4 h-4" /> },
    { id: 2, name: 'Itens', icon: <BoxIcon className="w-4 h-4" /> },
    { id: 3, name: 'Coleta', icon: <TruckIcon className="w-4 h-4" /> },
    { id: 4, name: 'Destinatário', icon: <MapPinIcon className="w-4 h-4" /> },
  ];

  const isCpfFilled = sender.cpf && sender.cpf.replace(/\D/g, '').length === 11;
  const isCnpjFilled = sender.cnpj && sender.cnpj.replace(/\D/g, '').length === 14;
  const isGEHealthCare = sender.companyName?.trim() === 'GE HealthCare';

  return (
    <div className="p-6 md:p-10 space-y-10">
      {/* Progress Stepper */}
      <div className="flex items-center justify-between max-w-4xl mx-auto mb-10">
        {steps.map((s, idx) => {
          const isAllowed = canNavigateTo(s.id);
          const isActive = step === s.id;
          const isCompleted = step > s.id;

          return (
            <React.Fragment key={s.id}>
              <button
                type="button"
                disabled={!isAllowed}
                onClick={() => setStep(s.id)}
                className={`flex flex-col items-center gap-2 group transition-all ${isActive ? 'opacity-100' : isAllowed ? 'opacity-70 hover:opacity-100' : 'opacity-40 cursor-not-allowed'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm border ${isActive ? 'bg-[#0078d4] text-white border-[#0078d4] scale-110 shadow-lg shadow-blue-200' : isCompleted ? 'bg-blue-50 text-[#0078d4] border-blue-100' : 'bg-white text-zinc-500 border-zinc-200'}`}>
                  {isCompleted ? <CheckCircle2Icon className="w-6 h-6" /> : s.icon}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[#0078d4]' : 'text-zinc-500'}`}>{s.name}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 rounded-full transition-colors duration-500 ${step > idx + 1 ? 'bg-[#0078d4]' : 'bg-zinc-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Form Content */}
      <div className="min-h-[400px] animate-in slide-in-from-bottom-4 duration-500">
        {step === 1 && (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1.5 bg-[#0078d4] rounded-full"></div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Remetente (Pessoa Física ou Jurídica)</h3>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={onOpenSmartImport} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white text-[#0078d4] border border-[#0078d4] hover:bg-blue-50 rounded-xl transition-all shadow-sm">
                  <SparklesIcon className="w-4 h-4" /> Importação Inteligente
                </button>
                <button type="button" onClick={handleClear} className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  <EraserIcon className="w-4 h-4" /> Limpar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FormField label="Nº Chamado (RITM) *" value={requestNumber || ''} onChange={(v) => onUpdate({ requestNumber: v })} placeholder="RITM0000000" />
              <FormField label="E-mail Solicitante *" value={employeeEmail || ''} onChange={(v) => onUpdate({ employeeEmail: v })} placeholder="usuario@ctdi.com" />
              <div className="lg:col-span-2">
                <FormField label="Nome Completo *" value={sender.name} onChange={(v) => onUpdate({ sender: { ...sender, name: v } })} />
              </div>
              <FormField
                label={`CPF ${(isCnpjFilled || isGEHealthCare) ? '' : '*'}`}
                value={sender.cpf}
                onChange={(v) => onUpdate({ sender: { ...sender, cpf: formatCPF(v) } })}
                placeholder="000.000.000-00"
              />
              <div className="relative">
                <FormField
                  label={`CNPJ ${(isCpfFilled || isGEHealthCare) ? '' : '*'}`}
                  value={sender.cnpj || ''}
                  onChange={(v) => {
                    const formatted = formatCNPJ(v);
                    onUpdate({ sender: { ...sender, cnpj: formatted } });
                    if (formatted.replace(/\D/g, '').length === 14) handleCnpjSearch(formatted);
                  }}
                  placeholder="00.000.000/0000-00"
                />
                {isSearchingCnpj && (
                  <div className="absolute right-3 top-9 text-zinc-400">
                    <div className="animate-spin w-4 h-4 border-2 border-zinc-300 border-t-[#0078d4] rounded-full" />
                  </div>
                )}
              </div>
              <FormField
                label={`Razão Social ${(isCpfFilled || isGEHealthCare) ? '' : '*'}`}
                value={sender.companyName || ''}
                onChange={(v) => onUpdate({ sender: { ...sender, companyName: v } })}
                placeholder="Nome da Empresa"
              />

              <div className="relative">
                <FormField
                  label="CEP *"
                  value={sender.zipCode}
                  onChange={(v) => {
                    const formatted = formatCEP(v);
                    onUpdate({ sender: { ...sender, zipCode: formatted } });
                    if (formatted.replace(/\D/g, '').length === 8) handleCepSearch(formatted);
                  }}
                  placeholder="00000-000"
                />
                {isSearchingCep && (
                  <div className="absolute right-3 top-9 text-zinc-400">
                    <div className="animate-spin w-4 h-4 border-2 border-zinc-300 border-t-[#0078d4] rounded-full" />
                  </div>
                )}
              </div>

              <div className="md:col-span-2 lg:col-span-2">
                <FormField label="Endereço Completo *" value={sender.address} onChange={(v) => onUpdate({ sender: { ...sender, address: v } })} />
              </div>
              <FormField label="Número *" value={sender.number} onChange={(v) => onUpdate({ sender: { ...sender, number: v } })} />

              <FormField label="Bairro *" value={sender.bairro} onChange={(v) => onUpdate({ sender: { ...sender, bairro: v } })} />
              <FormField label="Município *" value={sender.city} onChange={(v) => onUpdate({ sender: { ...sender, city: v } })} />
              <FormField label="Estado *" value={sender.state} onChange={(v) => onUpdate({ sender: { ...sender, state: v } })} />
              <FormField
                label="Telefone *"
                value={sender.phone}
                onChange={(v) => onUpdate({ sender: { ...sender, phone: formatPhone(v) } })}
                placeholder="(00) 00000-0000"
              />
              <FormField label="Contato" value={sender.contact || ''} onChange={(v) => onUpdate({ sender: { ...sender, contact: v } })} />
              <FormField label="Empresa (Remetente)" value={sender.companyName || ''} onChange={(v) => onUpdate({ sender: { ...sender, companyName: v } })} />
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1.5 bg-[#0078d4] rounded-full"></div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Itens para Transporte</h3>
              </div>
              <button type="button" onClick={handleAddEquipment} className="flex items-center gap-2 text-[11px] bg-[#0078d4] text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-tight shadow-md">
                <PlusCircle className="w-4 h-4" /> Adicionar Item
              </button>
            </div>
            <div className="space-y-4">
              {equipment.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-5 bg-white p-6 rounded-[1.5rem] border border-zinc-200 relative group transition-all hover:border-[#0078d4]/30 hover:shadow-xl hover:shadow-zinc-200/30">
                  <FormField label="Descrição" value={item.description} onChange={(v) => handleEquipmentChange(idx, 'description', v)} />
                  <FormField label="Modelo" value={item.model} onChange={(v) => handleEquipmentChange(idx, 'model', v)} />
                  <FormField
                    label="Nº Série"
                    value={item.serialNumber}
                    onChange={(v) => handleEquipmentChange(idx, 'serialNumber', v)}
                    placeholder="Série do Item"
                  />
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2 ml-1 tracking-wider">Valor Unitário</label>
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none font-medium transition-all"
                          value={item.unitValue > 0 ? formatCurrency(item.unitValue) : ''}
                          placeholder="R$ 0,00"
                          onChange={(e) => handleEquipmentChange(idx, 'unitValue', parseCurrencyToNumber(e.target.value))}
                        />
                      </div>
                    </div>
                    {equipment.length > 1 && (
                      <button onClick={() => handleRemoveEquipment(idx)} className="p-2.5 text-zinc-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1.5 bg-[#0078d4] rounded-full"></div>
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Dados da Coleta / Transportadora</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FormField label="Razão Social" value={carrier.companyName} onChange={(v) => onUpdate({ carrier: { ...carrier, companyName: v } })} />
              <FormField label="Nome do Motorista" value={carrier.driverName} onChange={(v) => onUpdate({ carrier: { ...carrier, driverName: v } })} />
              <FormField
                label="RG do Motorista"
                value={carrier.rg}
                onChange={(v) => onUpdate({ carrier: { ...carrier, rg: formatRG(v) } })}
                placeholder="RG alfanumérico"
              />
              <FormField label="Data Prevista" type="date" value={carrier.collectionDate} onChange={(v) => onUpdate({ carrier: { ...carrier, collectionDate: v } })} />
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1.5 bg-[#0078d4] rounded-full"></div>
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Dados de Destino (À CTDI do Brasil)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2">
                <FormField label="Destinatário" value={recipient.name} onChange={(v) => onUpdate({ recipient: { ...recipient, name: v } })} />
              </div>
              <div className="relative">
                <FormField
                  label="CNPJ"
                  value={recipient.cnpj}
                  onChange={(v) => {
                    const formatted = formatCNPJ(v);
                    onUpdate({ recipient: { ...recipient, cnpj: formatted } });
                    if (formatted.replace(/\D/g, '').length === 14) handleCnpjSearch(formatted, true);
                  }}
                  placeholder="00.000.000/0000-00"
                />
                {isSearchingCnpj && step === 4 && (
                  <div className="absolute right-3 top-9 text-zinc-400">
                    <div className="animate-spin w-4 h-4 border-2 border-zinc-300 border-t-[#0078d4] rounded-full" />
                  </div>
                )}
              </div>
              <FormField label="Inscrição Estadual" value={recipient.ie} onChange={(v) => onUpdate({ recipient: { ...recipient, ie: v } })} />
              <div className="md:col-span-2 lg:col-span-3">
                <FormField label="Endereço" value={recipient.address} onChange={(v) => onUpdate({ recipient: { ...recipient, address: v } })} />
              </div>
              <div className="relative">
                <FormField
                  label="CEP"
                  value={recipient.zipCode}
                  onChange={(v) => {
                    const formatted = formatCEP(v);
                    onUpdate({ recipient: { ...recipient, zipCode: formatted } });
                    if (formatted.replace(/\D/g, '').length === 8) handleRecipientCepSearch(formatted);
                  }}
                  placeholder="00000-000"
                />
                {isSearchingCep && step === 4 && (
                  <div className="absolute right-3 top-9 text-zinc-400">
                    <div className="animate-spin w-4 h-4 border-2 border-zinc-300 border-t-[#0078d4] rounded-full" />
                  </div>
                )}
              </div>
              <FormField label="Cidade/Estado" value={recipient.cityState} onChange={(v) => onUpdate({ recipient: { ...recipient, cityState: v } })} />
            </div>
          </section>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-10 border-t border-zinc-200">
        <button
          disabled={step === 1}
          onClick={() => setStep(step - 1)}
          className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}
        >
          <ChevronLeftIcon className="w-4 h-4" /> Passo Anterior
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNavigateTo(step + 1)}
            className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 ${canNavigateTo(step + 1) ? 'bg-[#0078d4] text-white hover:bg-blue-700' : 'bg-zinc-100 text-zinc-300 cursor-not-allowed shadow-none'}`}
          >
            Próximo Passo <ChevronRightIcon className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => onGenerate()}
            className="flex items-center gap-2 px-10 py-4 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-xl active:scale-95"
          >
            Finalizar e Gerar <CheckCircle2Icon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

const FormField: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }> = ({ label, value, onChange, type = "text", placeholder }) => (
  <div className="w-full">
    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 ml-1 tracking-wider">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all hover:border-zinc-300 font-medium"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);
