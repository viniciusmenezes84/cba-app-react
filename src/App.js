import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SITE_VERSION } from './siteVersion';
import AthleteDashboard from './AthleteDashboard';
import { InitialDataContext } from './InitialDataContext';
import { gatewayPost } from './cbaApi';
import { 
    Activity, CalendarDays, BookOpen, DollarSign, Users, PartyPopper, BarChart, BellRing, 
    X, Menu, Copy, LogOut, RefreshCw, Trophy, Flame, MapPin, ChevronDown, CheckCircle, AlertCircle, ClipboardList, Minus, Award, Crown, Star,
    Stethoscope, KeyRound, Home, Eye, EyeOff
} from 'lucide-react';
const AdminDashboardBridge = lazy(() => import('./AdminDashboardBridge'));
const PresenceDashboardBridge = lazy(() => import('./PresenceDashboardBridge'));
const ReportsDashboard = lazy(() => import('./ReportsDashboard'));
const HomeDashboard = lazy(() => import('./HomeDashboard'));
const ScheduleDashboard = lazy(() => import('./ScheduleDashboard'));
const MesarioDashboard = lazy(() => import('./MesarioDashboard'));
const SorteioDashboard = lazy(() => import('./SorteioDashboard'));
const DmDashboard = lazy(() => import('./DmDashboard'));
const PortalExperienceBridge = lazy(() => import('./PortalExperienceBridge'));

function ActiveBridges({ tab }) {
    return <Suspense fallback={null}>
        {['financas', 'halldafama', 'estatuto', 'notificacoes'].includes(tab) && <PortalExperienceBridge />}
    </Suspense>;
}

// Constantes Globais

// Funções puras de finanças
const getEnhancedStatus = (monthName, originalStatus) => {
    const statusStr = String(originalStatus || '').trim().toLowerCase();
    if (statusStr === 'isento') return { text: 'Isento', code: 'isento' };
    if (statusStr === '20') return { text: 'Pago', code: 'pago' };
    const monthMap = { "janeiro": 0, "fevereiro": 1, "março": 2, "abril": 3, "maio": 4, "junho": 5, "julho": 6, "agosto": 7, "setembro": 8, "outubro": 9, "novembro": 10, "dezembro": 11 };
    if (monthMap[monthName.toLowerCase()] < new Date().getMonth()) return { text: 'Em Atraso', code: 'atraso' };
    return { text: 'Pendente', code: 'pendente' };
};

const calculatePlayerDebt = (player, financeData) => {
    if(!financeData?.paymentHeaders || !player) return 0;
    let debt = 0;
    financeData.paymentHeaders.forEach(m => {
        if(getEnhancedStatus(m, player.statuses[m]).code === 'atraso') debt += 20;
    });
    return debt;
};

// --- CONTEXTO DE TEMA ---
const ThemeProvider = ({ children }) => {
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light');
        root.classList.add('dark');
    }, []);
    return children;
};

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Erro não tratado capturado pelo ErrorBoundary:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
                    <div className="max-w-md w-full text-center bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl">
                        <AlertCircle className="w-14 h-14 text-rose-500 mx-auto mb-4" />
                        <h1 className="text-xl font-black mb-2">Algo deu errado</h1>
                        <p className="text-slate-400 text-sm mb-6">Ocorreu um erro inesperado nesta tela. Você pode tentar recarregar o app.</p>
                        <button onClick={this.handleReload} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors">
                            Recarregar
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- UTILITÁRIOS DE API CENTRALIZADOS ---
const api = {
    post: (params, signal) => gatewayPost(params.action, params, { signal })
};

// --- CUSTOM HOOK PARA CACHE E DESEMPENHO ---
function useDataQuery(queryFn, dependencies = []) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const queryRef = useRef(queryFn);
    const controllerRef = useRef(null);
    queryRef.current = queryFn;
    const dependencyKey = JSON.stringify(dependencies);

    const fetchData = useCallback(async () => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setIsLoading(true);
        setError(null);
        try {
            const result = await queryRef.current(controller.signal);
            if (!controller.signal.aborted) setData(result);
        } catch (err) {
            if (!controller.signal.aborted && err?.name !== 'AbortError') setError(err.message || "Erro desconhecido ao buscar dados.");
        } finally {
            if (controllerRef.current === controller && !controller.signal.aborted) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        return () => controllerRef.current?.abort();
    }, [fetchData, dependencyKey]);

    return { data, isLoading, error, refetch: fetchData };
}

// --- UTILITÁRIO MODERNO DE CLIPBOARD ---
const copyToClipboard = async (text) => {
    try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        }
    } catch (err) {
        console.error('Erro ao copiar', err);
        return false;
    }
};

// --- COMPONENTES UI OTIMIZADOS COM FRAMER MOTION ---
const GlassCard = ({ children, className = '', onClick }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            onClick={onClick} 
            className={`bg-white/80 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-xl rounded-3xl p-6 ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''} ${className}`}
        >
            {children}
        </motion.div>
    );
};

const Loader = ({ message }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col justify-center items-center py-20 text-center text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        {message && <p className="text-lg font-medium animate-pulse">{message}</p>}
    </motion.div>
);

