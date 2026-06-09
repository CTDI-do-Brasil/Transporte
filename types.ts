
export interface Equipment {
  description: string;
  model: string;
  serialNumber: string;
  unitValue: number;
}

export interface SenderData {
  name: string;
  cpf: string;
  address: string;
  number: string;
  bairro: string;
  city: string;
  state: string;
  zipCode: string;
  contact: string;
  phone: string;
  companyName: string;
  cnpj?: string;
}

export interface CarrierData {
  driverName: string;
  rg: string;
  collectionDate: string;
  companyName: string;
}

export interface RecipientData {
  name: string;
  address: string;
  cityState: string;
  zipCode: string;
  cnpj: string;
  ie: string;
}

export interface Declaration {
  id: string;
  number: string;
  date: string;
  city: string;
  recipient: RecipientData;
  equipment: Equipment[];
  sender: SenderData;
  carrier: CarrierData;
  requestNumber?: string;
  signatureSender?: string; // Base64 image
  signatureCarrier?: string; // Base64 image
  // Extra Metadata from Paygen
  shipToAddressTo?: string;
  employeeEmail?: string;
  deliveryDate?: string;
  requestType?: string;
  priority?: string;
  legalHold?: string;
}
