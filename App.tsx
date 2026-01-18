import React, { useState, useEffect, useRef } from 'react';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import type { Chart as ChartType } from 'chart.js';
import { hspCapitais, inversores, paineis } from './constants';
import type { CompanyConfig, CompensationUnit, ManualEquipment, SavedQuote } from './types';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

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
    ] : [230, 81, 0];
};

const App: React.FC = () => {
    // --- ESTADOS DE CONFIGURAÇÃO ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({
        razao: '', cnpj: '', tel: '', logo: '',
        themeColor: '#e65100', chartColor1: '#b0bec5', chartColor2: '#ff9800',
        inverterImages: {}, panelImage: '', quoteValidityDays: '7',
    });

    // --- ESTADOS DO CLIENTE E PROJETO ---
    const [clientName, setClientName] = useState('');
    const [clientDoc, setClientDoc] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [consumptionType, setConsumptionType] = useState('media');
    const [simultaneity, setSimultaneity] = useState(0.3);
    const [avgConsumption, setAvgConsumption] = useState<number | string>('');
    const [monthlyConsumptions, setMonthlyConsumptions] = useState<Array<number | string>>(Array(12).fill(''));
    const [cityHsp, setCityHsp] = useState(hspCapitais[0].hsp);

    // --- ESTADOS DOS EQUIPAMENTOS (COM LÓGICA DE MARCA MANUAL) ---
    const [inverter, setInverter] = useState(inversores[0].nome);
    const [manualInverter, setManualInverter] = useState('');
    const [inverterModel, setInverterModel] = useState('');
    const [inverterPower, setInverterPower] = useState('');
    const [inverterVoltage, setInverterVoltage] = useState('');
    const [inverterWarranty, setInverterWarranty] = useState('');

    const [panel, setPanel] = useState(paineis[0].marca);
    const [manualPanel, setManualPanel] = useState('');
    const [panelModel, setPanelModel] = useState('');
    const [panelPower, setPanelPower] = useState<number | string>(575);
    const [panelWarranty, setPanelWarranty] = useState('');

    // --- FINANCEIRO E CÁLCULOS ---
    const [overrideQtdP, setOverrideQtdP] = useState<number | string>('');
    const [calculatedQtdP, setCalculatedQtdP] = useState<number | null>(null);
    const [kitValue, setKitValue] = useState<number>(0);
    const [formattedKitValue, setFormattedKitValue] = useState('');
    const [laborValue, setLaborValue] = useState<number>(0);
    const [formattedLaborValue, setFormattedLaborValue] = useState('');
    const [pdfValueDisplay, setPdfValueDisplay] = useState('total');
    const [compensationUnits, setCompensationUnits] = useState<CompensationUnit[]>([]);
    const [manualEquipment, setManualEquipment] = useState<ManualEquipment[]>([]);
    const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
    const [showResults, setShowResults] = useState(false);

    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<ChartType | null>(null);

    // --- CARREGAMENTO INICIAL ---
    useEffect(() => {
        const loadSavedData = () => {
            const savedInverterImages = localStorage.getItem('rd_solar_inverterImages');
            const savedPanelImage = localStorage.getItem('rd_solar_panelImage');
            const savedQuotesData = localStorage.getItem('rd_solar_savedQuotes');
            if (savedQuotesData) setSavedQuotes(JSON.parse(savedQuotesData));

            setCompanyConfig({
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
            });
        };
        loadSavedData();
    }, []);

    // --- LÓGICA DE DIMENSIONAMENTO ---
    useEffect(() => {
        const potP = parseFloat(String(panelPower) || '0');
        if (potP <= 0) { setCalculatedQtdP(null); return; }

        let mediaConsumoTotal = 0;
        if (consumptionType === 'media') {
            mediaConsumoTotal = parseFloat(String(avgConsumption) || '0');
        } else {
            const valid = monthlyConsumptions.map(m => parseFloat(String(m) || '0')).filter(v => !isNaN(v) && v > 0);
            mediaConsumoTotal = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
        }

        const extraConsumo = compensationUnits.reduce((acc, unit) => acc + (parseFloat(String(unit.consumption)) || 0), 0);
        const totalAlvo = mediaConsumoTotal + extraConsumo;

        if (totalAlvo <= 0) { setCalculatedQtdP(null); return; }

        const kwpNec = (totalAlvo / 30) / (cityHsp * 0.80);
        setCalculatedQtdP(Math.ceil((kwpNec * 1000) / potP));
    }, [consumptionType, avgConsumption, monthlyConsumptions, compensationUnits, panelPower, cityHsp]);

    // --- FUNÇÕES AUXILIARES ---
    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: number) => void, formatter: (s: string) => void) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const num = rawValue ? parseInt(rawValue, 10) / 100 : 0;
        setter(num);
        formatter(num === 0 ? '' : num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    };

    const loadImageAsBase64 = async (url: string): Promise<string> => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch { return ''; }
    };

    // --- GERAÇÃO DO PDF ---
    const handleSubmit = async () => {
        const finalInverter = inverter === "Outro" ? manualInverter : inverter;
        const finalPanel = panel === "Outro" ? manualPanel : panel;
        
        const precoTotal = kitValue + laborValue;
        const qtdP = overrideQtdP ? Number(overrideQtdP) : (calculatedQtdP || 0);
        const kwpFinal = (qtdP * Number(panelPower)) / 1000;
        const genEst = (kwpFinal * cityHsp * 30 * 0.80);
        
        // Simulação básica de economia
        const tarifa = 1.10; 
        const economiaMensal = genEst * tarifa;
        const paybackMeses = precoTotal / economiaMensal;

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
                                { label: 'Consumo', data: Array(12).fill(avgConsumption || 300), backgroundColor: companyConfig.chartColor1 },
                                { label: 'Geração', data: Array(12).fill(genEst), backgroundColor: companyConfig.chartColor2 }
                            ]
                        },
                        options: { animation: false }
                    });
                    
                    setTimeout(async () => {
                        const chartImg = chartInstanceRef.current?.toBase64Image() || '';
                        await generatePDF(chartImg, kwpFinal, qtdP, precoTotal, paybackMeses, finalInverter, finalPanel);
                    }, 500);
                }
            }
        }, 100);
    };

    const generatePDF = async (chartImg: string, kwp: number, qtd: number, preco: number, payback: number, invMarca: string, panMarca: string) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const theme = hexToRgb(companyConfig.themeColor);

        // Cabeçalho
        doc.setFillColor(...theme);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255);
        doc.setFontSize(18);
        doc.text(companyConfig.razao || "RD SOLAR", 15, 15);
        if(companyConfig.logo) doc.addImage(companyConfig.logo, 'PNG', 170, 5, 25, 20);

        // Conteúdo
        doc.setTextColor(40);
        doc.setFontSize(12);
        doc.text(`Cliente: ${clientName}`, 15, 45);
        doc.text(`Equipamento: ${qtd}x Painéis ${panMarca} | Inversor ${invMarca}`, 15, 55);
        doc.text(`Potência Total: ${kwp.toFixed(2)} kWp`, 15, 65);
        
        doc.addImage(chartImg, 'PNG', 15, 75, 180, 60);

        doc.setFontSize(14);
        doc.text(`Investimento Total: ${preco.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}`, 15, 150);
        doc.setFontSize(10);
        doc.text(`Payback Estimado: ${payback.toFixed(1)} meses`, 15, 160);

        doc.save(`Orçamento_${clientName}.pdf`);
    };

    return (
        <div className="bg-slate-100 min-h-screen p-4 sm:p-6 font-sans">
            <div className="container max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-2xl border border-slate-200">
                {/* Cabeçalho de Ações */}
                <div className="flex flex-wrap gap-2 mb-8">
                    <button onClick={() => setIsModalOpen(true)} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
                        ⚙️ Configurações
                    </button>
                    <button onClick={() => setIsLoadModalOpen(true)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
                        📂 Abrir Salvo
                    </button>
                </div>

                <h1 className="text-3xl font-black text-slate-800 mb-8 border-l-8 border-orange-600 pl-4">GERADOR DE ORÇAMENTO SOLAR</h1>

                {/* Seção Cliente */}
                <section className="space-y-4 bg-slate-50 p-6 rounded-2xl mb-8">
                    <h2 className="text-lg font-bold text-orange-700 uppercase tracking-widest mb-4">1. Informações do Cliente</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Nome Completo" value={clientName} onChange={e => setClientName(e.target.value)} className="p-4 rounded-xl border-2 border-slate-200 focus:border-orange-500 outline-none" />
                        <input type="text" placeholder="CPF ou CNPJ" value={clientDoc} onChange={e => setClientDoc(e.target.value)} className="p-4 rounded-xl border-2 border-slate-200 focus:border-orange-500 outline-none" />
                        <input type="text" placeholder="Endereço da Obra" value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="md:col-span-2 p-4 rounded-xl border-2 border-slate-200 focus:border-orange-500 outline-none" />
                    </div>
                </section>

                {/* Seção Técnica - Onde a mágica acontece */}
                <section className="space-y-6 mb-8">
                    <h2 className="text-lg font-bold text-orange-700 uppercase tracking-widest">2. Dimensionamento Técnico</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Seleção de Inversor */}
                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-slate-700">Marca do Inversor</label>
                            <select value={inverter} onChange={e => setInverter(e.target.value)} className="p-4 rounded-xl border-2 border-slate-200 bg-white">
                                {inversores.map(i => <option key={i.nome} value={i.nome}>{i.nome}</option>)}
                                <option value="Outro">Outro (Digitar Manualmente)</option>
                            </select>
                            {inverter === "Outro" && (
                                <input type="text" placeholder="Digite a marca do inversor" value={manualInverter} onChange={e => setManualInverter(e.target.value)} className="p-4 rounded-xl border-2 border-orange-400 mt-2 animate-pulse" />
                            )}
                        </div>

                        {/* Seleção de Painéis */}
                        <div className="flex flex-col gap-2">
                            <label className="font-bold text-slate-700">Marca dos Painéis</label>
                            <select value={panel} onChange={e => setPanel(e.target.value)} className="p-4 rounded-xl border-2 border-slate-200 bg-white">
                                {paineis.map(p => <option key={p.marca} value={p.marca}>{p.marca}</option>)}
                                <option value="Outro">Outro (Digitar Manualmente)</option>
                            </select>
                            {panel === "Outro" && (
                                <input type="text" placeholder="Digite a marca do painel" value={manualPanel} onChange={e => setManualPanel(e.target.value)} className="p-4 rounded-xl border-2 border-orange-400 mt-2 animate-pulse" />
                            )}
                        </div>
                    </div>
                </section>

                {/* Seção Financeira */}
                <section className="bg-orange-50 p-6 rounded-2xl mb-8 border-2 border-orange-200">
                    <h2 className="text-lg font-bold text-orange-700 uppercase tracking-widest mb-4">3. Investimento</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-orange-800">VALOR DO KIT (MATERIAIS)</label>
                            <input type="text" value={formattedKitValue} onChange={e => handleCurrencyChange(e, setKitValue, setFormattedKitValue)} placeholder="R$ 0,00" className="p-4 rounded-xl border-2 border-white shadow-inner text-xl font-bold" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-orange-800">MÃO DE OBRA (SERVIÇOS)</label>
                            <input type="text" value={formattedLaborValue} onChange={e => handleCurrencyChange(e, setLaborValue, setFormattedLaborValue)} placeholder="R$ 0,00" className="p-4 rounded-xl border-2 border-white shadow-inner text-xl font-bold" />
                        </div>
                    </div>
                </section>

                <button onClick={handleSubmit} className="w-full bg-green-600 text-white py-6 rounded-2xl font-black text-2xl shadow-xl hover:bg-green-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-4">
                    🚀 GERAR PROPOSTA AGORA
                </button>

                {/* Canvas oculto para o gráfico do PDF */}
                <div style={{ position: 'absolute', left: '-9999px' }}>
                    <canvas ref={chartCanvasRef} width="800" height="400" />
                </div>
            </div>

            {/* Modal de Configurações - Arquitetura de Software: Persistência em LocalStorage */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
                        <h2 className="text-2xl font-black mb-6">⚙️ CONFIGURAÇÕES</h2>
                        <div className="space-y-4">
                            <input type="text" placeholder="Razão Social" className="w-full p-4 border-2 rounded-xl" value={companyConfig.razao} onChange={e => setCompanyConfig({...companyConfig, razao: e.target.value})} />
                            <input type="text" placeholder="CNPJ" className="w-full p-4 border-2 rounded-xl" value={companyConfig.cnpj} onChange={e => setCompanyConfig({...companyConfig, cnpj: e.target.value})} />
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs font-bold">Cor Principal</label>
                                    <input type="color" className="w-full h-12 rounded-lg cursor-pointer" value={companyConfig.themeColor} onChange={e => setCompanyConfig({...companyConfig, themeColor: e.target.value})} />
                                </div>
                            </div>
                            <button onClick={() => {
                                localStorage.setItem('rd_solar_razao', companyConfig.razao);
                                localStorage.setItem('rd_solar_cnpj', companyConfig.cnpj);
                                localStorage.setItem('rd_solar_themeColor', companyConfig.themeColor);
                                setIsModalOpen(false);
                            }} className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold">SALVAR E FECHAR</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;