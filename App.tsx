
import React, { useState, useEffect, useRef } from 'react';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import type { Chart as ChartType } from 'chart.js';
import { hspCapitais, inversores, paineis } from './constants';
import type { CompanyConfig, CompensationUnit, ManualEquipment, SavedQuote } from './types';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

// Type declaration for jsPDF from CDN
declare global {
  interface Window {
    jspdf: any;
  }
}

const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [230, 81, 0]; // Fallback to default orange
};


const App: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({
        razao: '',
        cnpj: '',
        tel: '',
        logo: '',
        themeColor: '#e65100',
        chartColor1: '#b0bec5',
        chartColor2: '#ff9800',
        inverterImages: {},
        panelImage: '',
        quoteValidityDays: '7',
    });

    const [clientName, setClientName] = useState('');
    const [clientDoc, setClientDoc] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [consumptionType, setConsumptionType] = useState('media');
    const [simultaneity, setSimultaneity] = useState(0.3);
    const [avgConsumption, setAvgConsumption] = useState<number | string>('');
    const [monthlyConsumptions, setMonthlyConsumptions] = useState<Array<number | string>>(Array(12).fill(''));
    const [cityHsp, setCityHsp] = useState(hspCapitais[0].hsp);
    const [inverter, setInverter] = useState(inversores[0].nome);
    const [inverterModel, setInverterModel] = useState('');
    const [inverterPower, setInverterPower] = useState('');
    const [inverterVoltage, setInverterVoltage] = useState('');
    const [inverterWarranty, setInverterWarranty] = useState('');
    const [panel, setPanel] = useState(paineis[0].marca);
    const [panelModel, setPanelModel] = useState('');
    const [panelPower, setPanelPower] = useState<number | string>(575);
    const [panelWarranty, setPanelWarranty] = useState('');
    const [overrideQtdP, setOverrideQtdP] = useState<number | string>('');
    const [calculatedQtdP, setCalculatedQtdP] = useState<number | null>(null);
    const [kitValue, setKitValue] = useState<number>(0);
    const [formattedKitValue, setFormattedKitValue] = useState('');
    const [laborValue, setLaborValue] = useState<number>(0);
    const [formattedLaborValue, setFormattedLaborValue] = useState('');
    const [pdfValueDisplay, setPdfValueDisplay] = useState('total'); // 'total' or 'detailed'
    const [compensationUnits, setCompensationUnits] = useState<CompensationUnit[]>([]);
    const [manualEquipment, setManualEquipment] = useState<ManualEquipment[]>([]);
    const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);

    const [showResults, setShowResults] = useState(false);

    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<ChartType | null>(null);

    useEffect(() => {
        const savedInverterImages = localStorage.getItem('rd_solar_inverterImages');
        const savedPanelImage = localStorage.getItem('rd_solar_panelImage');
        const savedQuotesData = localStorage.getItem('rd_solar_savedQuotes');

        if (savedQuotesData) {
            setSavedQuotes(JSON.parse(savedQuotesData));
        }

        const savedConfig: CompanyConfig = {
            razao: localStorage.getItem('rd_solar_razao') || '',
            cnpj: localStorage.getItem('rd_solar_cnpj') || '',
            tel: localStorage.getItem('rd_solar_tel') || '',
            logo: localStorage.getItem('rd_solar_logo') || '',
            themeColor: localStorage.getItem('rd_solar_themeColor') || '#e65100',
            chartColor1: localStorage.getItem('rd_solar_chartColor1') || '#b0bec5',
            chartColor2: localStorage.getItem('rd_solar_chartColor2') || '#ff9800',
            quoteValidityDays: localStorage.getItem('rd_solar_quoteValidityDays') || '7',
            inverterImages: savedInverterImages ? JSON.parse(savedInverterImages) : {},
            panelImage: savedPanelImage || '',
        };
        setCompanyConfig(savedConfig);
        const sortedCapitals = [...hspCapitais].sort((a,b) => a.capital.localeCompare(b.capital));
        if (sortedCapitals.length > 0) {
            setCityHsp(sortedCapitals[0].hsp);
        }
    }, []);

    useEffect(() => {
        const potP = parseFloat(String(panelPower) || '0');
        if (potP <= 0) {
            setCalculatedQtdP(null);
            return;
        }

        let mediaConsumoGeradora = 0;
        if (consumptionType === 'media') {
            mediaConsumoGeradora = parseFloat(String(avgConsumption) || '0');
        } else {
            const validConsumptions = monthlyConsumptions.map(m => parseFloat(String(m) || '0')).filter(v => !isNaN(v) && v > 0);
            if (validConsumptions.length > 0) {
                 mediaConsumoGeradora = validConsumptions.reduce((a, b) => a + b, 0) / validConsumptions.length;
            }
        }

        const totalConsumoCompensacao = compensationUnits.reduce((acc, unit) => acc + (parseFloat(String(unit.consumption)) || 0), 0);
        
        const totalConsumoGeral = mediaConsumoGeradora + totalConsumoCompensacao;

        if (totalConsumoGeral <= 0) {
            setCalculatedQtdP(null);
            return;
        }

        const hsp = cityHsp;
        const kwpNec = (totalConsumoGeral / 30) / (hsp * 0.80);
        const qtdP = Math.ceil((kwpNec * 1000) / potP);

        setCalculatedQtdP(qtdP);

    }, [consumptionType, avgConsumption, monthlyConsumptions, compensationUnits, panelPower, cityHsp]);


    const handleSaveConfig = () => {
        localStorage.setItem('rd_solar_razao', companyConfig.razao);
        localStorage.setItem('rd_solar_cnpj', companyConfig.cnpj);
        localStorage.setItem('rd_solar_tel', companyConfig.tel);
        localStorage.setItem('rd_solar_logo', companyConfig.logo);
        localStorage.setItem('rd_solar_themeColor', companyConfig.themeColor || '#e65100');
        localStorage.setItem('rd_solar_chartColor1', companyConfig.chartColor1 || '#b0bec5');
        localStorage.setItem('rd_solar_chartColor2', companyConfig.chartColor2 || '#ff9800');
        localStorage.setItem('rd_solar_quoteValidityDays', companyConfig.quoteValidityDays || '7');
        localStorage.setItem('rd_solar_inverterImages', JSON.stringify(companyConfig.inverterImages || {}));
        localStorage.setItem('rd_solar_panelImage', companyConfig.panelImage || '');
        setIsModalOpen(false);
    };
    
    const fileToBase64 = (file: File, callback: (result: string) => void) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if(event.target?.result) {
                callback(event.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const processLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            fileToBase64(e.target.files[0], (base64) => {
                 setCompanyConfig({ ...companyConfig, logo: base64 });
            });
        }
    };

    const handlePanelImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            fileToBase64(e.target.files[0], (base64) => {
                setCompanyConfig({ ...companyConfig, panelImage: base64 });
            });
        }
    };

    const handleInverterImageUpload = (e: React.ChangeEvent<HTMLInputElement>, inverterName: string) => {
        if (e.target.files && e.target.files[0]) {
            fileToBase64(e.target.files[0], (base64) => {
                setCompanyConfig(prevConfig => ({
                    ...prevConfig,
                    inverterImages: {
                        ...prevConfig.inverterImages,
                        [inverterName]: base64,
                    }
                }));
            });
        }
    };
    
    const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const updateCurrencyFields = (
        numericValue: number,
        setValue: React.Dispatch<React.SetStateAction<number>>,
        setFormattedValue: React.Dispatch<React.SetStateAction<string>>
    ) => {
        setValue(numericValue);
        if (numericValue === 0) {
            setFormattedValue('');
        } else {
            setFormattedValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue));
        }
    };
    
    const handleCurrencyChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setValue: React.Dispatch<React.SetStateAction<number>>,
        setFormattedValue: React.Dispatch<React.SetStateAction<string>>
    ) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const numericValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        updateCurrencyFields(numericValue, setValue, setFormattedValue);
    };

    const handleAddUnit = () => {
        setCompensationUnits([...compensationUnits, { id: Date.now().toString(), contractNumber: '', consumption: '' }]);
    };
    const handleRemoveUnit = (id: string) => {
        setCompensationUnits(compensationUnits.filter(unit => unit.id !== id));
    };
    const handleUnitChange = (id: string, field: keyof Omit<CompensationUnit, 'id'>, value: string) => {
        setCompensationUnits(compensationUnits.map(unit => unit.id === id ? { ...unit, [field]: value } : unit));
    };
    
    const handleAddManualEquipment = () => {
        setManualEquipment([{ id: Date.now().toString(), description: '' }, ...manualEquipment]);
    };
    const handleRemoveManualEquipment = (id: string) => {
        setManualEquipment(manualEquipment.filter(item => item.id !== id));
    };
    const handleManualEquipmentChange = (id: string, value: string) => {
        setManualEquipment(manualEquipment.map(item => item.id === id ? { ...item, description: value } : item));
    };

    const loadImageAsBase64 = async (url: string): Promise<string> => {
        try {
            const response = await fetch(url);
            if (!response.ok) return '';
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error(`Erro ao carregar imagem ${url}:`, error);
            return '';
        }
    };
    
    const handleSaveQuote = () => {
        const quoteName = prompt("Digite um nome para salvar este orçamento:", clientName || `Orçamento ${new Date().toLocaleDateString()}`);
        if (!quoteName) return;

        const newQuote: SavedQuote = {
            id: Date.now(),
            name: quoteName,
            clientName, clientDoc, clientAddress, quoteDate, consumptionType, simultaneity,
            avgConsumption, monthlyConsumptions, cityHsp, inverter, inverterModel,
            inverterPower, inverterVoltage, inverterWarranty, panel, panelModel,
            panelPower, panelWarranty, overrideQtdP, kitValue, laborValue,
            pdfValueDisplay, compensationUnits, manualEquipment
        };

        const updatedQuotes = [...savedQuotes, newQuote];
        setSavedQuotes(updatedQuotes);
        localStorage.setItem('rd_solar_savedQuotes', JSON.stringify(updatedQuotes));
        alert(`Orçamento "${quoteName}" salvo com sucesso!`);
    };

    const handleLoadQuote = (quoteId: number) => {
        const quoteToLoad = savedQuotes.find(q => q.id === quoteId);
        if (!quoteToLoad) return;

        setClientName(quoteToLoad.clientName);
        setClientDoc(quoteToLoad.clientDoc);
        setClientAddress(quoteToLoad.clientAddress);
        setQuoteDate(quoteToLoad.quoteDate);
        setConsumptionType(quoteToLoad.consumptionType);
        setSimultaneity(quoteToLoad.simultaneity);
        setAvgConsumption(quoteToLoad.avgConsumption);
        setMonthlyConsumptions(quoteToLoad.monthlyConsumptions);
        setCityHsp(quoteToLoad.cityHsp);
        setInverter(quoteToLoad.inverter);
        setInverterModel(quoteToLoad.inverterModel);
        setInverterPower(quoteToLoad.inverterPower);
        setInverterVoltage(quoteToLoad.inverterVoltage);
        setInverterWarranty(quoteToLoad.inverterWarranty);
        setPanel(quoteToLoad.panel);
        setPanelModel(quoteToLoad.panelModel);
        setPanelPower(quoteToLoad.panelPower);
        setPanelWarranty(quoteToLoad.panelWarranty);
        setOverrideQtdP(quoteToLoad.overrideQtdP);
        updateCurrencyFields(quoteToLoad.kitValue, setKitValue, setFormattedKitValue);
        updateCurrencyFields(quoteToLoad.laborValue, setLaborValue, setFormattedLaborValue);
        setPdfValueDisplay(quoteToLoad.pdfValueDisplay);
        setCompensationUnits(quoteToLoad.compensationUnits);
        setManualEquipment(quoteToLoad.manualEquipment);

        setIsLoadModalOpen(false);
    };
    
    const handleDeleteQuote = (quoteId: number) => {
        if (confirm("Tem certeza que deseja excluir este orçamento?")) {
            const updatedQuotes = savedQuotes.filter(q => q.id !== quoteId);
            setSavedQuotes(updatedQuotes);
            localStorage.setItem('rd_solar_savedQuotes', JSON.stringify(updatedQuotes));
        }
    };


    const generatePDF = async (chartImage: string, kwpFinal: number, qtdP: number, preco: number, paybackMeses: number, calculatedBills: { main: number, compensation: { contractNumber: string, newBill: number }[] }, totalSavings: number, kitVal: number, laborVal: number) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const cli = clientName || "Cliente";
        const docCli = clientDoc || "Não informado";
        const endCli = clientAddress || "Não informado";
        const rz = companyConfig.razao || "RD Solar";
        const cnpj = companyConfig.cnpj || "";
        const tel = companyConfig.tel || "";
        const logo = companyConfig.logo;

        const themeRgb = hexToRgb(companyConfig.themeColor || '#e65100');

        const selectedInverter = inversores.find(i => i.nome === inverter);
        const selectedPanel = paineis.find(p => p.marca === panel);
        
        let inverterImageB64 = '';
        if (companyConfig.inverterImages?.[inverter]) {
            inverterImageB64 = companyConfig.inverterImages[inverter];
        } else if (selectedInverter) {
            inverterImageB64 = await loadImageAsBase64(selectedInverter.image);
        }

        let panelImageB64 = '';
        if (companyConfig.panelImage) {
            panelImageB64 = companyConfig.panelImage;
        } else if (selectedPanel) {
            panelImageB64 = await loadImageAsBase64(selectedPanel.image);
        }
        
        // --- PDF Header ---
        doc.setFillColor(...themeRgb);
        doc.rect(0, 0, 210, 35, 'F');
        if (logo) doc.addImage(logo, 'PNG', 165, 4, 30, 26);
        doc.setTextColor(255);
        doc.setFontSize(16);
        doc.text(rz, 15, 14);
        doc.setFontSize(9);
        if(cnpj || tel) doc.text(`CNPJ: ${cnpj} | Telefone: ${tel}`, 15, 21);
        
        doc.setFontSize(10);
        doc.text('Proposta Comercial Personalizada', 15, 28);

        let currentY = 42;

        doc.setTextColor(40);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Dados do Cliente", 15, currentY);
        currentY += 5;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9.5);
        doc.text(`Nome: ${cli}`, 15, currentY);
        currentY += 4;
        doc.text(`CPF/CNPJ: ${docCli}`, 15, currentY);
        currentY += 4;
        doc.text(`Endereço (Unidade Geradora): ${endCli}`, 15, currentY);
        currentY += 7;

        doc.addImage(chartImage, 'PNG', 15, currentY, 180, 50);
        currentY += 50 + 5;

        const roi25anos = (totalSavings * 12 * 25) - preco;
        const paybackY = currentY;
        doc.setFillColor(245, 245, 245);
        doc.rect(15, paybackY, 180, 22, 'F');
        doc.setTextColor(...themeRgb);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text("Retorno do Investimento e Economia", 20, paybackY + 6);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(40);
        doc.setFontSize(9);
        doc.text(`Nova Fatura (Unid. Geradora): ${formatCurrency(calculatedBills.main)}`, 20, paybackY + 12);
        doc.text(`Payback estimado: ${Math.floor(paybackMeses)} meses`, 20, paybackY + 17);
        doc.text(`Retorno em 25 anos: ${formatCurrency(roi25anos)}`, 190, paybackY + 17, { align: 'right'});
        currentY += 22 + 4;

        if (calculatedBills.compensation.length > 0) {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text("Unidades de Compensação", 15, currentY);
            currentY += 5;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            calculatedBills.compensation.forEach(unit => {
                doc.text(`> Conta Contrato: ${unit.contractNumber} | Nova Fatura Estimada: ${formatCurrency(unit.newBill)}`, 18, currentY);
                currentY += 4;
            });
            currentY += 2;
        }

        doc.setFontSize(12);
        doc.setTextColor(...themeRgb);
        doc.setFont(undefined, 'bold');
        doc.text("O que está incluso no seu investimento:", 15, currentY);
        currentY += 2;
        let itemTextY = currentY + 3;
        if (inverterImageB64) doc.addImage(inverterImageB64, 'PNG', 15, currentY, 25, 25);
        if (panelImageB64) doc.addImage(panelImageB64, 'PNG', 45, currentY, 25, 25);
        doc.setTextColor(40);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        const inverterFullText = [inverter, inverterModel, inverterPower, inverterVoltage].filter(Boolean).join(' ');
        const panelFullText = [panel, panelModel, `${panelPower}W`].filter(Boolean).join(' ');

        const baseItems = [
            `> Instalação e Homologação`,
            `> Kit: ${qtdP}x ${panelFullText} | ${inverterFullText}`
        ];

        const additionalItems = manualEquipment
            .filter(item => item.description.trim() !== '')
            .map(item => `> ${item.description.trim()}`);
        
        const items = [ ...baseItems, ...additionalItems ];

        items.push(`> Potência: ${kwpFinal.toFixed(2)} kWp`);

        const panelWarrantyText = panelWarranty
            ? `${panelWarranty} (fábrica) e 25 (geração)`
            : `25 (geração)`;
        
        const warrantyItems = [];
        warrantyItems.push(`${panelWarrantyText} anos para painéis`);

        if (inverterWarranty) {
            warrantyItems.push(`${inverterWarranty} anos para inversor`);
        }
        items.push(`> Garantias: ${warrantyItems.join(' | ')}`);

        items.forEach((txt, i) => doc.text(txt, 78, itemTextY + (i * 5)));
        
        const itemSectionHeight = Math.max(30, items.length * 5 + 10);
        currentY += itemSectionHeight;
        
        doc.setFontSize(12);
        doc.setTextColor(...themeRgb);
        doc.setFont(undefined, 'bold');
        doc.text("Falta pouco para sua independência energética!", 15, currentY);
        currentY += 6;

        doc.setFont(undefined, 'normal');
        doc.setTextColor(40);
        doc.setFontSize(9);
        const benefits = [
            "- Economia de até 95% na conta de luz.",
            "- Valorização imediata do seu imóvel.",
            "- Baixa manutenção e longa vida útil (mais de 25 anos).",
            "- Contribuição para um futuro mais sustentável."
        ];
        benefits.forEach(benefit => {
            doc.text(benefit, 15, currentY);
            currentY += 5;
        });
        currentY += 3;

        doc.setFontSize(12);
        doc.setTextColor(...themeRgb);
        doc.setFont(undefined, 'bold');
        doc.text("OPÇÕES DE FINANCIamento", 15, currentY);
        currentY += 5;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(40);
        doc.setFontSize(9);
        doc.text("CARÊNCIA DE ATÉ 120 DIAS PARA O PRIMEIRO PAGAMENTO", 15, currentY);
        currentY += 6;
        const financingCoefficients = { 24: 791.35/12000, 36: 616.40/12000, 48: 534.48/12000, 60: 489.39/12000 };
        const calc = (n: 24 | 36 | 48 | 60) => preco * financingCoefficients[n];
        doc.setFontSize(9);
        doc.text(`24x ${formatCurrency(calc(24))}`, 20, currentY);
        doc.text(`36x ${formatCurrency(calc(36))}`, 100, currentY);
        currentY += 5;
        doc.text(`48x ${formatCurrency(calc(48))}`, 20, currentY);
        doc.text(`60x ${formatCurrency(calc(60))}`, 100, currentY);
        currentY += 8;
        
        doc.setFillColor(...themeRgb);
        if (pdfValueDisplay === 'detailed') {
            const detailBoxY = currentY;
            const boxWidth = 180;
            const boxX = 15;
            const textXStart = boxX + 5;
            const valueXEnd = boxX + boxWidth - 5;
    
            doc.rect(boxX, detailBoxY, boxWidth, 24, 'F');
            doc.setTextColor(255);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`VALOR DO KIT (MATERIAIS):`, textXStart, detailBoxY + 6);
            doc.text(formatCurrency(kitVal), valueXEnd, detailBoxY + 6, { align: 'right' });
            doc.text(`VALOR DA MÃO DE OBRA:`, textXStart, detailBoxY + 12);
            doc.text(formatCurrency(laborVal), valueXEnd, detailBoxY + 12, { align: 'right' });
            
            doc.setLineWidth(0.5);
            doc.setDrawColor(255, 255, 255);
            doc.line(boxX + 3, detailBoxY + 15, boxX + boxWidth - 3, detailBoxY + 15);
    
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`VALOR TOTAL DO PROJETO:`, textXStart, detailBoxY + 21);
            doc.text(formatCurrency(preco), valueXEnd, detailBoxY + 21, { align: 'right' });
            currentY += 24;
        } else { // 'total'
            doc.rect(15, currentY, 180, 16, 'F');
            doc.setFontSize(14);
            doc.setTextColor(255);
            doc.setFont(undefined, 'bold');
            doc.text(`VALOR TOTAL DO PROJETO: ${formatCurrency(preco)}`, 25, currentY + 10);
            currentY += 16;
        }

        currentY += 8; // Add some space
        const issueDate = new Date(quoteDate + 'T00:00:00');
        const expiryDate = new Date(issueDate);
        expiryDate.setDate(issueDate.getDate() + parseInt(companyConfig.quoteValidityDays || '7', 10));

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont(undefined, 'normal');
        doc.text(`Data da Proposta: ${issueDate.toLocaleDateString('pt-BR')}`, 195, currentY, { align: 'right' });
        currentY += 5;
        doc.setFont(undefined, 'bold');
        doc.text(`Válido até: ${expiryDate.toLocaleDateString('pt-BR')}`, 195, currentY, { align: 'right' });


        doc.save(`Proposta_Solar_${cli.replace(/\s/g, '_')}.pdf`);
    };
    
    const handleSubmit = async () => {
        let cons: number[] = [];
        let mediaConsumo = 0;
        if (consumptionType === 'media') {
            mediaConsumo = parseFloat(String(avgConsumption) || '0');
            cons = Array(12).fill(mediaConsumo);
        } else {
            const validConsumptions = monthlyConsumptions.map(m => parseFloat(String(m) || '0')).filter(v => !isNaN(v));
            cons = monthlyConsumptions.map(m => parseFloat(String(m) || '0'));
            if(validConsumptions.length > 0) {
                mediaConsumo = validConsumptions.reduce((a, b) => a + b, 0) / validConsumptions.length;
            }
        }

        const potP = parseFloat(String(panelPower) || '0');
        const preco = kitValue + laborValue;
        const simult = simultaneity;
        
        const qtdP = overrideQtdP 
            ? Number(overrideQtdP) 
            : (calculatedQtdP || 0);

        const kwpFinal = (qtdP * potP) / 1000;
        const genEst = (kwpFinal * cityHsp * 30 * 0.80);
        
        const tarifa = 1.22; // R$/kWh
        const taxaCompensacao = 0.19; // R$/kWh (Fio B fee on compensated energy)
        const custoDisponibilidade = 50; // R$ (Minimum fee)

        const consumoInstantaneo_kWh = mediaConsumo * simult;
        const consumoDaRedeGeradora_kWh = mediaConsumo * (1 - simult);
        const energiaInjetada_kWh = Math.max(0, genEst - consumoInstantaneo_kWh);

        let creditosDisponiveis_kWh = energiaInjetada_kWh;
        
        const energiaACompensar_Geradora_kWh = consumoDaRedeGeradora_kWh;
        const compensadoNaGeradora_kWh = Math.min(energiaACompensar_Geradora_kWh, creditosDisponiveis_kWh);
        const naoCompensadoNaGeradora_kWh = energiaACompensar_Geradora_kWh - compensadoNaGeradora_kWh;
        
        const custoVariavelGeradora = (compensadoNaGeradora_kWh * taxaCompensacao) + (naoCompensadoNaGeradora_kWh * tarifa);
        const novaContaGeradora = Math.max(custoDisponibilidade, custoVariavelGeradora);

        creditosDisponiveis_kWh -= compensadoNaGeradora_kWh;

        const compensationBills: { contractNumber: string, newBill: number }[] = [];
        for (const unit of compensationUnits) {
            const consumoUnit_kWh = parseFloat(String(unit.consumption) || '0');
            if (consumoUnit_kWh > 0) {
                 if (creditosDisponiveis_kWh > 0) {
                    const compensadoNaUnidade_kWh = Math.min(creditosDisponiveis_kWh, consumoUnit_kWh);
                    const naoCompensadoNaUnidade_kWh = consumoUnit_kWh - compensadoNaUnidade_kWh;
                    const custoVariavelUnidade = (compensadoNaUnidade_kWh * taxaCompensacao) + (naoCompensadoNaUnidade_kWh * tarifa);
                    const novaContaUnidade = Math.max(custoDisponibilidade, custoVariavelUnidade);
                    compensationBills.push({ contractNumber: unit.contractNumber, newBill: novaContaUnidade });
                    
                    creditosDisponiveis_kWh -= compensadoNaUnidade_kWh;
                } else {
                    const contaSemCredito = Math.max(custoDisponibilidade, consumoUnit_kWh * tarifa);
                    compensationBills.push({ contractNumber: unit.contractNumber, newBill: contaSemCredito });
                }
            }
        }
        
        const totalConsumption = mediaConsumo + compensationUnits.reduce((acc, unit) => acc + parseFloat(String(unit.consumption) || '0'), 0);
        const totalOldBill = totalConsumption * tarifa;
        const totalNewBill = novaContaGeradora + compensationBills.reduce((acc, unit) => acc + unit.newBill, 0);
        const totalSavings = totalOldBill - totalNewBill;
        const paybackMeses = preco > 0 && totalSavings > 0 ? preco / totalSavings : 0;
        
        setShowResults(true);

        setTimeout(() => {
            if (chartCanvasRef.current) {
                const ctx = chartCanvasRef.current.getContext('2d');
                if (ctx) {
                    if (chartInstanceRef.current) chartInstanceRef.current.destroy();
                    chartInstanceRef.current = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                            datasets: [
                                { label: 'Consumo (kWh)', data: cons.map(c => c || 0), backgroundColor: companyConfig.chartColor1 || '#b0bec5' },
                                { label: 'Geração Estimada (kWh)', data: Array(12).fill(genEst), backgroundColor: companyConfig.chartColor2 || '#ff9800' }
                            ]
                        },
                        options: { animation: false }
                    });
                    
                    setTimeout(async () => {
                      if (chartInstanceRef.current) {
                        const chartImage = chartInstanceRef.current.toBase64Image();
                        await generatePDF(chartImage, kwpFinal, qtdP, preco, paybackMeses, { main: novaContaGeradora, compensation: compensationBills }, totalSavings, kitValue, laborValue);
                      }
                    }, 500);
                }
            }
        }, 100);
    };

    return (
        <div className="bg-slate-100 min-h-screen p-4 sm:p-6">
            <div className="container max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-md mb-6 flex items-center justify-center gap-2 transition-colors"
                >
                    <span role="img" aria-label="settings">⚙️</span> Configurações da Empresa
                </button>
                <h2 className="text-2xl font-bold text-orange-700 border-b-2 border-orange-700 pb-2 mb-6">
                    📄 Novo Orçamento Fotovoltaico
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Nome do Cliente</label>
                        <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: João da Silva" className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                     <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Data da Proposta</label>
                        <input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">CPF/CNPJ</label>
                        <input type="text" value={clientDoc} onChange={e => setClientDoc(e.target.value)} placeholder="000.000.000-00" className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Endereço do Cliente (Unid. Geradora)</label>
                    <input type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Ex: Rua das Flores, 123, Bairro, Cidade - UF" className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"/>
                </div>

                <h3 className="text-xl font-bold text-orange-700 border-b-2 border-orange-700 pb-2 mt-8 mb-4">
                    Consumo (Unidade Geradora)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Tipo de Entrada</label>
                        <select value={consumptionType} onChange={e => setConsumptionType(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500">
                            <option value="media">Média Mensal</option>
                            <option value="individual">Mês a Mês</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Consumo Simultâneo (%)</label>
                        <select value={simultaneity} onChange={e => setSimultaneity(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500">
                            <option value="0.3">30% (Residencial Padrão)</option>
                            <option value="0.5">50% (Misto/Comercial)</option>
                            <option value="0.7">70% (Comercial Diurno)</option>
                        </select>
                    </div>
                </div>

                {consumptionType === 'media' && (
                     <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Consumo Médio Mensal (kWh)</label>
                        <input type="number" value={avgConsumption} onChange={e => setAvgConsumption(e.target.value)} placeholder="Ex: 500" className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                )}
                {consumptionType === 'individual' && (
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Consumo Mês a Mês (kWh)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((mes, i) => (
                                <input key={mes} type="number" value={monthlyConsumptions[i]} onChange={e => { const newCons = [...monthlyConsumptions]; newCons[i] = e.target.value; setMonthlyConsumptions(newCons); }} placeholder={mes} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"/>
                            ))}
                        </div>
                    </div>
                )}

                 <h3 className="text-xl font-bold text-orange-700 border-b-2 border-orange-700 pb-2 mt-8 mb-4">
                    Unidades de Compensação (Opcional)
                </h3>
                {compensationUnits.map((unit, index) => (
                    <div key={unit.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 border rounded-lg bg-slate-50 relative">
                        <div className="md:col-span-1">
                             <label className="block text-xs font-semibold text-gray-500 mb-1">Conta Contrato</label>
                             <input type="text" value={unit.contractNumber} onChange={e => handleUnitChange(unit.id, 'contractNumber', e.target.value)} placeholder="Nº da Conta" className="w-full p-2 border border-slate-300 rounded-md"/>
                        </div>
                        <div className="md:col-span-1">
                             <label className="block text-xs font-semibold text-gray-500 mb-1">Consumo Médio (kWh)</label>
                             <input type="number" value={unit.consumption} onChange={e => handleUnitChange(unit.id, 'consumption', e.target.value)} placeholder="Ex: 300" className="w-full p-2 border border-slate-300 rounded-md"/>
                        </div>
                        <div className="md:col-span-1 flex items-end">
                            <button onClick={() => handleRemoveUnit(unit.id)} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                Remover
                            </button>
                        </div>
                    </div>
                ))}
                <button onClick={handleAddUnit} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md mb-4 transition-colors">
                    + Adicionar Unidade
                </button>
                
                 <h3 className="text-xl font-bold text-orange-700 border-b-2 border-orange-700 pb-2 mt-8 mb-4">
                    Equipamentos Adicionais (Opcional)
                </h3>
                {manualEquipment.map((item) => (
                    <div key={item.id} className="flex gap-3 mb-3">
                        <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleManualEquipmentChange(item.id, e.target.value)}
                            placeholder="Ex: 1x Bateria de Lítio 5kWh"
                            className="flex-grow p-2 border border-slate-300 rounded-md"
                        />
                        <button onClick={() => handleRemoveManualEquipment(item.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Remover
                        </button>
                    </div>
                ))}
                <button onClick={handleAddManualEquipment} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md mb-4 transition-colors">
                    + Adicionar Equipamento
                </button>

                 <h3 className="text-xl font-bold text-orange-700 border-b-2 border-orange-700 pb-2 mt-8 mb-4">
                    Configuração Técnica e Preço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Cidade (HSP)</label>
                        <select value={cityHsp} onChange={e => setCityHsp(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500">
                           {[...hspCapitais].sort((a,b)=>a.capital.localeCompare(b.capital)).map(c => <option key={c.capital} value={c.hsp}>{c.capital}</option>)}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Inversor (Marca)</label>
                        <select value={inverter} onChange={e => setInverter(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500">
                           {inversores.map(i => <option key={i.nome} value={i.nome}>{i.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Inversor (Modelo)</label>
                        <input type="text" value={inverterModel} onChange={e => setInverterModel(e.target.value)} placeholder="Ex: S6-GR1P8K" className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Inversor (Potência)</label>
                        <input type="text" value={inverterPower} onChange={e => setInverterPower(e.target.value)} placeholder="Ex: 8kW" className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Inversor (Tensão)</label>
                        <select value={inverterVoltage} onChange={e => setInverterVoltage(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500">
                            <option value="">Selecione</option>
                            <option value="Monofásico 220V">Monofásico 220V</option>
                            <option value="Bifásico 220V">Bifásico 220V</option>
                            <option value="Trifásico 220V">Trifásico 220V</option>
                            <option value="Trifásico 380V">Trifásico 380V</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Painel (Marca)</label>
                        <select value={panel} onChange={e => setPanel(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500">
                           {paineis.map(p => <option key={p.marca} value={p.marca}>{p.marca}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Painel (Modelo)</label>
                        <input type="text" value={panelModel} onChange={e => setPanelModel(e.target.value)} placeholder="Ex: ODA575-36V-MH" className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Painel (Potência W)</label>
                        <input type="number" value={panelPower} onChange={e => setPanelPower(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Garantia Inversor (Anos)</label>
                        <input type="text" value={inverterWarranty} onChange={e => setInverterWarranty(e.target.value)} placeholder="Ex: 12" className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Garantia Painel (Anos)</label>
                        <input type="text" value={panelWarranty} onChange={e => setPanelWarranty(e.target.value)} placeholder="Ex: 12" className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                     <div className="lg:col-span-3">
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Nº de Painéis (Opcional)</label>
                        <input 
                            type="number" 
                            value={overrideQtdP} 
                            onChange={e => setOverrideQtdP(e.target.value)} 
                            placeholder={calculatedQtdP ? `Automático: ${calculatedQtdP}` : "Automático"}
                            className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Valor do Kit (Materiais)</label>
                        <input
                            type="text"
                            value={formattedKitValue}
                            onChange={(e) => handleCurrencyChange(e, setKitValue, setFormattedKitValue)}
                            placeholder="R$ 10.000,00"
                            className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Valor da Mão de Obra</label>
                        <input
                            type="text"
                            value={formattedLaborValue}
                            onChange={(e) => handleCurrencyChange(e, setLaborValue, setFormattedLaborValue)}
                            placeholder="R$ 5.000,00"
                            className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                </div>
                
                <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-600 mb-2">Exibição de Valores no PDF</label>
                    <div className="flex gap-4">
                         <label className="flex items-center">
                            <input
                                type="radio"
                                name="pdfDisplay"
                                value="total"
                                checked={pdfValueDisplay === 'total'}
                                onChange={(e) => setPdfValueDisplay(e.target.value)}
                                className="h-4 w-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                            />
                            <span className="ml-2 text-gray-700">Mostrar Valor Total Agrupado</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="pdfDisplay"
                                value="detailed"
                                checked={pdfValueDisplay === 'detailed'}
                                onChange={(e) => setPdfValueDisplay(e.target.value)}
                                className="h-4 w-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                            />
                            <span className="ml-2 text-gray-700">Discriminar Material e Mão de Obra</span>
                        </label>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                    <button onClick={handleSaveQuote} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-md transition-colors flex-shrink-0">
                        💾 Salvar Orçamento
                    </button>
                    <button onClick={() => setIsLoadModalOpen(true)} className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-5 rounded-md transition-colors flex-shrink-0">
                        📂 Carregar Orçamento
                    </button>
                    <button onClick={handleSubmit} className="w-full bg-orange-700 hover:bg-orange-800 text-white font-bold py-4 px-4 rounded-md text-lg transition-colors flex-grow">
                        GERAR PROPOSTA COMPLETA
                    </button>
                </div>
                
                {showResults && (
                    <div className="mt-6 border border-slate-200 p-4 rounded-md shadow-sm">
                        <canvas ref={chartCanvasRef}></canvas>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-orange-700 mb-4">Configurações da Empresa</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Razão Social</label>
                                <input type="text" value={companyConfig.razao} onChange={e => setCompanyConfig({...companyConfig, razao: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">CNPJ</label>
                                <input type="text" value={companyConfig.cnpj} onChange={e => setCompanyConfig({...companyConfig, cnpj: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Telefone</label>
                                <input type="text" value={companyConfig.tel} onChange={e => setCompanyConfig({...companyConfig, tel: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Prazo de Validade da Proposta (dias)</label>
                                <input type="number" value={companyConfig.quoteValidityDays} onChange={e => setCompanyConfig({...companyConfig, quoteValidityDays: e.target.value})} placeholder="Ex: 7" className="w-full p-2 border border-slate-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Logo</label>
                                <input type="file" accept="image/*" onChange={processLogo} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"/>
                            </div>
                             <hr className="my-4"/>
                            <h4 className="text-lg font-bold text-gray-800 -mb-2">Personalização de Cores</h4>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Cor Principal (PDF)</label>
                                <select value={companyConfig.themeColor} onChange={e => setCompanyConfig({...companyConfig, themeColor: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md">
                                    <option value="#e65100">Laranja (Padrão)</option>
                                    <option value="#d32f2f">Vermelho</option>
                                    <option value="#616161">Cinza</option>
                                    <option value="#03a9f4">Azul Claro</option>
                                    <option value="#1976d2">Azul Escuro</option>
                                    <option value="#8bc34a">Verde Claro</option>
                                    <option value="#388e3c">Verde Escuro</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Gráfico (Consumo)</label>
                                    <input type="color" value={companyConfig.chartColor1} onChange={e => setCompanyConfig({...companyConfig, chartColor1: e.target.value})} className="w-full h-10 p-1 border border-slate-300 rounded-md"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Gráfico (Geração)</label>
                                    <input type="color" value={companyConfig.chartColor2} onChange={e => setCompanyConfig({...companyConfig, chartColor2: e.target.value})} className="w-full h-10 p-1 border border-slate-300 rounded-md"/>
                                </div>
                            </div>
                            <hr className="my-4"/>
                            <h4 className="text-lg font-bold text-gray-800 -mb-2">Imagens dos Equipamentos</h4>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Imagem Genérica do Painel Solar</label>
                                <input type="file" accept="image/*" onChange={handlePanelImageUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"/>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {inversores.map(inv => (
                                    <div key={inv.nome}>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Imagem Inversor {inv.nome}</label>
                                         <input type="file" accept="image/*" onChange={(e) => handleInverterImageUpload(e, inv.nome)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                             <button onClick={() => setIsModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSaveConfig} className="bg-orange-700 hover:bg-orange-800 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {isLoadModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <h3 className="text-xl font-bold text-orange-700 mb-4">Carregar Orçamento Salvo</h3>
                        <div className="overflow-y-auto flex-grow">
                            {savedQuotes.length > 0 ? (
                                <ul className="space-y-3">
                                    {savedQuotes.map(quote => (
                                        <li key={quote.id} className="p-3 border rounded-md bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <div className="flex-grow">
                                                <p className="font-bold text-gray-800">{quote.name}</p>
                                                <p className="text-sm text-gray-500">Data: {new Date(quote.quoteDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <button onClick={() => handleLoadQuote(quote.id)} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Carregar</button>
                                                <button onClick={() => handleDeleteQuote(quote.id)} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition-colors">Excluir</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500 py-8">Nenhum orçamento salvo encontrado.</p>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setIsLoadModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default App;
