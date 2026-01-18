
export interface HspCapital {
    capital: string;
    hsp: number;
}

export interface Inverter {
    nome: string;
    tipo: string;
    image: string;
}

export interface Panel {
    marca: string;
    image: string;
}

export interface CompanyConfig {
    razao: string;
    cnpj: string;
    tel: string;
    logo: string;
    themeColor?: string;
    chartColor1?: string;
    chartColor2?: string;
    inverterImages?: { [key: string]: string };
    panelImage?: string;
    quoteValidityDays?: string;
}

export interface CompensationUnit {
    id: string;
    contractNumber: string;
    consumption: string | number;
}

export interface ManualEquipment {
    id: string;
    description: string;
}

export interface SavedQuote {
    id: number;
    name: string;
    clientName: string;
    clientDoc: string;
    clientAddress: string;
    quoteDate: string;
    consumptionType: string;
    simultaneity: number;
    avgConsumption: number | string;
    monthlyConsumptions: Array<number | string>;
    cityHsp: number;
    inverter: string;
    inverterModel: string;
    inverterPower: string;
    inverterVoltage: string;
    inverterWarranty: string;
    panel: string;
    panelModel: string;
    panelPower: number | string;
    panelWarranty: string;
    overrideQtdP: number | string;
    kitValue: number;
    laborValue: number;
    pdfValueDisplay: string;
    compensationUnits: CompensationUnit[];
    manualEquipment: ManualEquipment[];
}
