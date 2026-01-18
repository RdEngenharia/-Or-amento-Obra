
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import type { Chart as ChartType } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

// --- INTERFACES ---
export interface HspCapital { capital: string; hsp: number; }
export interface CompensationUnit { id: string; contractNumber: string; consumption: string | number; }
export interface ManualEquipment { id: string; description: string; }

export interface CompanyConfig {
    razao: string;
    cnpj: string;
    tel: string;
    logo: string;
    themeColor: string;
    chartColor1: string;
    chartColor2: string;
    inverterImage: string; 
    panelImage: string;    
}

// --- CONSTANTS ---
const hspCapitais: HspCapital[] = [
    { capital: "Aracaju", hsp: 5.23 }, { capital: "Belém", hsp: 4.88 }, { capital: "Belo Horizonte", hsp: 5.21 },
    { capital: "Boa Vista", hsp: 5.34 }, { capital: "Brasília", hsp: 5.48 }, { capital: "Campo Grande", hsp: 5.25 },
    { capital: "Cuiabá", hsp: 5.11 }, { capital: "Curitiba", hsp: 4.08 }, { capital: "Florianópolis", hsp: 4.02 },
    { capital: "Fortaleza", hsp: 5.82 }, { capital: "Goiânia", hsp: 5.28 }, { capital: "João Pessoa", hsp: 5.52 },
    { capital: "Macapá", hsp: 4.95 }, { capital: "Maceió", hsp: 5.38 }, { capital: "Manaus", hsp: 4.42 },
    { capital: "Natal", hsp: 5.61 }, { capital: "Palmas", hsp: 5.39 }, { capital: "Porto Alegre", hsp: 4.15 },
    { capital: "Porto Velho", hsp: 4.62 }, { capital: "Recife", hsp: 5.31 }, { capital: "Rio Branco", hsp: 4.55 },
    { capital: "Rio de Janeiro", hsp: 4.68 }, { capital: "Salvador", hsp: 5.22 }, { capital: "São Luís", hsp: 5.35 },
    { capital: "São Paulo", hsp: 4.35 }, { capital: "Teresina", hsp: 5.68 }, { capital: "Vitória", hsp: 4.87 }
].sort((a,b) => a.capital.localeCompare(b.capital));

const inversoresPadrao = ["Solis", "Huawei", "Deye", "Auxsol", "FoxEss", "Hoymiles", "Growatt", "Fronius", "Outro"];
const paineisPadrao = ["Honor Solar", "Astronergy", "Gokin", "Osda", "JA Solar", "Risen", "Canadian", "Jinko", "Outro"];

const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [234, 88, 12];
};

declare global { interface Window { jspdf: any; } }