const AccordionItem = ({ title, children, isOpen, onClick }) => {
    return (
        <div className="border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden mb-4 bg-white/50 dark:bg-slate-800/30">
            <button className="flex justify-between items-center w-full p-5 font-semibold text-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors" onClick={onClick}>
                <span>{title}</span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}><ChevronDown className="w-5 h-5" /></motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                        <div className="p-6 prose dark:prose-invert max-w-none border-t border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- AUTENTICAÇÃO ---
const LoginScreen = ({ onLogin, isLoading, error }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Fundo temático CBA: quadra escura, glow verde e marca d'água */}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#020617_0%,#061126_48%,#020617_100%)]"></div>
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-28 -left-28 w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full bg-emerald-500/10 blur-3xl"></div>
                <div className="absolute top-[18%] -right-28 w-96 h-96 sm:w-[34rem] sm:h-[34rem] rounded-full bg-emerald-400/[0.08] blur-3xl"></div>
                <div className="absolute -bottom-36 left-[28%] w-80 h-80 sm:w-[30rem] sm:h-[30rem] rounded-full bg-emerald-500/[0.06] blur-3xl"></div>
            </div>

            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <img
                    src="https://lh3.googleusercontent.com/d/131DvcfgiRLLp9irVnVY8m9qNuM-0y7f8"
                    alt=""
                    aria-hidden="true"
                    className="absolute right-4 bottom-4 sm:right-8 sm:bottom-8 lg:right-10 lg:bottom-10 w-[120px] sm:w-[170px] lg:w-[220px] opacity-[0.11] sm:opacity-[0.13] select-none"
                />
            </div>

            <div className="absolute inset-0 pointer-events-none opacity-[0.12]">
                <div className="absolute inset-5 sm:inset-9 lg:inset-12 border border-emerald-300/30 rounded-[28px] sm:rounded-[36px]"></div>
                <div className="absolute top-5 bottom-5 sm:top-9 sm:bottom-9 lg:top-12 lg:bottom-12 left-1/2 -translate-x-1/2 w-px bg-emerald-300/30"></div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-full border border-emerald-300/30"></div>

                <div className="absolute left-5 sm:left-9 lg:left-12 top-1/2 -translate-y-1/2 w-16 sm:w-24 lg:w-32 h-36 sm:h-48 lg:h-60 border border-emerald-300/30 rounded-r-2xl"></div>
                <div className="absolute right-5 sm:right-9 lg:right-12 top-1/2 -translate-y-1/2 w-16 sm:w-24 lg:w-32 h-36 sm:h-48 lg:h-60 border border-emerald-300/30 rounded-l-2xl"></div>

                <div className="hidden sm:block absolute left-[5.4rem] lg:left-[8.7rem] top-1/2 -translate-y-1/2 w-16 h-16 lg:w-20 lg:h-20 rounded-full border border-emerald-300/25"></div>
                <div className="hidden sm:block absolute right-[5.4rem] lg:right-[8.7rem] top-1/2 -translate-y-1/2 w-16 h-16 lg:w-20 lg:h-20 rounded-full border border-emerald-300/25"></div>

                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-28 sm:w-44 lg:w-56 h-56 sm:h-72 lg:h-[22rem] rounded-r-full border border-l-0 border-emerald-300/20"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-28 sm:w-44 lg:w-56 h-56 sm:h-72 lg:h-[22rem] rounded-l-full border border-r-0 border-emerald-300/20"></div>
            </div>

            <div
                className="absolute inset-0 pointer-events-none opacity-[0.035]"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.72) 1px, transparent 0)',
                    backgroundSize: '18px 18px'
                }}
            ></div>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"></div>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative z-10 p-6 sm:p-9 bg-slate-900/85 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl w-full max-w-md">
                <div className="text-center">
                    <img src="https://lh3.googleusercontent.com/d/131DvcfgiRLLp9irVnVY8m9qNuM-0y7f8" alt="Logo CBA" className="h-24 w-24 rounded-full shadow-2xl mx-auto mb-5 ring-4 ring-emerald-500/10" />
                    <div className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">Área restrita</div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white mt-3 tracking-tight">Portal do CBA</h1>
                    <p className="text-slate-400 mt-1 mb-7 font-medium">Basquete dos Aposentados</p>
                </div>
                {error && <p className="bg-rose-500/10 border border-rose-500/30 text-rose-200 p-3 rounded-xl mb-5 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0"/>{error}</p>}
                <form onSubmit={onLogin} className="space-y-4">
                    <label className="block">
                        <span className="block text-[10px] uppercase tracking-wider font-black text-slate-500 mb-1.5">E-mail</span>
                        <input id="login-email" name="email" type="email" autoComplete="email" placeholder="seuemail@gmail.com" className="w-full p-4 bg-slate-950/70 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none" required />
                    </label>
                    <label className="block">
                        <span className="block text-[10px] uppercase tracking-wider font-black text-slate-500 mb-1.5">Senha</span>
                        <div className="relative">
                            <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Sua senha" className="w-full p-4 pr-12 bg-slate-950/70 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none" required />
                            <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800">{showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
                        </div>
                    </label>
                    <button type="submit" disabled={isLoading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-lg shadow-emerald-950/30 disabled:opacity-70 transition-transform active:scale-[.99]">
                        {isLoading ? 'Autenticando...' : 'Entrar no Portal'}
                    </button>
                </form>
                <button type="button" onClick={() => setShowHelp(v => !v)} className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-300 mt-4">Esqueci minha senha</button>
                {showHelp && <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-400 text-center">Solicite a redefinição de senha a um administrador do CBA. O autoatendimento por e-mail será ativado quando o serviço de e-mail estiver configurado.</div>}
                <p className="mt-6 text-center text-[10px] tracking-wide text-slate-500" aria-label={`Versão do Portal CBA ${SITE_VERSION}`}>Portal CBA · v{SITE_VERSION}</p>
            </motion.div>
        </div>
    );
};

// --- COMPONENTES ESPECÍFICOS DAS ABAS ---
const ProximoJogoCard = ({ game, currentUser, onAttendanceUpdate }) => {
    if (!game) {
        return (
            <GlassCard className="text-center bg-gradient-to-br from-indigo-50/50 to-white/50 dark:from-slate-800/80 dark:to-slate-800/50">
                <h2 className="text-2xl font-black mb-2 text-slate-800 dark:text-slate-100">Nenhum jogo agendado</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Descanse! Fique atento para novas marcações.</p>
            </GlassCard>
        );
    }
    const isConfirmed = game.confirmados.includes(currentUser.name);
    const gameDate = new Date(game.data + 'T' + game.horario);

    return (
        <GlassCard className="relative overflow-hidden bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/90 dark:to-slate-800/60 border-l-4 border-l-indigo-500">
            <h2 className="text-xl text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider mb-4 flex items-center gap-2"><Trophy className="w-5 h-5"/> Próximo Jogo</h2>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-3 w-full md:w-auto relative z-10">
                    <div className="flex items-center text-slate-800 dark:text-slate-100 gap-3">
                        <CalendarDays className="w-6 h-6 text-slate-500" />
                        <span className="text-xl font-bold">{gameDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })} às {game.horario}</span>
                    </div>
                    <div className="flex items-center text-slate-600 dark:text-slate-300 gap-3">
                        <MapPin className="w-6 h-6 text-slate-500" />
                        <span className="text-lg font-medium">{game.local}</span>
                    </div>
                    <div className="flex items-center text-slate-600 dark:text-slate-300 gap-3">
                        <Flame className="w-6 h-6 text-orange-500" />
                        <span className="text-lg font-medium"><strong className="text-indigo-600 dark:text-indigo-400">{game.confirmados.length}</strong> Confirmados</span>
                    </div>
                </div>
                <div className="w-full md:w-64 shrink-0 z-10">
                    {isConfirmed ? (
                        <button onClick={() => onAttendanceUpdate(game.id, 'withdraw')} className="w-full font-bold py-4 px-6 rounded-2xl transition-all bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white shadow-lg flex items-center justify-center gap-2">
                            <X className="w-5 h-5"/> Desistir
                        </button>
                    ) : (
                        <button onClick={() => onAttendanceUpdate(game.id, 'confirm')} className="w-full font-bold py-4 px-6 rounded-2xl transition-all bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5"/> Estou Dentro!
                        </button>
                    )}
                </div>
            </div>
        </GlassCard>
    );
};

// ==========================================
// --- ABAS DA APLICAÇÃO ---
// ==========================================

// 1. ABA PRESENÇA
const PresencaTab = ({ nextGame, currentUser, onAttendanceUpdate }) => (
    <div className="space-y-6">
        <ProximoJogoCard game={nextGame} currentUser={currentUser} onAttendanceUpdate={onAttendanceUpdate} />
        <Suspense fallback={<Loader message="Carregando presença..." />}>
            <PresenceDashboardBridge />
        </Suspense>
    </div>
);

