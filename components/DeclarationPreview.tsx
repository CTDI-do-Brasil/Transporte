
import React from 'react';
import { Declaration } from '../types';
import { QrCodeIcon } from 'lucide-react';

interface Props {
  declaration: Declaration;
  onSignatureClick?: (type: 'sender' | 'carrier') => void;
}

export const DeclarationPreview: React.FC<Props> = ({ declaration, onSignatureClick }) => {
  const totalValue = declaration.equipment.reduce((acc, item) => acc + item.unitValue, 0);
  const totalQty = declaration.equipment.length;

  return (
    <div className="bg-white text-black font-serif p-[1.5cm] leading-tight text-[11pt]">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div className="font-bold">
          {declaration.city}, {declaration.date}
        </div>
        <div className="font-bold border-b-2 border-black pb-1">
          Nº da Declaração: <span className="underline decoration-1 font-mono">{declaration.number}</span>
        </div>
      </div>

      {/* Recipient */}
      <div className="mb-10 space-y-1">
        <div className="font-bold mb-2">À</div>
        <div className="font-bold uppercase text-sm">{declaration.recipient.name}</div>
        <div>{declaration.recipient.address}</div>
        <div>{declaration.recipient.cityState}</div>
        <div>CEP: {declaration.recipient.zipCode}</div>
        <div className="font-bold">CNPJ: {declaration.recipient.cnpj} – I.E.: {declaration.recipient.ie}</div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold underline tracking-widest uppercase">Declaração</h1>
      </div>

      {/* Body Text */}
      <div className="mb-8 text-justify">
        Declaramos para os devidos fins, que não sou contribuinte do ICMS e, portanto, desobrigado da emissão de
        nota fiscal, e estou enviando <span className="font-bold">({totalQty.toString().padStart(2, '0')})</span> equipamento(s) para armazenagem no valor total de <span className="font-bold">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> para a
        empresa <span className="font-bold">{declaration.recipient.name}</span> conforme descritos individualmente abaixo:
      </div>

      {/* Equipment Table */}
      <table className="w-full border-collapse border border-black mb-10">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-left text-[10px] uppercase font-bold w-[35%]">Descrição do Eqpto.</th>
            <th className="border border-black p-2 text-left text-[10px] uppercase font-bold w-[25%]">Modelo</th>
            <th className="border border-black p-2 text-left text-[10px] uppercase font-bold w-[20%]">Nº de Série</th>
            <th className="border border-black p-2 text-right text-[10px] uppercase font-bold w-[20%]">Valor Unitário (R$)</th>
          </tr>
        </thead>
        <tbody>
          {declaration.equipment.map((item, idx) => (
            <tr key={idx}>
              <td className="border border-black p-2">{item.description}</td>
              <td className="border border-black p-2">{item.model}</td>
              <td className="border border-black p-2">{item.serialNumber}</td>
              <td className="border border-black p-2 text-right">{item.unitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 4 - declaration.equipment.length) }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className="border border-black p-2 h-7"></td>
              <td className="border border-black p-2 h-7"></td>
              <td className="border border-black p-2 h-7"></td>
              <td className="border border-black p-2 h-7 text-right"></td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-bold">
            <td colSpan={3} className="border border-black p-2 text-right uppercase text-[10px]">Total da Declaração</td>
            <td className="border border-black p-2 text-right">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-4 font-bold">De:</div>

      {/* Footer Grid */}
      <div className="grid grid-cols-2 gap-4 mb-16">
        <div className="border border-black">
          <div className="bg-gray-100 border-b border-black p-1 text-center font-bold text-[9px] uppercase">Dados do Remetente (Pessoa Física):</div>
          <div className="p-2 space-y-0.5 text-[9px]">
            <div><span className="font-bold">Nome:</span> {declaration.sender.name}</div>
            <div><span className="font-bold">CPF:</span> {declaration.sender.cpf}</div>
            <div className="leading-tight"><span className="font-bold">Endereço:</span> {declaration.sender.address}, {declaration.sender.number}</div>
            <div><span className="font-bold">Município:</span> {declaration.sender.city}</div>
            <div><span className="font-bold">Estado:</span> {declaration.sender.state}</div>
            <div><span className="font-bold">CEP:</span> {declaration.sender.zipCode}</div>
            <div><span className="font-bold">Contato:</span> {declaration.sender.contact || declaration.sender.name}</div>
            <div><span className="font-bold">Telefone/Fax:</span> {declaration.sender.phone}</div>
            <div><span className="font-bold">E-mail:</span> {declaration.employeeEmail || '—'}</div>
            <div><span className="font-bold">Razão Social da Empresa:</span> {declaration.sender.companyName || '—'}</div>
          </div>
        </div>

        <div className="border border-black flex flex-col">
          <div className="bg-gray-100 border-b border-black p-1 text-center font-bold text-[9px] uppercase">Dados da Transportadora:</div>
          <div className="p-2 space-y-2 text-[9px] flex-1">
            <div><span className="font-bold">Nome do Motorista:</span> {declaration.carrier.driverName}</div>
            <div><span className="font-bold">RG:</span> {declaration.carrier.rg}</div>
            <div><span className="font-bold">Data da Coleta:</span> {declaration.carrier.collectionDate ? new Date(declaration.carrier.collectionDate).toLocaleDateString('pt-BR') : ''}</div>
            <div className="mt-4 pt-2 border-t border-dotted border-gray-400">
              <span className="font-bold">Razão Social da Empresa:</span> {declaration.carrier.companyName}
            </div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-10 mt-10">
        <div className="text-center">
          <div className="h-20 border-b border-black mb-2 relative">
            {declaration.signatureSender && (
              <img src={declaration.signatureSender} alt="Assinatura Remetente" className="max-h-full max-w-full mx-auto" />
            )}
          </div>
          <div className="text-[9pt] uppercase font-bold text-black">Assinatura do Remetente</div>
        </div>

        <div className="text-center">
          <div className="h-20 border-b border-black mb-2 relative">
            {declaration.signatureCarrier && (
              <img src={declaration.signatureCarrier} alt="Assinatura Motorista" className="max-h-full max-w-full mx-auto" />
            )}
          </div>
          <div className="text-[9pt] uppercase font-bold text-black">Assinatura do Motorista</div>
        </div>
      </div>
    </div>
  );
};