const App: React.FC = () => {
    // Configurações da Empresa
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({
        razao: 'RD Solar', cnpj: '', tel: '', logo: '',
        themeColor: '#ea580c', chartColor1: '#b0bec5', chartColor2: '#f97316',
        inverterImage: '', panelImage: ''
    });

    // Dados do Cliente
    const [clientName, setClientName] = useState('');
    const [clientDoc, setClientDoc] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [ugContract, setUgContract] = useState('');
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);

    // Consumo e Rateio
    const [consumptionType, setConsumptionType] = useState('media');
    const [avgConsumption, setAvgConsumption] = useState<number | string>('');
    const [monthlyConsumptions, setMonthlyConsumptions] = useState<Array<number | string>>(Array(12).fill(''));
    const [simultaneity, setSimultaneity] = useState(0.3); // 30%, 50%, 70%
    const [compensationUnits, setCompensationUnits] = useState<CompensationUnit[]>([]);

    // Dados Técnicos
    const [cityHsp, setCityHsp] = useState(5.22); 
    const [inverterBrand, setInverterBrand] = useState(inversoresPadrao[0]);
    const [manualInverter, setManualInverter] = useState('');
    const [inverterWarranty, setInverterWarranty] = useState('10');
    const [panelBrand, setPanelBrand] = useState(paineisPadrao[0]);
    const [manualPanel, setManualPanel] = useState('');
    const [panelPower, setPanelPower] = useState<number | string>(575);
    const [panelWarranty, setPanelWarranty] = useState('12');
    const [manualEquipment, setManualEquipment] = useState<ManualEquipment[]>([]);
    
    // Valores
    const [overrideQtdP, setOverrideQtdP] = useState<number | string>('');
    const [calculatedQtdP, setCalculatedQtdP] = useState<number | null>(null);
    const [kitValue, setKitValue] = useState<number>(0);
    const [formattedKitValue, setFormattedKitValue] = useState('');
    const [laborValue, setLaborValue] = useState<number>(0);
    const [formattedLaborValue, setFormattedLaborValue] = useState('');

    const [showResults, setShowResults] = useState(false);
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<ChartType | null>(null);

    useEffect(() => {
        const load = (key: string) => localStorage.getItem(`rd_solar_v2_${key}`);
        setCompanyConfig({
            razao: load('razao') || 'RD Solar',
            cnpj: load('cnpj') || '',
            tel: load('tel') || '',
            logo: load('logo') || '',
            themeColor: load('themeColor') || '#ea580c',
            chartColor1: load('chartColor1') || '#b0bec5',
            chartColor2: load('chartColor2') || '#f97316',
            inverterImage: load('inverterImage') || '',
            panelImage: load('panelImage') || ''
        });
    }, []);

    const saveConfig = () => {
        Object.entries(companyConfig).forEach(([k, v]) => localStorage.setItem(`rd_solar_v2_${k}`, v as string));
        setIsConfigOpen(false);
    };

    // Auto cálculo de quantidade de placas
    useEffect(() => {
        const pot = parseFloat(String(panelPower) || '0');
        if (pot <= 0) return setCalculatedQtdP(null);
        let mediaUG = 0;
        if (consumptionType === 'media') {
            mediaUG = parseFloat(String(avgConsumption) || '0');
        } else {
            const valid = monthlyConsumptions.map(v => parseFloat(String(v) || '0')).filter(v => v > 0);
            if (valid.length > 0) mediaUG = valid.reduce((a, b) => a + b, 0) / valid.length;
        }
        const totalComp = compensationUnits.reduce((acc, u) => acc + (parseFloat(String(u.consumption)) || 0), 0);
        const totalNec = mediaUG + totalComp;

        if (totalNec <= 0) return setCalculatedQtdP(null);
        const kwpNec = (totalNec / 30) / (cityHsp * 0.80);
        setCalculatedQtdP(Math.ceil((kwpNec * 1000) / pot));
    }, [consumptionType, avgConsumption, monthlyConsumptions, panelPower, cityHsp, compensationUnits]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, key: keyof CompanyConfig) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => setCompanyConfig(prev => ({ ...prev, [key]: ev.target?.result as string }));
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const handleCurrency = (e: React.ChangeEvent<HTMLInputElement>, setVal: any, setForm: any) => {
        const val = e.target.value.replace(/\D/g, '');
        const num = val ? parseInt(val, 10) / 100 : 0;
        setVal(num);
        setForm(num === 0 ? '' : formatCurrency(num));
    };

    const generatePDF = async (chartImg: string) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const theme = hexToRgb(companyConfig.themeColor);
        const qtd = overrideQtdP ? Number(overrideQtdP) : (calculatedQtdP || 0);
        const preco = kitValue + laborValue;
        const kwp = ((qtd * Number(panelPower)) / 1000).toFixed(2);
        
        // Logica de Cobrança (Fio B / Injetado)
        const custoKwhInjetado = 0.20; 
        const taxaMinima = 50.00;

        let mediaUG = consumptionType === 'media' ? parseFloat(String(avgConsumption) || '0') : 
            (monthlyConsumptions.reduce((a, b) => Number(a) + Number(b), 0) / 12);
        
        const injetadoUG = mediaUG * (1 - simultaneity);
        const faturaUG = Math.max(taxaMinima, (injetadoUG * custoKwhInjetado));

        // --- CABEÇALHO ---
        doc.setFillColor(...theme);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255);
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text(companyConfig.razao || "Sua Empresa Solar", 15, 12);
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`CNPJ: ${companyConfig.cnpj || "Não informado"}`, 15, 18);
        doc.text(`Telefone: ${companyConfig.tel || "Não informado"}`, 15, 23);
        doc.text("Proposta Comercial - Solução em Energia Fotovoltaica", 15, 28);
        
        if (companyConfig.logo) {
            doc.addImage(companyConfig.logo, 'PNG', 160, 4, 35, 26);
        }

        // --- DADOS CLIENTE ---
        let y = 45;
        doc.setTextColor(40);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Dados do Cliente", 15, y);
        y += 6;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Cliente: ${clientName || "---"}`, 15, y);
        doc.text(`CPF/CNPJ: ${clientDoc || "---"}`, 110, y);
        y += 5;
        doc.text(`Endereço (Geradora): ${clientAddress || "---"}`, 15, y);
        
        y += 10;
        doc.addImage(chartImg, 'PNG', 15, y, 180, 45);
        y += 50;

        // --- RETORNO E ECONOMIA ---
        doc.setFillColor(245, 245, 245);
        doc.rect(15, y, 180, 22 + (compensationUnits.length * 5), 'F');
        doc.setTextColor(...theme);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text("Investimento e Projeção de Faturas (Custo de Disponibilidade/Fio B)", 20, y + 8);
        
        doc.setFontSize(8.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(40);
        doc.text(`Unidade Geradora (Conta: ${ugContract || 'UG'}): ${formatCurrency(faturaUG)}`, 20, y + 15);
        
        let subY = y + 20;
        compensationUnits.forEach(unit => {
            const consumoUnit = parseFloat(String(unit.consumption)) || 0;
            const faturaRateio = Math.max(taxaMinima, (consumoUnit * custoKwhInjetado));
            doc.text(`Rateio (Conta: ${unit.contractNumber || '---'}): ${formatCurrency(faturaRateio)}`, 20, subY);
            subY += 5;
        });
        y += 28 + (compensationUnits.length * 5);

        // --- COMPOSIÇÃO DO SISTEMA ---
        doc.setTextColor(...theme);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Composição Técnica do Investimento:", 15, y);
        y += 6;
        doc.setTextColor(40);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        
        const finalInv = inverterBrand === 'Outro' ? manualInverter : inverterBrand;
        const finalPan = panelBrand === 'Outro' ? manualPanel : panelBrand;
        
        doc.text(`> Gerador de ${kwp} kWp com ${qtd} módulos de ${panelPower}W`, 75, y);
        doc.text(`> Módulos: ${finalPan} | Garantia: ${panelWarranty} anos`, 75, y + 5);
        doc.text(`> Inversor: ${finalInv} | Garantia: ${inverterWarranty} anos`, 75, y + 10);
        doc.text(`> Estrutura de fixação completa e Homologação inclusa`, 75, y + 15);
        
        manualEquipment.forEach((item, idx) => {
            if(item.description.trim()) {
                doc.text(`> ${item.description}`, 75, y + 20 + (idx * 5));
            }
        });

        if (companyConfig.panelImage) doc.addImage(companyConfig.panelImage, 'PNG', 15, y - 4, 25, 25);
        if (companyConfig.inverterImage) doc.addImage(companyConfig.inverterImage, 'PNG', 45, y - 4, 25, 25);
        
        y += 35 + (manualEquipment.length * 5);

        // --- VANTAGENS (ADICIONADO) ---
        doc.setTextColor(...theme);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Falta pouco para sua independência energética!", 15, y);
        y += 6;
        doc.setTextColor(40);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text("- Economia de até 95% na conta de luz.", 15, y);
        y += 5;
        doc.text("- Valorização imediata do seu imóvel.", 15, y);
        y += 5;
        doc.text("- Baixa manutenção e longa vida útil (mais de 25 anos).", 15, y);
        y += 5;
        doc.text("- Contribuição para um futuro mais sustentável.", 15, y);
        y += 10;

        // --- FINANCIAMENTO ---
        doc.setTextColor(...theme);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Opções de Parcelamento (Estimado):", 15, y);
        y += 6;
        doc.setTextColor(40);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const financingCoeff = { 24: 0.065, 36: 0.051, 48: 0.044, 60: 0.040 };
        doc.text(`24x ${formatCurrency(preco * financingCoeff[24])}`, 15, y);
        doc.text(`36x ${formatCurrency(preco * financingCoeff[36])}`, 65, y);
        doc.text(`48x ${formatCurrency(preco * financingCoeff[48])}`, 115, y);
        doc.text(`60x ${formatCurrency(preco * financingCoeff[60])}`, 165, y);
        y += 10;

        // --- RODAPÉ COM TOTAL ---
        doc.setFillColor(...theme);
        doc.rect(15, y, 180, 14, 'F');
        doc.setTextColor(255);
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.text(`VALOR TOTAL DO INVESTIMENTO: ${formatCurrency(preco)}`, 25, y + 9);
        
        y += 20;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont(undefined, 'normal');
        doc.text(`Data da Proposta: ${new Date(quoteDate).toLocaleDateString('pt-BR')}`, 15, y);
        doc.text(`Válido até: ${new Date(new Date(quoteDate).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}`, 195, y, { align: 'right' });

        doc.save(`Proposta_Solar_${clientName || 'RD'}.pdf`);
    };

    const renderChart = () => {
        setShowResults(true);
        setTimeout(() => {
            if (chartCanvasRef.current) {
                const ctx = chartCanvasRef.current.getContext('2d');
                if (ctx) {
                    if (chartInstanceRef.current) chartInstanceRef.current.destroy();
                    const consData = consumptionType === 'media' ? Array(12).fill(avgConsumption) : monthlyConsumptions.map(v => Number(v));
                    const qtd = overrideQtdP ? Number(overrideQtdP) : (calculatedQtdP || 0);
                    const genData = Array(12).fill((qtd * Number(panelPower) * cityHsp * 30 * 0.8 / 1000));
                    chartInstanceRef.current = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                            datasets: [
                                { label: 'Consumo (kWh)', data: consData.map(c => Number(c) || 0), backgroundColor: companyConfig.chartColor1 },
                                { label: 'Geração Estimada (kWh)', data: genData, backgroundColor: companyConfig.chartColor2 }
                            ]
                        },
                        options: { animation: false }
                    });
                    setTimeout(() => generatePDF(chartInstanceRef.current!.toBase64Image()), 500);
                }
            }
        }, 100);
    };

    return (
        <div className="bg-slate-100 min-h-screen font-sans text-slate-800 pb-20">
            <header className="bg-white shadow-md border-b-4 border-orange-500 p-4 sticky top-0 z-30">
                <div className="container max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {companyConfig.logo && <img src={companyConfig.logo} className="h-12 w-auto object-contain bg-white p-1 rounded-md shadow-sm"/>}
                        <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">{companyConfig.razao}</h1>
                    </div>
                    <button onClick={() => setIsConfigOpen(true)} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-orange-600 transition-all shadow-lg flex items-center gap-2">⚙️ CONFIGURAÇÕES</button>
                </div>
            </header>

            <main className="container max-w-4xl mx-auto p-4 sm:p-8">
                <div className="bg-white rounded-[2rem] shadow-2xl p-6 sm:p-10 border border-slate-200 overflow-hidden">
                    <h2 className="text-2xl font-black mb-10 text-slate-700 border-l-[10px] border-orange-600 pl-4 uppercase italic tracking-tight">Novo Orçamento Fotovoltaico</h2>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Cliente</label>
                            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: João Silva" className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 transition-all outline-none"/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF ou CNPJ</label>
                            <input type="text" value={clientDoc} onChange={e => setClientDoc(e.target.value)} placeholder="000.000.000-00" className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-500 transition-all"/>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço do Projeto</label>
                            <input type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Rua, Cidade, UF" className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-500 transition-all"/>
                        </div>
                    </section>

                    {/* Unidade Geradora */}
                    <section className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] mb-10 border-2 border-slate-100 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <span className="text-6xl font-black italic">UG</span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                            <h3 className="font-black text-slate-600 uppercase text-xs flex items-center gap-2">🔌 Unidade Geradora</h3>
                            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
                                {[0.3, 0.5, 0.7].map(val => (
                                    <button 
                                        key={val} 
                                        onClick={() => setSimultaneity(val)} 
                                        className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${simultaneity === val ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-orange-600'}`}>
                                        {val * 100}%
                                    </button>
                                ))}
                                <div className="ml-2 flex items-center px-3 border-l text-[8px] text-slate-400 font-bold uppercase tracking-tight">Simultaneidade</div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Conta Contrato</label>
                                <input type="text" value={ugContract} onChange={e => setUgContract(e.target.value)} placeholder="0000000" className="w-full p-3 bg-white border-2 border-slate-50 rounded-xl outline-none focus:border-orange-400"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Tipo Consumo</label>
                                <select value={consumptionType} onChange={e => setConsumptionType(e.target.value)} className="w-full p-3 bg-white border-2 border-slate-50 rounded-xl outline-none">
                                    <option value="media">Média Mensal</option>
                                    <option value="individual">Mês a Mês</option>
                                </select>
                            </div>
                            {consumptionType === 'media' ? (
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">kWh Médio</label>
                                    <input type="number" value={avgConsumption} onChange={e => setAvgConsumption(e.target.value)} className="w-full p-3 bg-white border-2 border-slate-50 rounded-xl outline-none"/>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 md:col-span-3">
                                    {monthlyConsumptions.map((v, i) => (
                                        <input key={i} type="number" value={v} onChange={e => { const n = [...monthlyConsumptions]; n[i] = e.target.value; setMonthlyConsumptions(n); }} placeholder={`M${i+1}`} className="w-full p-2 border-2 border-slate-50 rounded-xl text-xs text-center outline-none focus:border-orange-400"/>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Rateio */}
                    <section className="bg-blue-50/50 p-6 sm:p-8 rounded-[2rem] mb-10 border-2 border-blue-50">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-blue-800 uppercase text-xs flex items-center gap-2">🏠 Unidades de Rateio</h3>
                            <button onClick={() => setCompensationUnits([...compensationUnits, { id: Date.now().toString(), contractNumber: '', consumption: '' }])} className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black shadow-lg hover:bg-blue-700 transition-all">+ ADICIONAR CONTA</button>
                        </div>
                        <div className="space-y-4">
                            {compensationUnits.map(u => (
                                <div key={u.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-[1.5rem] border border-blue-100 items-end shadow-sm">
                                    <div>
                                        <label className="text-[9px] font-black text-blue-300 uppercase mb-1 block">Conta Contrato</label>
                                        <input type="text" value={u.contractNumber} onChange={e => setCompensationUnits(compensationUnits.map(x => x.id === u.id ? {...x, contractNumber: e.target.value} : x))} className="w-full p-2.5 border rounded-xl text-sm focus:border-blue-400 outline-none"/>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-blue-300 uppercase mb-1 block">Consumo Médio (kWh)</label>
                                        <input type="number" value={u.consumption} onChange={e => setCompensationUnits(compensationUnits.map(x => x.id === u.id ? {...x, consumption: e.target.value} : x))} className="w-full p-2.5 border rounded-xl text-sm focus:border-blue-400 outline-none"/>
                                    </div>
                                    <button onClick={() => setCompensationUnits(compensationUnits.filter(x => x.id !== u.id))} className="text-red-400 text-[10px] font-black hover:bg-red-50 p-2.5 rounded-xl transition-all">REMOVER</button>
                                </div>
                            ))}
                            {compensationUnits.length === 0 && <p className="text-center text-slate-300 text-[10px] italic py-6 uppercase font-bold tracking-widest">Nenhum rateio configurado</p>}
                        </div>
                    </section>

                    {/* Dados Técnicos */}
                    <section className="bg-orange-50/30 p-6 sm:p-8 rounded-[2rem] mb-10 border-2 border-orange-100">
                        <h3 className="font-black text-orange-800 uppercase mb-8 text-xs flex items-center gap-2 tracking-widest">🛠️ Dimensionamento do Gerador</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Cidade (HSP)</label>
                                <select value={cityHsp} onChange={e => setCityHsp(Number(e.target.value))} className="w-full p-3.5 bg-white border-2 border-slate-50 rounded-2xl outline-none focus:border-orange-400">
                                    {hspCapitais.map(c => <option key={c.capital} value={c.hsp}>{c.capital}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Potência Módulo (W)</label>
                                <input type="number" value={panelPower} onChange={e => setPanelPower(e.target.value)} className="w-full p-3.5 bg-white border-2 border-slate-50 rounded-2xl outline-none focus:border-orange-400"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Quantidade Placas</label>
                                <input type="number" value={overrideQtdP} onChange={e => setOverrideQtdP(e.target.value)} placeholder={calculatedQtdP ? `Sugestão: ${calculatedQtdP}` : ""} className="w-full p-3.5 bg-white border-2 border-orange-200 rounded-2xl font-black text-orange-600 outline-none shadow-md focus:border-orange-500 placeholder:text-orange-200"/>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Marca do Inversor</label>
                                    <select value={inverterBrand} onChange={e => setInverterBrand(e.target.value)} className="w-full p-3.5 bg-white border-2 border-slate-50 rounded-2xl outline-none focus:border-orange-400">
                                        {inversoresPadrao.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                    {inverterBrand === 'Outro' && <input type="text" value={manualInverter} onChange={e => setManualInverter(e.target.value)} placeholder="Informe a marca" className="w-full p-3.5 border-2 mt-2 rounded-2xl bg-white outline-none focus:border-orange-400"/>}
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Garantia Inversor (Anos)</label>
                                    <input type="text" value={inverterWarranty} onChange={e => setInverterWarranty(e.target.value)} className="w-full p-3.5 bg-white border-2 border-slate-50 rounded-2xl outline-none"/>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Marca do Painel</label>
                                    <select value={panelBrand} onChange={e => setPanelBrand(e.target.value)} className="w-full p-3.5 bg-white border-2 border-slate-50 rounded-2xl outline-none focus:border-orange-400">
                                        {paineisPadrao.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                    {panelBrand === 'Outro' && <input type="text" value={manualPanel} onChange={e => setManualPanel(e.target.value)} placeholder="Informe a marca" className="w-full p-3.5 border-2 mt-2 rounded-2xl bg-white outline-none focus:border-orange-400"/>}
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Garantia Painel (Anos)</label>
                                    <input type="text" value={panelWarranty} onChange={e => setPanelWarranty(e.target.value)} className="w-full p-3.5 bg-white border-2 border-slate-50 rounded-2xl outline-none"/>
                                </div>
                            </div>
                        </div>

                        {/* Equipamentos Extras */}
                        <div className="mt-8 border-t border-orange-100 pt-8">
                             <div className="flex justify-between items-center mb-6">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens Adicionais no PDF</h4>
                                <button onClick={() => setManualEquipment([...manualEquipment, { id: Date.now().toString(), description: '' }])} className="text-orange-600 text-[10px] font-black hover:underline">+ ADICIONAR ITEM</button>
                             </div>
                             {manualEquipment.map(item => (
                                 <div key={item.id} className="flex gap-4 mb-3">
                                     <input type="text" value={item.description} onChange={e => setManualEquipment(manualEquipment.map(x => x.id === item.id ? {...x, description: e.target.value} : x))} placeholder="Ex: 1x Bateria de Lítio 5kWh" className="flex-grow p-3 bg-white border-2 border-slate-50 rounded-2xl outline-none focus:border-orange-400 text-sm"/>
                                     <button onClick={() => setManualEquipment(manualEquipment.filter(x => x.id !== item.id))} className="text-red-300 font-bold px-3">×</button>
                                 </div>
                             ))}
                        </div>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor do Kit (Materiais)</label>
                            <input type="text" value={formattedKitValue} onChange={e => handleCurrency(e, setKitValue, setFormattedKitValue)} placeholder="R$ 0,00" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-xl font-black text-slate-600 outline-none focus:border-orange-500 shadow-sm"/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mão de Obra e Engenharia</label>
                            <input type="text" value={formattedLaborValue} onChange={e => handleCurrency(e, setLaborValue, setFormattedLaborValue)} placeholder="R$ 0,00" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-xl font-black text-slate-600 outline-none focus:border-orange-500 shadow-sm"/>
                        </div>
                    </section>

                    <button onClick={renderChart} className="w-full py-6 bg-orange-600 text-white font-black rounded-[2rem] hover:bg-orange-700 shadow-2xl transition-all text-xl uppercase tracking-[0.2em] active:scale-95 border-b-8 border-orange-800">GERAR PROPOSTA PDF</button>
                </div>
                {showResults && <div className="mt-10 opacity-0 pointer-events-none absolute"><canvas ref={chartCanvasRef}></canvas></div>}
            </main>

            {/* Modal de Configuração da Empresa */}
            {isConfigOpen && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-10 shadow-2xl relative border-4 border-orange-500">
                        <button onClick={() => setIsConfigOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-red-500 text-5xl font-light transition-all">&times;</button>
                        <h3 className="text-2xl font-black text-slate-800 mb-10 uppercase italic border-b-4 border-orange-500 pb-4 tracking-tighter">Identidade Visual da Empresa</h3>
                        
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Razão Social</label>
                                    <input type="text" value={companyConfig.razao} onChange={e => setCompanyConfig({...companyConfig, razao: e.target.value})} className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-400 font-bold"/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CNPJ Oficial</label>
                                    <input type="text" value={companyConfig.cnpj} onChange={e => setCompanyConfig({...companyConfig, cnpj: e.target.value})} className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-400 font-bold"/>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp / Telefone</label>
                                    <input type="text" value={companyConfig.tel} onChange={e => setCompanyConfig({...companyConfig, tel: e.target.value})} className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-400 font-bold"/>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-widest">Cor Principal da Proposta (PDF)</label>
                                    <input type="color" value={companyConfig.themeColor} onChange={e => setCompanyConfig({...companyConfig, themeColor: e.target.value})} className="w-full h-16 rounded-2xl p-1 cursor-pointer border-2 border-slate-100"/>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-8 rounded-[2rem] border-4 border-dashed border-slate-200 text-center group hover:border-orange-300 transition-all">
                                <label className="text-[10px] font-black text-slate-500 mb-4 block uppercase tracking-widest">Logotipo Oficial (PNG/JPG)</label>
                                <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'logo')} className="text-xs mb-6 inline-block file:bg-slate-800 file:text-white file:rounded-xl file:px-4 file:py-2 file:border-none file:font-black"/>
                                {companyConfig.logo && <div className="bg-white p-4 rounded-[1.5rem] shadow-xl inline-block mt-4 border-2 border-orange-100"><img src={companyConfig.logo} className="h-24 mx-auto object-contain"/></div>}
                            </div>

                            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                                <h4 className="font-black text-slate-400 mb-6 uppercase text-[10px] text-center tracking-[0.3em]">Imagens Técnicas de Equipamentos</h4>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="text-center space-y-2">
                                        <p className="text-[8px] font-black text-slate-400 uppercase">Foto Inversor</p>
                                        <input type="file" onChange={e => handleFileUpload(e, 'inverterImage')} className="text-[8px] mb-3 w-full"/>
                                        {companyConfig.inverterImage && <img src={companyConfig.inverterImage} className="h-16 mx-auto object-contain bg-white p-2 rounded-xl shadow-md border border-orange-50"/>}
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-[8px] font-black text-slate-400 uppercase">Foto Módulo</p>
                                        <input type="file" onChange={e => handleFileUpload(e, 'panelImage')} className="text-[8px] mb-3 w-full"/>
                                        {companyConfig.panelImage && <img src={companyConfig.panelImage} className="h-16 mx-auto object-contain bg-white p-2 rounded-xl shadow-md border border-orange-50"/>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={saveConfig} className="w-full py-5 bg-orange-600 text-white font-black rounded-[2rem] shadow-xl hover:bg-orange-700 transition-all uppercase tracking-[0.3em] border-b-4 border-orange-800">SALVAR CONFIGURAÇÕES</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