// 3. ABA FINANÇAS
const FinancasTab = ({ financeData, isLoading, error, currentUser, isAdmin, pixCode }) => {
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [emailMessage, setEmailMessage] = useState({ text: '', type: '' });
    const [copySuccess, setCopySuccess] = useState('');

    useEffect(() => {
        if (!financeData?.paymentStatus?.length) return;
        if (isAdmin) setSelectedPlayer(financeData.paymentStatus[0].player);
        else setSelectedPlayer(financeData.paymentStatus.find(p => p.player.toLowerCase() === currentUser.name.toLowerCase())?.player || '');
    }, [financeData, isAdmin, currentUser.name]);

    const adminStats = useMemo(() => {
        if(!financeData?.paymentStatus) return { totalReceber: 0, inadimplentes: [] };
        let totalReceber = 0; let inadimplentes = [];
        financeData.paymentStatus.forEach(p => {
            const debt = calculatePlayerDebt(p, financeData);
            if (debt > 0) { totalReceber += debt; inadimplentes.push({ name: p.player, debt }); }
        });
        inadimplentes.sort((a,b) => b.debt - a.debt);
        return { totalReceber, inadimplentes };
    }, [financeData]);

    const handleSendReports = async () => {
        setIsSending(true); setEmailMessage({ text: 'Enviando e-mails...', type: 'info' });
        try {
            const data = await api.post({ action: 'sendFinanceReports' });
            if (data.result === 'success') setEmailMessage({ text: data.message, type: 'success' });
            else throw new Error(data.message);
        } catch (err) { setEmailMessage({ text: `Erro: ${err.message}`, type: 'error' }); } 
        finally { setIsSending(false); }
    };

    const handleCopyPix = async () => {
        const success = await copyToClipboard(pixCode);
        if (success) { setCopySuccess('Copiado!'); setTimeout(() => setCopySuccess(''), 2000); }
    };

    if (isLoading) return <Loader message="Sincronizando cofre..." />;
    if (error) return <p className="text-center text-red-500 py-8">{typeof error === 'object' ? error.message : error}</p>;
    if (!financeData) return <p className="text-center text-slate-500 py-8">Nenhum dado financeiro encontrado.</p>;

    const playerData = financeData.paymentStatus?.find(p => p.player === selectedPlayer);
    const playerDebt = calculatePlayerDebt(playerData, financeData);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="bg-indigo-600 !text-white text-center"><h3 className="font-bold text-sm uppercase opacity-80">Saldo em Caixa</h3><p className="text-4xl font-black mt-1">R$ {financeData.summary.balance.toFixed(2)}</p></GlassCard>
                <GlassCard className="text-center"><h3 className="text-slate-500 font-bold text-sm uppercase">Total Receitas</h3><p className="text-3xl font-bold text-emerald-500 mt-1">R$ {financeData.summary.revenue.toFixed(2)}</p></GlassCard>
                <GlassCard className="text-center"><h3 className="text-slate-500 font-bold text-sm uppercase">Total Despesas</h3><p className="text-3xl font-bold text-rose-500 mt-1">R$ {financeData.summary.expense.toFixed(2)}</p></GlassCard>
            </div>

            {isAdmin && (
                <GlassCard className="border-orange-500/30">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Painel de Cobrança</h3>
                        <span className="px-4 py-1 bg-orange-100 text-orange-700 rounded-full font-bold">A Receber: R$ {adminStats.totalReceber.toFixed(2)}</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto pr-2">
                        {adminStats.inadimplentes.length === 0 ? <p className="text-emerald-500 font-bold">Todos em dia! 🎉</p> : 
                        <ul className="space-y-3">
                            {adminStats.inadimplentes.map(p => (
                                <li key={p.name} className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                                    <span className="text-rose-500 font-bold">R$ {p.debt.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={handleSendReports} disabled={isSending} className="w-full bg-cyan-600 text-white font-bold py-3 rounded-xl hover:bg-cyan-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            {isSending ? <RefreshCw className="animate-spin w-5 h-5"/> : 'Enviar Relatório por Email'}
                        </button>
                        {emailMessage.text && <p className={`mt-2 text-sm text-center font-bold ${emailMessage.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>{emailMessage.text}</p>}
                    </div>
                </GlassCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <GlassCard className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Situação Anual</h2>
                        {isAdmin && <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold outline-none">{financeData.paymentStatus?.map(p => <option key={p.player} value={p.player}>{p.player}</option>)}</select>}
                    </div>

                    {playerData && (
                        <div>
                            {playerDebt > 0 && (
                                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50 rounded-2xl flex items-center justify-between">
                                    <div><h4 className="text-rose-700 dark:text-rose-400 font-bold text-lg">Atenção! Há pendências.</h4><p className="text-sm text-rose-600/80 dark:text-rose-400/80">Regularize sua situação para não perder benefícios.</p></div>
                                    <span className="text-3xl font-black text-rose-700 dark:text-rose-400">R$ {playerDebt.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                                {financeData.paymentHeaders?.map(month => {
                                    const status = getEnhancedStatus(month, playerData.statuses[month]);
                                    const styles = {
                                        pago: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400',
                                        atraso: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400',
                                        pendente: 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700/50 dark:text-slate-400',
                                        isento: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800/50 dark:text-indigo-400'
                                    };
                                    return (
                                        <motion.div whileHover={{ scale: 1.05 }} key={month} className={`flex flex-col p-4 rounded-2xl border shadow-sm ${styles[status.code]}`}>
                                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-2">{month}</span>
                                            <span className="font-black text-sm leading-tight">{status.text}</span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </GlassCard>

                <GlassCard className="flex flex-col items-center text-center bg-indigo-600 !text-white relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10 w-full">
                        <h2 className="text-2xl font-bold mb-2">Quitar Débitos</h2>
                        <p className="text-indigo-200 text-sm mb-6">Use o PIX oficial do CBA.</p>
                        <div className="bg-white p-3 rounded-2xl mb-6 shadow-2xl inline-block"><img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(pixCode)}&size=160x160`} alt="QR Code PIX" className="w-40 h-40 rounded-xl" /></div>
                        <div className="w-full bg-indigo-800/50 p-4 rounded-2xl flex gap-2 border border-indigo-500/30">
                            <input type="text" readOnly value={pixCode} className="w-full bg-transparent text-sm outline-none truncate" />
                            <button onClick={handleCopyPix} aria-label="Copiar código Pix" className="p-2 bg-indigo-500 rounded-lg hover:bg-indigo-400 transition-colors"><Copy className="w-4 h-4"/></button>
                        </div>
                        {copySuccess && <p className="text-emerald-400 text-xs font-bold mt-2">{copySuccess}</p>}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

// 7. ABA ESTATUTO
const EstatutoTab = () => {
    const [openAccordion, setOpenAccordion] = useState('Regulamento Geral do CBA');
    const toggleAccordion = (title) => setOpenAccordion(openAccordion === title ? null : title);

    const estatutoItens = [
        {
            title: "Regulamento Geral do CBA",
            content: (
                <>
                    <h3 className="font-bold text-lg">CBA – BASQUETE DOS APOSENTADOS</h3>
                    <p><strong>PRESIDENTE:</strong> NEILOR</p>
                    <p><strong>COMPOSIÇÃO DIRETORIA:</strong> ARCANJO, GONZAGA, NEILOR, PORTUGAL, VINICIUS, MILHO, ANDRE DIAS</p>
                    <p className="mt-2 text-indigo-600 dark:text-indigo-400"><strong>CHAVE PIX PAGAMENTO CNPJ:</strong> 36.560.422/0001-69 (NEILOR – NUNBANK)</p>
                    <p className="mb-4">COMPROVANTE DEVERÁ SER ENVIADO NO PRIVADO DE NEILOR.</p>

                    <h4 className="font-bold mt-4">1- MENSALIDADE</h4>
                    <ul className="list-disc list-inside">
                        <li>VALOR R$ 20,00 até dia 10 de cada mês;</li>
                        <li>Controle financeiro – Neilor;</li>
                    </ul>

                    <h4 className="font-bold mt-4 text-red-500">2- PENALIDADES</h4>
                    <ul className="list-disc list-inside">
                        <li>Briga – expulsão do basquete dos aposentados;</li>
                        <li>Xingamentos direcionados – advertências verbal;</li>
                        <li>Inclusão de nome na lista e não ir(falta injustificada) – 1 domingo suspenso;</li>
                        <li>Falta grave intencional( NÃO PODE EXISTIR) – avaliar no dia, em caso de reincidência 1 domingo suspenso;</li>
                        <li>Atraso não justificado(30 minutos tolerância) – Irá aguardar 2 “babas”;</li>
                        <li>Obrigatório utilização de calçado(tênis) para jogar;</li>
                        <li>Utilização de camisa e bermuda nas dependências da Vila Militar;</li>
                    </ul>

                    <h4 className="font-bold mt-4">3- CONFRATERNIZAÇÃO</h4>
                    <ul className="list-disc list-inside">
                        <li>A cada 2 meses conforme disponibilidade financeira;</li>
                        <li>A mega festa do final ano, juntamente com o torneio;</li>
                    </ul>

                    <h4 className="font-bold mt-4">4- PADRÃO</h4>
                    <ul className="list-disc list-inside">
                        <li>Prazo de troca do padrão – 2 anos (data base setembro);</li>
                        <li>Convidado irá utilizar colete (preto e vermelho). O responsável pelo convidado irá lavar.
                            <ul className="list-disc list-inside ml-6 text-sm">
                                <li>Na falta do colete, o convidado deverá estar de camisa preta ou vermelha;</li>
                            </ul>
                        </li>
                        <li>Utilização de bermuda PRETA ou o mais escura possível;</li>
                    </ul>

                    <h4 className="font-bold mt-4">5- CONVIDADO</h4>
                    <ul className="list-disc list-inside">
                        <li>Limitado a 2 convites, após só com efetivação;</li>
                        <li>Limitador na lista até sexta. Atingindo o quórum de 15 efetivos, não haverá convidado;</li>
                        <li>Convidados deverão ter acima de 30 anos ou estar no perfil do CBA;</li>
                        <li>Permissão de 2 convidados por domingo – Considerando taxa de manutenção paga pelo mensalista responsável de R$ 10,00;</li>
                    </ul>

                    <h4 className="font-bold mt-4">6- PARA PERMANENCIA NO CBA DEVERÁ:</h4>
                    <ul className="list-disc list-inside">
                        <li>Manter assiduidade. Exclusão do grupo irá ocorrer após 2 meses de inatividade;</li>
                        <li>A inatividade poderá ser levada em conta no período de até 4 meses;</li>
                        <li>Inadimplência por 3 meses, irá ocorrer a exclusão;</li>
                    </ul>

                    <h4 className="font-bold mt-4">7- EXCEÇÕES</h4>
                    <ul className="list-disc list-inside">
                        <li>Soldados e Oficiais da Policia Militar;</li>
                        <li>Não atingindo o quórum mínimo (15 mensalistas) e os convidados estarem fora do padrão, será analisado caso a caso;</li>
                        <li>Referente a assiduidade, irá ser analisado caso de impossibilidade real de presença.</li>
                    </ul>
                </>
            )
        },
        {
            title: "Ata de Reunião - 06/01/2025",
            content: (
                 <>
                    <h3 className="font-bold">Ata de Reunião - CBA</h3>
                    <p><strong>Data:</strong> 06/01/2025 | <strong>Local:</strong> Reunião Online</p>
                    <p><strong>Presidente:</strong> Neilor Leite | <strong>Vice-presidente:</strong> Lucas Portugal</p>

                    <h4 className="font-bold mt-4">Resoluções:</h4>
                    <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Prestação de Contas:</strong> O Sr. Neilor será responsável por realizar a prestação de contas.</li>
                        <li><strong>Verificação de Orçamento:</strong> Consulta ao fabricante para obtenção de um novo orçamento de uniformes atualizado.</li>
                        <li><strong>Site do CBA:</strong> O site (www.basquetedosaposentados.com.br) foi criado. É necessário alimentar o cadastro.</li>
                        <li><strong>Controle de Presença:</strong> Cumprir uma frequência mínima de 50% dos jogos a cada 60 dias.</li>
                        <li><strong>Política de Cota:</strong> Cota especial (até 360 dias) para jogadores que comprovarem situação de desemprego.</li>
                        <li><strong>Confraternização Periódica:</strong> Realizada a cada 90 dias com fundo do caixa do CBA.</li>
                    </ol>
                </>
            )
        },
        {
            title: "Ata de Reunião - 02/04/2025",
            content: (
                <>
                    <h3 className="font-bold">Ata de Reunião - CBA</h3>
                    <p>Reiteração e acompanhamento dos tópicos abordados em Janeiro/2025. Prazos e metas revistas pela diretoria.</p>
                </>
            )
        },
        {
            title: "Ata de Reunião - 10/05/2025",
            content: (
                 <>
                    <h3 className="font-bold">Ata de Reunião - CBA</h3>
                    <p><strong>Data:</strong> 10/05/2025 | <strong>Local:</strong> Reunião Online</p>

                    <h4 className="font-bold mt-4">Resoluções:</h4>
                    <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Uniformes:</strong> A partir de 12/05/2025 será realizada a solicitação dos novos uniformes. Prazo estipulado para entrega é de 30 dias.</li>
                        <li><strong>Assiduidade:</strong> Constatado que a maioria possui assiduidade inferior a 50%. A diretoria deliberou pela adição de 4 novos jogadores. Nenhum jogador será excluído neste momento.</li>
                        <li><strong>Datas especiais:</strong> Mínimo de 12 jogadores confirmados até sexta-feira às 18h, caso contrário o domingo é cancelado.</li>
                        <li><strong>Arbitragem:</strong> Partidas contarão com dois árbitros se o quórum for alcançado.</li>
                        <li><strong>Tempo:</strong> Por ser amistoso, não será aplicada a contagem de tempo técnicos (8/24/3s). Lances livres permitidos em caso de falta que justifique.</li>
                    </ol>
                </>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            <GlassCard>
                <h2 className="text-3xl font-bold mb-6 text-center text-slate-800 dark:text-slate-100">Estatuto e Documentos Oficiais</h2>
                <div className="space-y-2">
                    {estatutoItens.map((item) => (
                        <AccordionItem key={item.title} title={item.title} isOpen={openAccordion === item.title} onClick={() => toggleAccordion(item.title)}>
                            {item.content}
                        </AccordionItem>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
};

// 8. ABA NOTIFICAÇÕES (COM HISTÓRICO RESTAURADO)
const NotificacoesTab = () => {
    const { data: notifData, isLoading, error, refetch } = useDataQuery((signal) => api.post({ action: 'getNotifications' }, signal), []);

    const notifications = useMemo(() => {
        if (!notifData?.data && !notifData) return [];
        const dataArray = notifData?.data || notifData;
        return [...dataArray].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [notifData]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState({ message: '', type: '' });
    const [targetTab, setTargetTab] = useState('presenca'); 

    const handleFormSubmit = async (e) => {
        e.preventDefault(); 
        setIsSubmitting(true); 
        setSubmitStatus({ message: '', type: '' });
        const formData = new FormData(e.currentTarget);
        
        try {
            const data = await api.post({
                action: 'sendPushNotificationToAll', 
                title: formData.get('title'), 
                message: formData.get('message'), 
                targetTab: targetTab 
            });
            
            if (data.result === 'success') { 
                setSubmitStatus({ message: 'Notificação enviada com sucesso ao servidor Push!', type: 'success' }); 
                e.target.reset(); 
                refetch(); 
            } else {
                throw new Error(data.message || 'Erro desconhecido ao tentar notificar.');
            }
        } catch (error) { 
            setSubmitStatus({ message: error.message, type: 'error' }); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    return (
        <div className="space-y-8 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
            <GlassCard>
                <div className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <BellRing className="w-6 h-6 text-indigo-500" /> Disparar Push
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Atinge todos os utilizadores com a App mobile instalada.</p>
                </div>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="notif-title" className="block text-xs font-bold uppercase text-slate-500 mb-1">Título do Alerta</label>
                        <input id="notif-title" name="title" type="text" placeholder="Ex: Novo Jogo Confirmado!" className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-white" required />
                    </div>
                    <div>
                        <label htmlFor="notif-message" className="block text-xs font-bold uppercase text-slate-500 mb-1">Corpo da Mensagem</label>
                        <textarea id="notif-message" name="message" placeholder="Escreva a mensagem..." className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white resize-none" rows={4} required></textarea>
                    </div>
                    <div>
                        <label htmlFor="notif-target" className="block text-xs font-bold uppercase text-slate-500 mb-2">Ao clicar, abrir na aba:</label>
                        <select id="notif-target" value={targetTab} onChange={(e) => setTargetTab(e.target.value)} className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="presenca">Presença</option>
                            <option value="jogos">Jogos</option>
                            <option value="eventos">Eventos</option>
                            <option value="financas">Finanças</option>
                            <option value="sorteio">Sorteio</option>
                            <option value="estatuto">Estatuto</option>
                        </select>
                    </div>
                    {submitStatus.message && (
                        <div className={`p-4 rounded-xl font-bold text-sm text-center ${submitStatus.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                            {submitStatus.message}
                        </div>
                    )}
                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/30 mt-4">
                        {isSubmitting ? 'Enviando pacote...' : 'Enviar Alerta Push'}
                    </button>
                </form>
            </GlassCard>

            <GlassCard>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Últimos Disparos</h2>
                {isLoading ? <Loader /> : error ? <p className="text-center text-red-500 py-8">{typeof error === 'object' ? error.message : error}</p> : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {notifications.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                Nenhum envio registado no sistema.
                            </div>
                        ) : notifications.map((notif, idx) => (
                            <div key={notif.id ?? `${notif.timestamp}-${idx}`} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-black text-slate-800 dark:text-white text-lg leading-tight">{notif.title}</h3>
                                    <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">Aba: {notif.targetTab || 'N/D'}</span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 text-sm">{notif.message}</p>
                                <p className="text-xs font-bold text-slate-400 mt-4 border-t border-slate-200 dark:border-slate-700 pt-2">
                                    {new Date(notif.timestamp).toLocaleString('pt-BR')}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>
        </div>
    );
};

// 10. ABA HALL DA FAMA
const HallDaFamaTab = ({ allPlayersData, dates }) => {
    
    // Cálculo dos líderes All-Time (Histórico Geral)
    const allTimeStats = useMemo(() => {
        if (!allPlayersData || allPlayersData.length === 0) return [];
        
        let stats = allPlayersData.map(p => {
            let totalPts = 0, totalReb = 0, totalAst = 0, totalBlk = 0;
            let presences = 0;
            
            // Somatório de presenças (✅)
            if (p.attendance) {
                Object.values(p.attendance).forEach(status => {
                    if (String(status).includes('✅')) presences++;
                });
            }

            // Somatório de estatísticas (dailyStats)
            if (p.dailyStats) {
                Object.values(p.dailyStats).forEach(st => {
                    totalPts += (st.pts2 * 2) + (st.pts3 * 3);
                    totalReb += st.reb || 0;
                    totalAst += st.ast || 0;
                    totalBlk += st.blk || 0;
                });
            }
            
            return { ...p, presences, totalPts, totalReb, totalAst, totalBlk };
        });

        return stats;
    }, [allPlayersData]);

    const getTopPlayer = (key) => {
        if (allTimeStats.length === 0) return null;
        const sorted = [...allTimeStats].sort((a, b) => b[key] - a[key]);
        return sorted[0][key] > 0 ? sorted[0] : null;
    };

    const topAssiduidade = getTopPlayer('presences');
    const topPontos = getTopPlayer('totalPts');
    const topRebotes = getTopPlayer('totalReb');
    const topAst = getTopPlayer('totalAst');
    const topBlk = getTopPlayer('totalBlk');

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            <GlassCard className="text-center bg-gradient-to-br from-yellow-500 to-amber-600 !text-white border-none shadow-2xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-900/40 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 py-6">
                    <Crown className="w-20 h-20 mx-auto mb-4 text-yellow-200 drop-shadow-md" />
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-widest drop-shadow-lg">Hall da Fama</h2>
                    <p className="text-yellow-100 mt-3 font-medium text-lg max-w-2xl mx-auto">
                        O mural definitivo com as maiores lendas e os recordistas absolutos da história do Basquete dos Aposentados.
                    </p>
                </div>
            </GlassCard>
            
            <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                    <Trophy className="w-5 h-5 text-yellow-500"/> Recordistas (Histórico Geral)
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* Cestinha */}
                    <GlassCard className="relative overflow-hidden border-t-4 border-t-orange-500 bg-gradient-to-b from-white to-orange-50 dark:from-slate-800 dark:to-orange-950/20">
                        <div className="absolute top-4 right-4 bg-orange-100 dark:bg-orange-900/50 p-2 rounded-full">
                            <Flame className="w-6 h-6 text-orange-500" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cestinha de Ouro</p>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1 mb-6 truncate">{topPontos?.name || '---'}</h4>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-orange-500">{topPontos?.totalPts || 0}</span>
                            <span className="text-sm font-bold text-slate-500 pb-1">Pontos</span>
                        </div>
                    </GlassCard>

                    {/* MVP Assiduidade */}
                    <GlassCard className="relative overflow-hidden border-t-4 border-t-blue-500 bg-gradient-to-b from-white to-blue-50 dark:from-slate-800 dark:to-blue-950/20">
                        <div className="absolute top-4 right-4 bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
                            <Star className="w-6 h-6 text-blue-500" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">MVP Assiduidade</p>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1 mb-6 truncate">{topAssiduidade?.name || '---'}</h4>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-blue-500">{topAssiduidade?.presences || 0}</span>
                            <span className="text-sm font-bold text-slate-500 pb-1">Jogos</span>
                        </div>
                    </GlassCard>

                    {/* Rei dos Rebotes */}
                    <GlassCard className="relative overflow-hidden border-t-4 border-t-emerald-500 bg-gradient-to-b from-white to-emerald-50 dark:from-slate-800 dark:to-emerald-950/20">
                        <div className="absolute top-4 right-4 bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-full">
                            <Award className="w-6 h-6 text-emerald-500" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rei do Garrafão</p>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1 mb-6 truncate">{topRebotes?.name || '---'}</h4>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-emerald-500">{topRebotes?.totalReb || 0}</span>
                            <span className="text-sm font-bold text-slate-500 pb-1">Rebotes</span>
                        </div>
                    </GlassCard>

                    {/* Garçom */}
                    <GlassCard className="relative overflow-hidden border-t-4 border-t-cyan-500 bg-gradient-to-b from-white to-cyan-50 dark:from-slate-800 dark:to-cyan-950/20 lg:col-start-1 lg:col-span-1">
                        <div className="absolute top-4 right-4 bg-cyan-100 dark:bg-cyan-900/50 p-2 rounded-full">
                            <Users className="w-6 h-6 text-cyan-500" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">O Garçom</p>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1 mb-6 truncate">{topAst?.name || '---'}</h4>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-cyan-500">{topAst?.totalAst || 0}</span>
                            <span className="text-sm font-bold text-slate-500 pb-1">Assistências</span>
                        </div>
                    </GlassCard>

                    {/* Muralha */}
                    <GlassCard className="relative overflow-hidden border-t-4 border-t-purple-500 bg-gradient-to-b from-white to-purple-50 dark:from-slate-800 dark:to-purple-950/20">
                        <div className="absolute top-4 right-4 bg-purple-100 dark:bg-purple-900/50 p-2 rounded-full">
                            <Minus className="w-6 h-6 text-purple-500 rotate-90" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">A Muralha</p>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1 mb-6 truncate">{topBlk?.name || '---'}</h4>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-purple-500">{topBlk?.totalBlk || 0}</span>
                            <span className="text-sm font-bold text-slate-500 pb-1">Tocos</span>
                        </div>
                    </GlassCard>
                </div>
            </div>

            <div className="mt-12">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                    <BookOpen className="w-5 h-5 text-slate-500"/> Lendas Eternizadas (Mural)
                </h3>
                <GlassCard className="bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-3xl pointer-events-none"></div>
                    <Award className="w-16 h-16 text-slate-700 mb-4" />
                    <p className="text-slate-400 font-medium text-lg max-w-lg">
                        Este espaço está reservado para homenagear os fundadores e atletas que deixaram a sua marca na história do CBA. 
                    </p>
                    <p className="text-slate-600 font-bold text-sm mt-4 uppercase tracking-widest">
                        Em breve: Cerimónia de Aposentação de Camisas
                    </p>
                </GlassCard>
            </div>
        </div>
    );
};

// --- MAIN APP ---
const MainApp = ({ user, onLogout, logoutPending }) => {
    const [activeTab, setActiveTab] = useState(() => {
        try {
            const saved = localStorage.getItem('cba_last_tab_v1');
            return saved || 'inicio';
        } catch { return 'inicio'; }
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const mainScrollRef = useRef(null);
    const [adminOpen, setAdminOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordStatus, setPasswordStatus] = useState({ loading: false, error: '' });

    const { data: initialData, isLoading, error: dataError, refetch } = useDataQuery(
        (signal) => api.post({ action: 'getInitialAppData' }, signal),
        [refreshTrigger]
    );
    
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    
    const TABS = useMemo(() => isAdmin ? ['inicio', 'presenca', 'relatorios', 'atleta', 'mesario', 'financas', 'jogos', 'eventos', 'sorteio', 'dm', 'halldafama', 'estatuto', 'notificacoes'] : ['inicio', 'presenca', 'relatorios', 'atleta', 'financas', 'jogos', 'eventos', 'sorteio', 'dm', 'halldafama', 'estatuto'], [isAdmin]);

    useEffect(() => {
        if (!TABS.includes(activeTab)) {
            setActiveTab('inicio');
            return;
        }
        try { localStorage.setItem('cba_last_tab_v1', activeTab); } catch { }
    }, [activeTab, TABS]);

    useEffect(() => {
        if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    }, [activeTab]);

    const handleForceRefresh = async () => {
        try {
            await api.post({ action: 'clearCache' });
        } catch (e) {
            console.error("Erro ao limpar cache", e);
        }
        setRefreshTrigger(prev => prev + 1);
    };

    const handleOwnPasswordChange = async (e) => {
        e.preventDefault();
        const currentPassword = passwordForm.currentPassword;
        const newPassword = passwordForm.newPassword;
        const confirmPassword = passwordForm.confirmPassword;
        if (!currentPassword) {
            setPasswordStatus({ loading: false, error: 'Informe sua senha atual.' });
            return;
        }
        if (newPassword.length < 8) {
            setPasswordStatus({ loading: false, error: 'A nova senha deve ter pelo menos 8 caracteres.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordStatus({ loading: false, error: 'A confirmação não corresponde à nova senha.' });
            return;
        }
        try {
            setPasswordStatus({ loading: true, error: '' });
            await api.post({ action: 'changeOwnPassword', currentPassword, newPassword });
            setIsPasswordModalOpen(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            window.alert('Senha alterada com sucesso. Entre novamente com a nova senha.');
            onLogout(true);
        } catch (error) {
            setPasswordStatus({ loading: false, error: error?.message || 'Não foi possível alterar a senha.' });
        }
    };

    const TAB_CONFIG = {
        inicio: { Icon: Home, color: 'text-emerald-500 dark:text-emerald-400', activeBg: 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20', label: 'Início' },
        presenca: { Icon: Activity, color: 'text-emerald-500 dark:text-emerald-400', activeBg: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30', label: 'Presença' },
        jogos: { Icon: CalendarDays, color: 'text-orange-500 dark:text-orange-400', activeBg: 'bg-orange-500 text-white shadow-lg shadow-orange-500/30', label: 'Jogos' },
        estatuto: { Icon: BookOpen, color: 'text-teal-500 dark:text-teal-400', activeBg: 'bg-teal-500 text-white shadow-lg shadow-teal-500/30', label: 'Estatuto' },
        financas: { Icon: DollarSign, color: 'text-rose-500 dark:text-rose-400', activeBg: 'bg-rose-500 text-white shadow-lg shadow-rose-500/30', label: 'Finanças' },
        sorteio: { Icon: Users, color: 'text-amber-500 dark:text-amber-400', activeBg: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30', label: 'Sorteio' },
        eventos: { Icon: PartyPopper, color: 'text-purple-500 dark:text-purple-400', activeBg: 'bg-purple-500 text-white shadow-lg shadow-purple-500/30', label: 'Eventos' },
        relatorios: { Icon: BarChart, color: 'text-blue-500 dark:text-blue-400', activeBg: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30', label: 'Relatórios' },
        atleta: { Icon: Trophy, color: 'text-orange-500 dark:text-orange-400', activeBg: 'bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/30', label: 'Desempenho do Atleta' },
        mesario: { Icon: ClipboardList, color: 'text-cyan-500 dark:text-cyan-400', activeBg: 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30', label: 'Mesário' },
        dm: { Icon: Stethoscope, color: 'text-red-500 dark:text-red-400', activeBg: 'bg-red-500 text-white shadow-lg shadow-red-500/30', label: 'Departamento Médico' },
        halldafama: { Icon: Crown, color: 'text-yellow-500 dark:text-yellow-400', activeBg: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg shadow-yellow-500/30', label: 'Hall da Fama' },
        notificacoes: { Icon: BellRing, color: 'text-pink-500 dark:text-pink-400', activeBg: 'bg-pink-500 text-white shadow-lg shadow-pink-500/30', label: 'Avisos' },
    };

    const renderContent = () => {
        if (isLoading && !initialData) return <Loader message="Carregando dados na quadra..." />;
        if (dataError && !initialData) return <div role="alert" className="mx-auto max-w-lg rounded-3xl border border-rose-500/30 bg-slate-800 p-6 text-center text-white"><AlertCircle className="mx-auto mb-3 h-9 w-9 text-rose-400"/><h2 className="text-xl font-black">Não foi possível carregar o portal</h2><p className="mt-2 text-sm text-slate-300">Confira sua conexão e tente novamente.</p><button type="button" onClick={refetch} className="mt-5 rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950">Tentar novamente</button></div>;
        
        const appData = initialData?.data || initialData;
        
        const props = { 
            allPlayersData: appData?.dashboard?.players || [], 
            dates: appData?.dashboard?.dates || [], 
            financeData: appData?.finance, 
            nextGame: appData?.nextGame, 
            currentUser: user, isAdmin,
            pixCode: appData?.pixCode, refreshKey: refreshTrigger 
        };

        return (
            <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {activeTab === 'inicio' && <Suspense fallback={<Loader message="Carregando Início..." />}><HomeDashboard isAdmin={isAdmin} onNavigate={tab => { if (TABS.includes(tab)) setActiveTab(tab); }} refreshKey={refreshTrigger} /></Suspense>}
                    {activeTab === 'presenca' && <PresencaTab {...props} onAttendanceUpdate={handleForceRefresh} />}
                    {activeTab === 'relatorios' && <Suspense fallback={<Loader message="Carregando Relatórios..." />}><ReportsDashboard data={initialData} /></Suspense>}
                    {activeTab === 'atleta' && <AthleteDashboard {...props} dataError={dataError} />}
                    {activeTab === 'mesario' && <Suspense fallback={<Loader message="Carregando Mesário..." />}><MesarioDashboard data={initialData} onStatsSaved={handleForceRefresh} /></Suspense>}
                    {activeTab === 'financas' && <FinancasTab {...props} />}
                    {activeTab === 'jogos' && <Suspense fallback={<Loader message="Carregando Jogos..." />}><ScheduleDashboard tab="jogos" refreshKey={refreshTrigger} /></Suspense>}
                    {activeTab === 'eventos' && <Suspense fallback={<Loader message="Carregando Eventos..." />}><ScheduleDashboard tab="eventos" refreshKey={refreshTrigger} /></Suspense>}
                    {activeTab === 'sorteio' && <Suspense fallback={<Loader message="Carregando Sorteio..." />}><SorteioDashboard players={props.allPlayersData} dates={props.dates} isAdmin={isAdmin} /></Suspense>}
                    {activeTab === 'dm' && <Suspense fallback={<Loader message="Carregando Departamento Médico..." />}><DmDashboard /></Suspense>}
                    {activeTab === 'halldafama' && <HallDaFamaTab {...props} />}
                    {activeTab === 'estatuto' && <EstatutoTab />}
                    {activeTab === 'notificacoes' && <NotificacoesTab {...props} />}
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
        <InitialDataContext.Provider value={initialData}>
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 overflow-hidden">
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="cba-sidebar-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
                )}
            </AnimatePresence>

            <nav id="cba-menu-principal" aria-label="Menu principal" className={`cba-mobile-sidebar fixed inset-y-0 left-0 z-50 md:relative transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 w-64 md:w-56 shrink-0 h-full flex flex-col items-stretch py-5 px-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-200/50 dark:border-slate-700/50 shadow-2xl md:shadow-lg overflow-y-auto overscroll-contain hide-scrollbar gap-2`}>
                <div className="flex items-center gap-3 px-2 mb-4"><img src="https://lh3.googleusercontent.com/d/131DvcfgiRLLp9irVnVY8m9qNuM-0y7f8" alt="Logo" className="w-12 h-12 rounded-full shrink-0" /><div className="min-w-0 flex-1"><p className="font-black text-slate-900 dark:text-white">Portal CBA</p><p className="text-[10px] uppercase tracking-wider font-black text-slate-400">Menu principal</p></div><button type="button" onClick={() => setIsSidebarOpen(false)} aria-label="Fechar menu" className="md:hidden rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800"><X className="w-5 h-5" /></button></div>
                {isAdmin && <button type="button" onClick={() => { setIsSidebarOpen(false); setAdminOpen(true); }} className="flex w-full min-h-12 items-center gap-3 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-3.5 text-left font-black text-sm text-indigo-400"><KeyRound className="h-5 w-5 shrink-0"/>Administração</button>}
                {TABS.map(tab => {
                    const { Icon, activeBg, color, label } = TAB_CONFIG[tab];
                    return (
                        <button key={tab} title={label} onClick={() => { setActiveTab(tab); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full min-h-12 px-3.5 rounded-2xl transition-all duration-300 text-left ${activeTab === tab ? `${activeBg} shadow-lg md:scale-[1.02]` : `${color} hover:bg-slate-100 dark:hover:bg-slate-800`}`}>
                            <Icon className="w-5 h-5 shrink-0" />
                            <span className="font-black text-sm truncate">{label}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
                <header className="shrink-0 p-4 flex justify-between items-center bg-white/40 dark:bg-slate-800/30 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} aria-label="Abrir menu de navegação" aria-controls="cba-menu-principal" aria-expanded={isSidebarOpen} className="md:hidden p-2 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><Menu className="w-6 h-6" /></button>
                        <img src={user.fotoUrl || 'https://placehold.co/100'} alt="Avatar" className="h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-700" crossOrigin="anonymous" />
                        <div className="hidden sm:block"><h1 className="text-xl font-black leading-none">Portal CBA</h1><p className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest">{user.name}</p></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleForceRefresh} aria-label="Atualizar dados" title="Atualizar dados" className="p-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl shadow-sm hover:shadow-md"><RefreshCw className="w-5 h-5" /></button>
                        <button onClick={() => { setPasswordStatus({ loading: false, error: '' }); setIsPasswordModalOpen(true); }} aria-label="Redefinir senha" title="Redefinir senha" className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-emerald-500 font-bold text-sm rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-slate-200 dark:border-slate-700 flex items-center gap-2"><KeyRound className="w-4 h-4"/><span className="hidden md:inline">Senha</span></button>
                        <button onClick={() => onLogout()} disabled={logoutPending} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-rose-500 font-bold text-sm rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-slate-200 dark:border-slate-700 flex items-center gap-2 disabled:opacity-50"><LogOut className="w-4 h-4 hidden sm:block"/> {logoutPending ? 'Saindo...' : 'Sair'}</button>
                    </div>
                </header>
                <main ref={mainScrollRef} className="flex-1 min-w-0 overflow-y-auto hide-scrollbar p-4 md:p-8"><div className="max-w-7xl mx-auto min-h-full flex flex-col pb-24 md:pb-4"><div className="flex-1">{dataError && initialData && <div role="alert" className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">Não foi possível atualizar os dados. <button type="button" onClick={refetch} className="font-black underline">Tentar novamente</button></div>}{renderContent()}</div><footer className="mt-10 pt-4 border-t border-slate-200/30 dark:border-slate-700/40 text-center text-[10px] tracking-wide text-slate-500 dark:text-slate-400" aria-label={`Versão do Portal CBA ${SITE_VERSION}`}>Portal CBA · v{SITE_VERSION}</footer></div></main>
                <AnimatePresence>
                    {isPasswordModalOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !passwordStatus.loading && setIsPasswordModalOpen(false)}>
                            <motion.form initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} onSubmit={handleOwnPasswordChange} onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-5 md:p-6 shadow-2xl">
                                <div className="flex items-start justify-between gap-4 mb-5">
                                    <div>
                                        <div className="flex items-center gap-2 text-emerald-400"><KeyRound className="w-5 h-5"/><span className="text-xs font-black uppercase tracking-wider">Segurança</span></div>
                                        <h2 className="text-xl font-black text-white mt-2">Redefinir minha senha</h2>
                                        <p className="text-xs text-slate-400 mt-1">{user.email}</p>
                                    </div>
                                    <button type="button" disabled={passwordStatus.loading} onClick={() => setIsPasswordModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40"><X className="w-5 h-5"/></button>
                                </div>
                                <div className="space-y-4">
                                    <label className="block"><span className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1.5">Senha atual</span><input type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword:e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"/></label>
                                    <label className="block"><span className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1.5">Nova senha</span><input type="password" minLength={8} autoComplete="new-password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword:e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"/><span className="block text-[10px] text-slate-500 mt-1">Mínimo de 8 caracteres.</span></label>
                                    <label className="block"><span className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1.5">Confirmar nova senha</span><input type="password" minLength={8} autoComplete="new-password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword:e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"/></label>
                                </div>
                                {passwordStatus.error && <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2.5 text-sm font-bold text-rose-300">{passwordStatus.error}</div>}
                                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6">
                                    <button type="button" disabled={passwordStatus.loading} onClick={() => setIsPasswordModalOpen(false)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-black hover:bg-slate-700 disabled:opacity-40">Cancelar</button>
                                    <button type="submit" disabled={passwordStatus.loading || !passwordForm.currentPassword || passwordForm.newPassword.length < 8 || passwordForm.newPassword !== passwordForm.confirmPassword} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-500 disabled:opacity-40 flex items-center justify-center gap-2">{passwordStatus.loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <KeyRound className="w-4 h-4"/>}Salvar nova senha</button>
                                </div>
                            </motion.form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-700/80 bg-slate-950/95 backdrop-blur-xl px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
                <div className={`grid ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'} gap-1`}>
                    {[
                        ['inicio','Início',Home],
                        ['jogos','Jogos',CalendarDays],
                        ['presenca','Presença',Activity],
                        ['financas','Finanças',DollarSign]
                    ].map(([key,label,Icon]) => (
                        <button key={key} onClick={() => setActiveTab(key)} className={`min-h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 ${activeTab === key ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>
                            <Icon className="w-5 h-5"/><span className="text-[9px] font-black">{label}</span>
                        </button>
                    ))}
                    {isAdmin && <button type="button" onClick={() => setAdminOpen(true)} aria-label="Abrir Administração" className="min-h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-indigo-400"><KeyRound className="w-5 h-5"/><span className="text-[9px] font-black">Admin</span></button>}
                    <button onClick={() => setIsSidebarOpen(true)} aria-controls="cba-menu-principal" aria-expanded={isSidebarOpen} className="min-h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-400">
                        <Menu className="w-5 h-5"/><span className="text-[9px] font-black">Mais</span>
                    </button>
                </div>
            </div>
            {initialData && <ActiveBridges tab={activeTab} />}
            {isAdmin && adminOpen && <Suspense fallback={null}><AdminDashboardBridge open onClose={() => setAdminOpen(false)} /></Suspense>}
        </div>
        </InitialDataContext.Provider>
    );
};

const SESSION_STORAGE_KEY = 'cba_session_v1';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const loadPersistedSession = () => {
    try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.user || !parsed?.savedAt) return null;
        if (Date.now() - parsed.savedAt > SESSION_TTL_MS) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            return null;
        }
        return parsed.user;
    } catch {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
    }
};

const persistSession = (user) => {
    try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user, savedAt: Date.now() }));
    } catch { }
};

const clearPersistedSession = () => {
    try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem('cba_session_v2');
        sessionStorage.removeItem('cba_session_v2');
    } catch { }
};

function AppInner() {
    const logoutInFlight = useRef(false);
    const [logoutPending, setLogoutPending] = useState(false);
    const [auth, setAuth] = useState(() => {
        const restoredUser = loadPersistedSession();
        return restoredUser
            ? { status: 'authenticated', user: restoredUser, error: null }
            : { status: 'unauthenticated', user: null, error: null };
    });

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuth({ status: 'loading', user: null, error: null });
        const formData = new FormData(e.currentTarget);
        try {
            const data = await api.post({ action: 'loginUser', email: formData.get('email'), password: formData.get('password') });
            if (data.status === 'approved') {
                persistSession(data);
                setAuth({ status: 'authenticated', user: data, error: null });
            } else {
                setAuth({ status: 'unauthenticated', user: null, error: data.message });
            }
        } catch (error) {
            let loginError = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
            const code = String(error?.code || '').toUpperCase();
            const httpStatus = Number(error?.status || 0);
            if (code === 'INVALID_CREDENTIALS' || (httpStatus === 401 && !['SESSION_EXPIRED','UNAUTHORIZED'].includes(code))) {
                loginError = 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
            } else if (code === 'RATE_LIMITED' || httpStatus === 429) {
                loginError = 'Muitas tentativas de acesso. Aguarde 10 minutos e tente novamente.';
            } else if (code === 'FORBIDDEN' || httpStatus === 403) {
                loginError = 'Sua conta não está autorizada. Procure a administração do CBA.';
            } else if (error?.message && httpStatus >= 400 && httpStatus < 500) {
                loginError = String(error.message);
            } else if (httpStatus >= 500) {
                loginError = 'O serviço está temporariamente indisponível. Tente novamente em instantes.';
            }
            setAuth({ status: 'unauthenticated', user: null, error: loginError });
        }
    };

    const handleLogout = async (alreadyRevoked = false) => {
        if (logoutInFlight.current) return;
        logoutInFlight.current = true;
        setLogoutPending(true);
        let warning = null;
        try {
            if (!alreadyRevoked) {
                const token = auth.user?.token || auth.user?.user?.token;
                if (!token) throw new Error('Sessão sem token');
                const controller = new AbortController();
                const timeout = window.setTimeout(() => controller.abort(), 5000);
                try {
                    const response = await api.post({ action: 'logoutUser', token }, controller.signal);
                    if (response?.result !== 'success') throw new Error('Revogação não confirmada');
                } finally {
                    window.clearTimeout(timeout);
                }
            }
        } catch {
            warning = 'Você saiu deste dispositivo, mas não foi possível confirmar o encerramento da sessão no servidor. Verifique sua conexão.';
        } finally {
            clearPersistedSession();
            setAuth({ status: 'unauthenticated', user: null, error: warning });
            setLogoutPending(false);
            logoutInFlight.current = false;
        }
    };

    return (
        <ThemeProvider>
            {auth.status === 'authenticated' ? <MainApp user={auth.user} onLogout={handleLogout} logoutPending={logoutPending} /> : <LoginScreen onLogin={handleLogin} isLoading={auth.status === 'loading'} error={auth.error} />}
        </ThemeProvider>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <AppInner />
        </ErrorBoundary>
    );
}
