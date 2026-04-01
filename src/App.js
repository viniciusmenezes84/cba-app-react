import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, CalendarDays, BookOpen, DollarSign, Users, PartyPopper, BarChart, BellRing, 
    X, Menu, Copy, LogOut, RefreshCw, Trophy, Flame, MapPin, ChevronDown, CheckCircle, AlertCircle, Share2, ArrowLeft, Trash, Edit
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Registo dos componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// --- CONTEXTO DE TEMA ---
const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

const ThemeProvider = ({ children }) => {
    const theme = 'dark';
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light');
        root.classList.add('dark');
    }, []);
    return <ThemeContext.Provider value={{ theme, toggleTheme: () => {} }}>{children}</ThemeContext.Provider>;
};

const useTheme = () => useContext(ThemeContext);

// --- UTILITÁRIOS DE API CENTRALIZADOS ---
const api = {
    post: async (baseUrl, params) => {
        try {
            const res = await fetch(baseUrl, {
                method: 'POST', mode: 'cors', redirect: 'follow',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(params),
            });
            if (!res.ok) {
                const errorText = await res.text().catch(() => 'Erro desconhecido.');
                if (errorText.trim().toLowerCase().startsWith('<!doctype html')) {
                    throw new Error(`Erro de Servidor (${res.status}). Verifique a implantação do script.`);
                }
                throw new Error(`Erro de HTTP: ${res.status}. Resposta: ${errorText}`);
            }
            return res.json();
        } catch (error) {
            console.error('Fetch POST error:', error.message);
            throw error;
        }
    }
};

// --- CUSTOM HOOK PARA CACHE E DESEMPENHO ---
function useDataQuery(key, queryFn, dependencies = []) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await queryFn();
            setData(result);
        } catch (err) {
            setError(err.message || "Erro desconhecido ao buscar dados.");
        } finally {
            setIsLoading(false);
        }
    }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchData(); }, [fetchData]);
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

const Modal = ({ isOpen, onClose, title, children }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto z-10"
                    >
                        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700 mb-5">
                            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{title}</h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 p-2 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

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
const LoginScreen = ({ onLogin, isLoading, error }) => (
    <div className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2070&auto=format&fit=crop')" }}>
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="relative z-10 p-10 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl text-center w-full max-w-md">
            <img src="https://lh3.googleusercontent.com/d/131DvcfgiRLLp9irVnVY8m9qNuM-0y7f8" alt="Logo CBA" className="h-28 w-28 rounded-full shadow-2xl mx-auto mb-6 ring-4 ring-white/20" />
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Portal do CBA</h1>
            <p className="text-slate-300 mb-8 font-medium">Basquete dos Aposentados</p>
            {error && <p className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4"/>{error}</p>}
            <form onSubmit={onLogin} className="space-y-5">
                <input name="email" type="email" placeholder="Email" className="w-full p-4 bg-slate-800/50 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                <input name="password" type="password" placeholder="Senha" className="w-full p-4 bg-slate-800/50 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 disabled:opacity-70 transition-transform active:scale-95">
                    {isLoading ? 'Autenticando...' : 'Entrar na Área Restrita'}
                </button>
            </form>
        </motion.div>
    </div>
);

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
const PresencaTab = ({ allPlayersData, dates, financeData, isLoading, error, nextGame, currentUser, onAttendanceUpdate, onNavigate }) => {
    const availableYears = useMemo(() => {
        if (!dates || dates.length === 0) return [new Date().getFullYear().toString()];
        return [...new Set(dates.map(d => d.substring(0, 4)))].sort((a, b) => b - a);
    }, [dates]);

    const [selectedYear, setSelectedYear] = useState(availableYears[0]);
    
    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);
    
    const playedDatesByYear = useMemo(() => {
        const uniqueDates = [...new Set(dates || [])];
        const filtered = uniqueDates.filter(d => d.startsWith(selectedYear));
        return filtered.filter(date => allPlayersData.some(p => p.attendance[date]?.includes('✅')));
    }, [dates, selectedYear, allPlayersData]);

    const playersWithStats = useMemo(() => {
        if (!allPlayersData || !playedDatesByYear.length) return [];
        return allPlayersData.map(p => {
            let validGames = 0; let presences = 0;
            playedDatesByYear.forEach(d => {
                const status = p.attendance[d]?.trim() || '';
                if (status !== '' && status !== 'N/A') {
                    validGames++;
                    if (status.includes('✅')) presences++;
                }
            });
            const percentage = validGames > 0 ? (presences / validGames) * 100 : 0;
            return { ...p, percentage, presences, validGames };
        });
    }, [allPlayersData, playedDatesByYear]);

    const topPresencePlayer = [...playersWithStats]
        .filter(p => p.validGames > 0 && String(p.isEligibleForHoF).toUpperCase() !== 'FALSE')
        .sort((a,b) => (b.presences - a.presences) || (b.percentage - a.percentage))[0];

    const topPercentagePlayer = [...playersWithStats]
        .filter(p => p.validGames > 0 && String(p.isEligibleForHoF).toUpperCase() !== 'FALSE')
        .sort((a,b) => (b.percentage - a.percentage) || (b.presences - a.presences))[0];

    const totalAtletas = allPlayersData.length;
    let totalValidPlayerGames = 0; let totalGlobalPresences = 0;

    playedDatesByYear.forEach(date => {
        allPlayersData.forEach(p => {
             const status = p.attendance[date]?.trim() || '';
             if (status !== '' && status !== 'N/A') {
                 totalValidPlayerGames++;
                 if (status.includes('✅')) totalGlobalPresences++;
             }
        });
    });

    const globalAverage = totalValidPlayerGames > 0 ? (totalGlobalPresences / totalValidPlayerGames) * 100 : 0;
    const jogosRealizados = playedDatesByYear.length;

    const myFinanceRecord = financeData?.paymentStatus?.find(p => p.player.toLowerCase() === currentUser.name.toLowerCase());
    let myDebt = 0;
    if (myFinanceRecord && financeData?.paymentHeaders) {
        const monthMap = { "janeiro": 0, "fevereiro": 1, "março": 2, "abril": 3, "maio": 4, "junho": 5, "julho": 6, "agosto": 7, "setembro": 8, "outubro": 9, "novembro": 10, "dezembro": 11 };
        const currentMonth = new Date().getMonth();
        financeData.paymentHeaders.forEach(m => {
            const statusStr = String(myFinanceRecord.statuses[m] || '').trim().toLowerCase();
            if (statusStr !== 'isento' && statusStr !== '20' && monthMap[m.toLowerCase()] < currentMonth) {
                myDebt += 20;
            }
        });
    }

    const monthlyData = new Array(12).fill(0);
    const monthsMap = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    playedDatesByYear.forEach(dateStr => {
        const monthIndex = parseInt(dateStr.substring(5, 7), 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
            monthlyData[monthIndex] += allPlayersData.reduce((c, p) => c + (p.attendance[dateStr]?.includes('✅') ? 1 : 0), 0);
        }
    });

    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const chartOptions = { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { legend: { display: false } }, 
        scales: { 
            y: { beginAtZero: true, ticks: { color: isDark ? '#94a3b8' : '#64748b' } },
            x: { ticks: { color: isDark ? '#94a3b8' : '#64748b' } }
        } 
    };
    
    const chartDataObj = { 
        labels: monthsMap, 
        datasets: [{ 
            label: 'Total de Presenças', 
            data: monthlyData, 
            backgroundColor: '#818cf8', 
            borderRadius: 6 
        }] 
    };

    // --- NOVO GRÁFICO: Comparativo Anual (Linhas) ---
    const yearlyComparisonData = useMemo(() => {
        const colors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
        const datasets = [];

        availableYears.forEach((year, index) => {
            const yearMonthlyData = new Array(12).fill(0);
            const yearDates = [...new Set(dates || [])].filter(d => d.startsWith(year));
            const playedYearDates = yearDates.filter(date => allPlayersData.some(p => p.attendance[date]?.includes('✅')));

            playedYearDates.forEach(dateStr => {
                const monthIndex = parseInt(dateStr.substring(5, 7), 10) - 1;
                if (monthIndex >= 0 && monthIndex < 12) {
                    yearMonthlyData[monthIndex] += allPlayersData.reduce((c, p) => c + (p.attendance[dateStr]?.includes('✅') ? 1 : 0), 0);
                }
            });

            datasets.push({
                label: year,
                data: yearMonthlyData,
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '80',
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: colors[index % colors.length],
                pointRadius: 4,
                pointHoverRadius: 6
            });
        });

        return { labels: monthsMap, datasets };
    }, [dates, allPlayersData, availableYears]);

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'top', labels: { color: isDark ? '#e2e8f0' : '#475569', font: { weight: 'bold' } } },
            tooltip: { mode: 'index', intersect: false }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
            y: { beginAtZero: true, ticks: { color: isDark ? '#94a3b8' : '#64748b' } },
            x: { ticks: { color: isDark ? '#94a3b8' : '#64748b' } }
        }
    };


    if (isLoading) return <Loader message="Sincronizando quadra..." />;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="space-y-6">
            <ProximoJogoCard game={nextGame} currentUser={currentUser} onAttendanceUpdate={onAttendanceUpdate} />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <GlassCard className="col-span-1 md:col-span-2 bg-gradient-to-br from-orange-500 to-rose-600 !text-white border-none relative overflow-hidden">
                    <div className="absolute -right-6 top-4 opacity-20"><Trophy className="w-40 h-40" /></div>
                    <div className="relative z-10">
                        <h3 className="text-orange-200 font-bold uppercase tracking-wider text-xs mb-1">Destaque do Ano</h3>
                        <p className="text-3xl font-black mb-1">{topPresencePlayer?.name || '--'}</p>
                        <p className="text-lg font-medium">{topPresencePlayer?.presences || 0} presenças em {jogosRealizados} jogos</p>
                    </div>
                </GlassCard>

                <GlassCard className="col-span-1 flex flex-col justify-center items-center text-center">
                    <h3 className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-2">Maior Média Ano</h3>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{topPercentagePlayer?.name || '--'}</p>
                    <span className="mt-2 px-4 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-black rounded-full">
                        {topPercentagePlayer?.percentage?.toFixed(0) || 0}%
                    </span>
                </GlassCard>

                <GlassCard className="col-span-1 flex flex-col justify-center items-center text-center bg-indigo-50 dark:bg-indigo-900/20">
                    <h3 className="text-indigo-500 font-bold uppercase tracking-wider text-xs mb-2">Jogos Realizados</h3>
                    <p className="text-5xl font-black text-indigo-600 dark:text-indigo-400">{jogosRealizados}</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Em {selectedYear}</p>
                </GlassCard>

                <GlassCard className={`col-span-1 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between relative ${myDebt > 0 ? 'bg-gradient-to-br from-rose-500 to-red-600 !text-white border-none' : 'bg-gradient-to-br from-emerald-500 to-teal-600 !text-white border-none'}`} onClick={() => window.navigateToTab && window.navigateToTab('financas')}>
                    <div className="absolute -right-4 opacity-20 pointer-events-none"><DollarSign className="w-32 h-32"/></div>
                    <div className="relative z-10 flex-grow pr-4">
                        <h3 className="font-bold uppercase tracking-wider text-xs mb-1 opacity-80">Meu Status Financeiro</h3>
                        <p className="text-2xl font-black mb-1">{myDebt > 0 ? 'Mensalidade Atrasada' : 'Tudo em Dia!'}</p>
                        <p className="text-sm font-medium">{myDebt > 0 ? `Você possui pendências de R$ ${myDebt.toFixed(2)}.` : 'Obrigado por fortalecer o CBA.'}</p>
                    </div>
                    <div className="relative z-10 mt-4 sm:mt-0 shrink-0">
                        <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-md ${myDebt > 0 ? 'bg-white text-rose-600' : 'bg-white text-emerald-600'}`}>Ver Detalhes →</span>
                    </div>
                </GlassCard>

                <GlassCard className="col-span-1 flex flex-col justify-center items-center text-center hover:bg-slate-100 dark:hover:bg-slate-800/50">
                    <h3 className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-2">Atletas Ativos</h3>
                    <p className="text-4xl font-black text-slate-800 dark:text-white">{totalAtletas}</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Registados no Elenco</p>
                </GlassCard>

                <GlassCard className="col-span-1 flex flex-col justify-center items-center text-center hover:bg-slate-100 dark:hover:bg-slate-800/50">
                    <h3 className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-2">Quórum Médio</h3>
                    <p className="text-4xl font-black text-slate-800 dark:text-white">{globalAverage.toFixed(0)}%</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Presença da Equipa</p>
                </GlassCard>

                <GlassCard className="col-span-1 md:col-span-4">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><BarChart className="w-5 h-5"/> Tendência de Quórum (Mensal)</h3>
                        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl outline-none font-bold text-sm text-slate-800 dark:text-white border-none focus:ring-2 focus:ring-indigo-500">
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="h-64 w-full">
                        <Bar data={chartDataObj} options={chartOptions} />
                    </div>
                </GlassCard>

                {/* NOVO GRÁFICO COMPARATIVO ANUAL */}
                <GlassCard className="col-span-1 md:col-span-4">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Activity className="w-5 h-5"/> Comparativo Anual de Presenças
                        </h3>
                    </div>
                    <div className="h-72 w-full">
                        <Line data={yearlyComparisonData} options={lineChartOptions} />
                    </div>
                </GlassCard>

            </div>
        </div>
    );
};

// 2. ABA RELATÓRIOS
const RelatoriosTab = ({ allPlayersData, dates }) => {
    const [selectedPlayer, setSelectedPlayer] = useState('todos');
    const [sortConfig, setSortConfig] = useState({ key: 'percentage', direction: 'desc' });
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const availableYears = useMemo(() => {
        if (!dates || dates.length === 0) return [new Date().getFullYear().toString()];
        const uniqueDates = [...new Set(dates)];
        const years = [...new Set(uniqueDates.map(d => d.substring(0, 4)))];
        return years.sort((a, b) => b - a);
    }, [dates]);

    const [selectedYear, setSelectedYear] = useState(availableYears[0]);
    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);

    const filteredDates = useMemo(() => {
        const uniqueDates = [...new Set(dates || [])];
        return uniqueDates.filter(d => d.startsWith(selectedYear));
    }, [dates, selectedYear]);
    
    const playedDates = useMemo(() => {
        return filteredDates.filter(date =>
            allPlayersData.some(p => p.attendance[date]?.includes('✅'))
        );
    }, [filteredDates, allPlayersData]);

    const reportData = useMemo(() => {
        let data = allPlayersData.map(player => {
            let validGames = 0, presences = 0, faults = 0;
            playedDates.forEach(date => {
                const status = player.attendance[date]?.trim() || '';
                if (status !== '' && status !== 'N/A') {
                    validGames++;
                    if (status.includes('✅')) presences++;
                    if (status.toUpperCase() === 'NÃO JUSTIFICOU') faults++;
                }
            });
            const percentage = validGames > 0 ? (presences / validGames) * 100 : 0;
            return { ...player, presences, faults, totalGames: validGames, percentage };
        });

        data.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            if (sortConfig.key === 'percentage') return b.presences - a.presences;
            return 0;
        });
        return data;
    }, [allPlayersData, playedDates, sortConfig]);

    const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc' });

    const singlePlayer = useMemo(() => reportData.find(p => p.name === selectedPlayer), [reportData, selectedPlayer]);
    
    const doughnutData = {
        labels: ['Presença', 'Ausência'],
        datasets: [{ 
            data: [singlePlayer?.presences || 0, (singlePlayer?.totalGames || 0) - (singlePlayer?.presences || 0)], 
            backgroundColor: ['#4f46e5', '#334155'], 
            borderWidth: 0 
        }]
    };

    // Exportação do PDF Corporativo
    const handleExportPDF = async () => {
        setIsGeneratingPDF(true);

        if (!window.html2pdf) {
            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            } catch (err) {
                alert('Erro ao carregar a biblioteca de PDF. Verifique a sua conexão.');
                setIsGeneratingPDF(false);
                return;
            }
        }

        setTimeout(() => {
            const element = document.getElementById('pdf-corporate-report');
            if (!element) {
                setIsGeneratingPDF(false);
                return;
            }

            const opt = {
                margin:       [0.4, 0.4, 0.4, 0.4], 
                filename:     `Relatorio_CBA_${selectedYear}_${selectedPlayer === 'todos' ? 'Geral' : selectedPlayer.replace(/\s+/g, '_')}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true }, 
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
            };

            try {
                window.html2pdf().set(opt).from(element).save().then(() => {
                    setIsGeneratingPDF(false);
                }).catch((err) => {
                    console.error('Erro PDF:', err);
                    setIsGeneratingPDF(false);
                });
            } catch (err) {
                console.error('Erro Fatal PDF:', err);
                setIsGeneratingPDF(false);
            }
        }, 500); 
    };

    const handleShareWhatsApp = () => {
        let text = `🏀 *Relatório CBA - ${selectedYear}* 🏀\n`;
        text += `_Atualizado com os dados mais recentes_\n\n`;

        if (selectedPlayer === 'todos') {
            text += `🏆 *Ranking de Assiduidade* 🏆\n\n`;
            reportData.forEach((p, idx) => {
                let emoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '▪️';
                text += `${emoji} *${p.name}* - ${p.percentage.toFixed(0)}% (${p.presences}/${p.totalGames})\n`;
                if (p.faults > 0) text += `   ⚠️ Faltas (NJ): ${p.faults}\n`;
            });
        } else if (singlePlayer) {
            text += `👤 *Atleta:* ${singlePlayer.name}\n`;
            text += `📊 *Aproveitamento:* ${singlePlayer.percentage.toFixed(0)}%\n`;
            text += `✅ *Presenças:* ${singlePlayer.presences} de ${singlePlayer.totalGames} jogos\n`;
            text += `⚠️ *Faltas não justificadas:* ${singlePlayer.faults}\n\n`;
            if (singlePlayer.ppj) text += `🏀 *PTS/Jogo:* ${singlePlayer.ppj}\n`;
            if (singlePlayer.rpj) text += `🤚 *REB/Jogo:* ${singlePlayer.rpj}\n`;
        }

        text += `\nVeja os detalhes completos no Portal do CBA!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const globalTotalGames = playedDates.length;
    const globalAveragePercentage = reportData.length > 0 
        ? reportData.reduce((acc, curr) => acc + curr.percentage, 0) / reportData.length 
        : 0;

    return (
        <div className="space-y-8">
            <GlassCard className="flex flex-col xl:flex-row justify-between items-center gap-4">
                <div className="flex items-center w-full xl:w-auto">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl mr-4"><BarChart className="w-8 h-8" /></div>
                    <div><h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Central de Relatórios</h2><p className="text-sm text-slate-500">Dados operacionais e performance</p></div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                    <div className="flex gap-3">
                        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold outline-none flex-1 md:w-32">{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
                        <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl flex-grow md:w-64 outline-none">
                            <option value="todos">Resumo do Elenco</option>
                            {[...allPlayersData].sort((a,b)=>a.name.localeCompare(b.name)).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                        <button onClick={handleShareWhatsApp} className="flex-1 md:flex-none p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md" title="Enviar resumo por WhatsApp">
                            <Share2 className="h-5 w-5" />
                            <span className="hidden sm:block">Partilhar</span>
                        </button>
                        <button onClick={handleExportPDF} disabled={isGeneratingPDF} className="flex-1 md:flex-none p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50" title="Gerar PDF corporativo">
                            {isGeneratingPDF ? <RefreshCw className="animate-spin h-5 w-5 text-white" /> : <BookOpen className="h-5 w-5 text-white" />}
                            <span className="hidden sm:block">{isGeneratingPDF ? 'Gerando...' : 'Exportar PDF'}</span>
                        </button>
                    </div>
                </div>
            </GlassCard>

            {/* VISÃO GERAL (TELA) */}
            {selectedPlayer === 'todos' ? (
                <GlassCard className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Ranking Geral</h3>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-500 mr-1">Ordenar por:</span>
                            <button onClick={() => requestSort('percentage')} className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${sortConfig.key === 'percentage' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                % Aproveitamento {sortConfig.key === 'percentage' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                            </button>
                            <button onClick={() => requestSort('faults')} className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${sortConfig.key === 'faults' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                Faltas NJ {sortConfig.key === 'faults' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                            </button>
                            <button onClick={() => requestSort('name')} className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${sortConfig.key === 'name' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                Nome {sortConfig.key === 'name' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-x-8 gap-y-1">
                        <div className="hidden lg:flex justify-between px-2 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 col-span-full">
                            <span>Posição & Atleta</span>
                            <div className="flex gap-4">
                                <span className="w-10 text-right">Pres.</span>
                                <span className="w-12 text-center">Faltas</span>
                                <span className="w-12 text-right">Aprov.</span>
                            </div>
                        </div>
                        
                        {reportData.map((p, idx) => (
                            <div key={p.name} onClick={() => setSelectedPlayer(p.name)} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/30 cursor-pointer">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
                                    <span className="text-slate-400 w-4 sm:w-5 text-right text-[10px] sm:text-xs font-bold shrink-0">{idx + 1}º</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                    <span className="text-[10px] sm:text-xs font-medium text-slate-500 w-8 sm:w-10 text-right">{p.presences}/{p.totalGames}</span>
                                    <span className="w-8 sm:w-12 text-center">
                                        {p.faults > 0 ? <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold" title="Faltas não justificadas">{p.faults} F</span> : <span className="text-slate-300 dark:text-slate-600">-</span>}
                                    </span>
                                    <span className={`w-10 sm:w-12 text-right font-black text-xs sm:text-sm ${p.percentage >= 50 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                        {p.percentage.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            ) : singlePlayer && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <button onClick={() => setSelectedPlayer('todos')} className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors w-fit px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                        <ArrowLeft className="w-4 h-4"/> Voltar ao Ranking Geral
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <GlassCard className="col-span-1 flex flex-col items-center text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/20 to-transparent"></div>
                            <div className="relative z-10 pt-6">
                                {singlePlayer.fotoUrl ? <img src={singlePlayer.fotoUrl} alt={singlePlayer.name} className="w-40 h-40 rounded-3xl object-cover border-4 border-white dark:border-slate-700 shadow-2xl group-hover:scale-105 transition-transform duration-500" crossOrigin="anonymous" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/160/4f46e5/ffffff?text=' + singlePlayer.name.charAt(0); }} /> : <div className="w-40 h-40 rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-6xl font-bold shadow-2xl border-4 border-white dark:border-slate-700">{singlePlayer.name.charAt(0)}</div>}
                                <h2 className="text-3xl font-black mt-6 text-slate-800 dark:text-white uppercase tracking-tight">{singlePlayer.name}</h2>
                                <p className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest uppercase text-sm mt-1">{singlePlayer.posicao || 'JOGADOR'} • #{singlePlayer.numero || '--'}</p>
                                <div className="grid grid-cols-2 gap-4 w-full mt-8 border-t border-slate-200 dark:border-slate-700/50 pt-6">
                                    <div><p className="text-3xl font-black text-slate-800 dark:text-white">{singlePlayer.ppj || 0}</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">PTS / Jogo</p></div>
                                    <div><p className="text-3xl font-black text-slate-800 dark:text-white">{singlePlayer.rpj || 0}</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">REB / Jogo</p></div>
                                </div>
                            </div>
                        </GlassCard>

                        <div className="col-span-1 md:col-span-2 space-y-8">
                            <GlassCard className="flex items-center gap-8">
                                <div className="w-32 h-32 shrink-0 relative">
                                    <Doughnut data={doughnutData} options={{ cutout: '75%', plugins: { legend: { display: false } } }} />
                                    <div className="absolute inset-0 flex items-center justify-center flex-col mt-1"><span className="text-2xl font-black">{singlePlayer.percentage.toFixed(0)}%</span></div>
                                </div>
                                <div className="flex-grow space-y-4">
                                    <div><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Assiduidade em {selectedYear}</h3><p className="text-2xl font-bold text-slate-800 dark:text-white">{singlePlayer.presences} presenças em {singlePlayer.totalGames} jogos</p></div>
                                    {singlePlayer.faults > 0 && <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl inline-block"><span className="font-bold text-red-600 dark:text-red-400">⚠️ {singlePlayer.faults} faltas não justificadas</span></div>}
                                </div>
                            </GlassCard>
                            <GlassCard>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">Ficha Técnica</h3>
                                <div className="grid grid-cols-2 gap-y-6">
                                    <div><p className="text-sm text-slate-500">Altura</p><p className="text-lg font-semibold">{singlePlayer.altura || '--'} m</p></div>
                                    <div><p className="text-sm text-slate-500">Membro Desde</p><p className="text-lg font-semibold">{singlePlayer.dataEntrada ? new Date(singlePlayer.dataEntrada).getFullYear() : '--'}</p></div>
                                    <div className="col-span-2"><p className="text-sm text-slate-500">Especialidade / Estilo de Jogo</p><p className="text-lg font-semibold">{singlePlayer.especialidade || 'Não informada'}</p></div>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ========================================================= */}
            {/* RELATÓRIO OCULTO PARA EXPORTAÇÃO EM PDF */}
            {/* ========================================================= */}
            <div className="absolute opacity-0 pointer-events-none -z-50 left-[-9999px] top-[-9999px]">
                <div id="pdf-corporate-report" style={{ width: '750px', backgroundColor: '#ffffff', boxSizing: 'border-box' }} className="p-8 mx-auto text-slate-800">
                    <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-8">
                        <div className="flex items-center gap-6">
                            <img src="https://lh3.googleusercontent.com/d/131DvcfgiRLLp9irVnVY8m9qNuM-0y7f8" alt="Logo CBA" className="w-24 h-24 rounded-full border-2 border-slate-200 shadow-sm" crossOrigin="anonymous" />
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Portal CBA</h1>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mt-1">Relatório Executivo Oficial</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-500 uppercase">Período Referência</p>
                            <p className="text-3xl font-black text-indigo-600">{selectedYear}</p>
                            <p className="text-xs text-slate-400 mt-2 font-medium">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>

                    {selectedPlayer === 'todos' ? (
                        <>
                            <div className="mb-10">
                                <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2 uppercase tracking-wide">1. Resumo Operacional</h2>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 font-bold uppercase">Atletas Ativos</p>
                                        <p className="text-3xl font-black text-slate-800">{reportData.length}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 font-bold uppercase">Jogos Computados</p>
                                        <p className="text-3xl font-black text-slate-800">{globalTotalGames}</p>
                                    </div>
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                        <p className="text-xs text-indigo-500 font-bold uppercase">Média Global CBA</p>
                                        <p className="text-3xl font-black text-indigo-600">{globalAveragePercentage.toFixed(0)}%</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-10 break-inside-avoid">
                                <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-200 pb-2 uppercase tracking-wide">2. Destaques de Assiduidade (Top 10)</h2>
                                <div className="space-y-4 mt-4 px-2">
                                    {reportData.slice(0, 10).map((p, idx) => (
                                        <div key={p.name} className="flex items-center gap-4">
                                            <span className="w-8 font-bold text-slate-400 text-right">{idx+1}º</span>
                                            <span className="w-40 font-bold text-slate-800 truncate">{p.name}</span>
                                            <div className="flex-grow bg-slate-100 rounded-full h-5 overflow-hidden border border-slate-200">
                                                <div className="bg-indigo-600 h-full rounded-r-full transition-all" style={{ width: `${p.percentage}%` }}></div>
                                            </div>
                                            <span className="w-16 font-black text-right text-slate-800">{p.percentage.toFixed(0)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="break-before-page">
                                <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2 uppercase tracking-wide">3. Desempenho Geral do Elenco</h2>
                                <table className="w-full text-left border-collapse mt-4">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider border-y-2 border-slate-300">
                                            <th className="py-3 px-4 font-bold w-16">Pos</th>
                                            <th className="py-3 px-4 font-bold">Atleta</th>
                                            <th className="py-3 px-4 font-bold text-center w-32">Presenças</th>
                                            <th className="py-3 px-4 font-bold text-center w-32">Faltas (NJ)</th>
                                            <th className="py-3 px-4 font-bold text-right w-32">Aproveit.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {reportData.map((p, idx) => (
                                            <tr key={p.name} className={`border-b border-slate-200 break-inside-avoid ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                                <td className="py-3 px-4 text-slate-500 font-bold text-center">{idx + 1}º</td>
                                                <td className="py-3 px-4 font-bold text-slate-800">{p.name}</td>
                                                <td className="py-3 px-4 text-center font-medium">{p.presences} / {p.totalGames}</td>
                                                <td className="py-3 px-4 text-center">
                                                    {p.faults > 0 ? <span className="text-red-600 font-bold">{p.faults}</span> : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className={`py-3 px-4 text-right font-black ${p.percentage >= 50 ? 'text-indigo-600' : 'text-red-600'}`}>
                                                    {p.percentage.toFixed(0)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : singlePlayer && (
                        <>
                            <div className="flex gap-8 mb-10">
                                <div className="shrink-0">
                                    {singlePlayer.fotoUrl ? (
                                        <img src={singlePlayer.fotoUrl} className="w-48 h-48 rounded-2xl object-cover shadow-lg border border-slate-200" crossOrigin="anonymous" alt="Player"/>
                                    ) : (
                                        <div className="w-48 h-48 rounded-2xl bg-slate-100 flex items-center justify-center text-7xl font-black text-slate-300 border border-slate-200">{singlePlayer.name.charAt(0)}</div>
                                    )}
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight">{singlePlayer.name}</h2>
                                    <p className="text-xl text-slate-500 font-bold tracking-widest uppercase mt-2">{singlePlayer.posicao || 'JOGADOR'} • #{singlePlayer.numero || '--'}</p>
                                    <div className="flex gap-8 mt-6">
                                        <div><p className="text-3xl font-black text-indigo-600">{singlePlayer.ppj || 0}</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">PTS / Jogo</p></div>
                                        <div><p className="text-3xl font-black text-indigo-600">{singlePlayer.rpj || 0}</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">REB / Jogo</p></div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 break-inside-avoid">
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">Métricas de Frequência</h3>
                                    <div className="mb-4">
                                        <p className="text-3xl font-black text-slate-800">{singlePlayer.percentage.toFixed(0)}%</p>
                                        <p className="text-sm font-medium text-slate-500">Aproveitamento Anual</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between font-medium"><span className="text-slate-500">Jogos Computados:</span><span className="font-bold">{singlePlayer.totalGames}</span></div>
                                        <div className="flex justify-between font-medium"><span className="text-slate-500">Presenças Reais:</span><span className="font-bold text-emerald-600">{singlePlayer.presences}</span></div>
                                        <div className="flex justify-between font-medium"><span className="text-slate-500">Faltas (N/ Justif.):</span><span className="font-bold text-red-600">{singlePlayer.faults}</span></div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">Informações de Registo</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between font-medium"><span className="text-slate-500">Membro Desde:</span><span className="font-bold">{singlePlayer.dataEntrada ? new Date(singlePlayer.dataEntrada).toLocaleDateString('pt-BR') : '--'}</span></div>
                                        <div className="flex justify-between font-medium"><span className="text-slate-500">Altura Oficial:</span><span className="font-bold">{singlePlayer.altura || '--'} m</span></div>
                                        <div><span className="text-slate-500 block mb-1 font-medium">Estilo / Especialidade:</span><span className="font-bold bg-white px-3 py-1 border border-slate-200 rounded-lg inline-block">{singlePlayer.especialidade || 'Não informada'}</span></div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="mt-16 text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] border-t border-slate-200 pt-6">
                        Documento Oficial Gerado Eletronicamente - CBA Basquete dos Aposentados
                    </div>
                </div>
            </div>
        </div>
    );
};

// 3. ABA FINANÇAS
const FinancasTab = ({ financeData, isLoading, error, currentUser, isAdmin, scriptUrl, pixCode }) => {
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [emailMessage, setEmailMessage] = useState({ text: '', type: '' });
    const [copySuccess, setCopySuccess] = useState('');

    useEffect(() => {
        if (!financeData?.paymentStatus?.length) return;
        if (isAdmin) setSelectedPlayer(financeData.paymentStatus[0].player);
        else setSelectedPlayer(financeData.paymentStatus.find(p => p.player.toLowerCase() === currentUser.name.toLowerCase())?.player || '');
    }, [financeData, isAdmin, currentUser.name]);

    const getEnhancedStatus = (monthName, originalStatus) => {
        const statusStr = String(originalStatus || '').trim().toLowerCase();
        if (statusStr === 'isento') return { text: 'Isento', code: 'isento' };
        if (statusStr === '20') return { text: 'Pago', code: 'pago' };
        const monthMap = { "janeiro": 0, "fevereiro": 1, "março": 2, "abril": 3, "maio": 4, "junho": 5, "julho": 6, "agosto": 7, "setembro": 8, "outubro": 9, "novembro": 10, "dezembro": 11 };
        if (monthMap[monthName.toLowerCase()] < new Date().getMonth()) return { text: 'Em Atraso', code: 'atraso' };
        return { text: 'Pendente', code: 'pendente' };
    };

    const calculatePlayerDebt = (player) => {
        if(!financeData?.paymentHeaders || !player) return 0;
        let debt = 0;
        financeData.paymentHeaders.forEach(m => {
            if(getEnhancedStatus(m, player.statuses[m]).code === 'atraso') debt += 20;
        });
        return debt;
    };

    const adminStats = useMemo(() => {
        if(!financeData?.paymentStatus) return { totalReceber: 0, inadimplentes: [] };
        let totalReceber = 0; let inadimplentes = [];
        financeData.paymentStatus.forEach(p => {
            const debt = calculatePlayerDebt(p);
            if (debt > 0) { totalReceber += debt; inadimplentes.push({ name: p.player, debt }); }
        });
        inadimplentes.sort((a,b) => b.debt - a.debt);
        return { totalReceber, inadimplentes };
    }, [financeData]);

    const handleSendReports = async () => {
        setIsSending(true); setEmailMessage({ text: 'Enviando e-mails...', type: 'info' });
        try {
            const data = await api.post(scriptUrl, { action: 'sendFinanceReports' });
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
    if (error) return <p className="text-center text-red-500 py-8">{error}</p>;
    if (!financeData) return <p className="text-center text-slate-500 py-8">Nenhum dado financeiro encontrado.</p>;

    const playerData = financeData.paymentStatus?.find(p => p.player === selectedPlayer);
    const playerDebt = calculatePlayerDebt(playerData);

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
                            <button onClick={handleCopyPix} className="p-2 bg-indigo-500 rounded-lg hover:bg-indigo-400 transition-colors"><Copy className="w-4 h-4"/></button>
                        </div>
                        {copySuccess && <p className="text-emerald-400 text-xs font-bold mt-2">{copySuccess}</p>}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

// 4. ABA JOGOS
const JogosTab = ({ currentUser, isAdmin, scriptUrl, refreshKey }) => {
    const { data: gamesData, isLoading, refetch } = useDataQuery(['games', refreshKey], () => api.post(scriptUrl, { action: 'getGames' }), [refreshKey]);
    const games = [...(gamesData?.data || [])].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingGame, setEditingGame] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });

    const handleFormSubmit = async (e) => {
        e.preventDefault(); 
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const payload = { 
            action: editingGame ? 'updateGame' : 'createGame', 
            id: editingGame ? editingGame.id : undefined,
            data: formData.get('data'), 
            horario: formData.get('horario'), 
            local: formData.get('local') 
        };
        try {
            const res = await api.post(scriptUrl, payload);
            if (res.result === 'success') { 
                setIsModalOpen(false); 
                setEditingGame(null);
                refetch(); 
            }
            else throw new Error(res.message);
        } catch (err) { 
            setInfoModal({ isOpen: true, title: 'Erro', message: err.message }); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    const handleDeleteGame = async () => {
        if (!confirmDelete) return;
        try {
            const res = await api.post(scriptUrl, { action: 'deleteGame', id: confirmDelete.id });
            if (res.result === 'success') {
                setConfirmDelete(null);
                refetch();
            } else throw new Error(res.message);
        } catch (err) {
            setInfoModal({ isOpen: true, title: 'Erro', message: err.message });
        }
    };

    const handleAttendance = async (gameId, actionType) => {
        await api.post(scriptUrl, { action: 'handleAttendanceUpdate', itemId: gameId, playerName: currentUser.name, actionType, type: 'game' });
        refetch();
    };

    if (isLoading) return <Loader message="Carregando jogos..." />;
    
    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Calendário de Jogos</h2>
                {isAdmin && <button onClick={() => { setEditingGame(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-indigo-700 transition shadow-md">Criar Jogo</button>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {games.map(game => (
                    <GlassCard key={game.id} className="flex flex-col border-t-4 border-t-indigo-500 relative">
                        {isAdmin && (
                            <div className="absolute top-2 right-2 flex gap-1 bg-white/50 dark:bg-slate-800/50 rounded-lg p-1 backdrop-blur-sm">
                                <button onClick={() => { setEditingGame(game); setIsModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-indigo-600"><Edit className="w-4 h-4"/></button>
                                <button onClick={() => setConfirmDelete(game)} className="p-1.5 text-slate-500 hover:text-red-600"><Trash className="w-4 h-4"/></button>
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-4 mt-2">
                            <div><p className="text-2xl font-black">{new Date(game.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p><p className="text-sm font-semibold text-slate-500">{game.horario} @ {game.local}</p></div>
                            <div className="text-right bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl"><p className="text-2xl font-black text-indigo-600">{game.confirmados.length}</p><p className="text-[10px] uppercase font-bold text-slate-500">Confir.</p></div>
                        </div>
                        <div className="flex-grow mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                            <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">Presença</h4>
                            <div className="flex flex-wrap gap-1.5">{game.confirmados.map(name => <span key={name} className="bg-white dark:bg-slate-700 border dark:border-slate-600 px-2.5 py-1 text-xs font-bold rounded-lg">{name}</span>)}</div>
                        </div>
                        <button onClick={() => handleAttendance(game.id, game.confirmados.includes(currentUser.name) ? 'withdraw' : 'confirm')} className={`w-full font-bold py-3 px-4 rounded-xl transition-all ${game.confirmados.includes(currentUser.name) ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-indigo-600 text-white'}`}>
                            {game.confirmados.includes(currentUser.name) ? 'Desistir' : 'Confirmar Presença'}
                        </button>
                    </GlassCard>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGame ? "Editar Jogo" : "Novo Jogo"}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <input name="data" type="date" defaultValue={editingGame?.data} className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
                    <input name="horario" type="time" defaultValue={editingGame?.horario} className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
                    <input name="local" type="text" placeholder="Local" defaultValue={editingGame?.local} className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50">{isSubmitting ? 'Salvando...' : 'Agendar'}</button>
                </form>
            </Modal>

            <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar Exclusão">
                <p className="text-lg">Tem a certeza que quer apagar o jogo do dia <strong>{confirmDelete ? new Date(confirmDelete.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</strong>?</p>
                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={() => setConfirmDelete(null)} className="py-3 px-6 bg-slate-200 dark:bg-slate-700 font-bold rounded-xl hover:bg-slate-300">Cancelar</button>
                    <button onClick={handleDeleteGame} className="py-3 px-6 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg">Sim, Apagar</button>
                </div>
            </Modal>

            <Modal isOpen={infoModal.isOpen} onClose={() => setInfoModal({ isOpen: false, title: '', message: '' })} title={infoModal.title}><p>{infoModal.message}</p></Modal>
        </div>
    );
};

// 5. ABA EVENTOS
const EventosTab = ({ scriptUrl, currentUser, isAdmin, refreshKey }) => {
    const { data: eventsData, isLoading, refetch } = useDataQuery(['events', refreshKey], () => api.post(scriptUrl, { action: 'getEvents' }), [refreshKey]);
    const events = (eventsData?.data || []).map(e => ({ ...e, attendees: typeof e.attendees === 'string' ? e.attendees.split(',').filter(Boolean) : [] }));
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatCurrency = (val) => typeof val === 'number' ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';

    const handleFormSubmit = async (e) => {
        e.preventDefault(); 
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const payload = { 
            action: editingEvent ? 'updateEvent' : 'createEvent', 
            id: editingEvent ? editingEvent.id : undefined, 
            name: formData.get('name'), 
            date: formData.get('date'), 
            deadline: formData.get('deadline'), 
            location: formData.get('location'), 
            value: formData.get('value'), 
            description: formData.get('description') 
        };
        try {
            const res = await api.post(scriptUrl, payload);
            if (res.result === 'success') { setIsModalOpen(false); setEditingEvent(null); refetch(); }
            else throw new Error(res.message);
        } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
    };

    const handleDeleteEvent = async () => {
        if (!confirmDelete) return;
        try {
            const res = await api.post(scriptUrl, { action: 'deleteEvent', id: confirmDelete.id });
            if (res.result === 'success') { setConfirmDelete(null); refetch(); }
            else throw new Error(res.message);
        } catch (err) { alert(err.message); }
    };

    const handleAttendance = async (eventId, actionType) => {
        await api.post(scriptUrl, { action: 'handleAttendanceUpdate', itemId: eventId, playerName: currentUser.name, actionType, type: 'event' });
        refetch();
    };

    if (isLoading) return <Loader message="Carregando eventos..." />;
    
    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Eventos & Confraternizações</h2>
                {isAdmin && <button onClick={() => { setEditingEvent(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-indigo-700 transition">Criar Evento</button>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {events.map(event => {
                    const isConfirmed = event.attendees.includes(currentUser.name);
                    const isDeadlinePassed = new Date() > new Date(event.deadline);
                    const totalCollected = event.attendees.length * event.value;

                    return (
                        <GlassCard key={event.id} className="flex flex-col relative">
                            {isAdmin && (
                                <div className="absolute top-4 right-4 flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                                    <button onClick={() => { setEditingEvent(event); setIsModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-indigo-600"><Edit className="w-4 h-4"/></button>
                                    <button onClick={() => setConfirmDelete(event)} className="p-1.5 text-slate-500 hover:text-red-600"><Trash className="w-4 h-4"/></button>
                                </div>
                            )}
                            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 w-3/4">{event.name}</h3>
                            <p className="font-bold mt-2 text-slate-700 dark:text-slate-300">📅 {new Date(event.date).toLocaleDateString('pt-BR')}</p>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 mb-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">{event.description}</p>
                            
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
                                    <span className="font-bold text-slate-500 text-xs uppercase tracking-widest">Cota Individual</span>
                                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">{formatCurrency(event.value)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-slate-500">Arrecadado:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(totalCollected)}</span>
                                </div>
                            </div>

                            <div className="mb-6 flex-grow">
                                <div className="flex justify-between items-end mb-2">
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Confirmados ({event.attendees.length})</h4>
                                    <p className="text-[10px] uppercase font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Limite: {new Date(event.deadline).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2">{event.attendees.map(name => <span key={name} className="bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs font-bold rounded-lg">{name}</span>)}</div>
                            </div>
                            
                            <button onClick={() => handleAttendance(event.id, isConfirmed ? 'withdraw' : 'confirm')} disabled={isDeadlinePassed} className={`w-full font-bold py-3 px-4 mt-auto rounded-xl ${isDeadlinePassed ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : isConfirmed ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-indigo-600 text-white shadow-lg'}`}>
                                {isDeadlinePassed ? 'Inscrições Encerradas' : isConfirmed ? 'Desistir' : 'Confirmar Presença'}
                            </button>
                        </GlassCard>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvent ? "Editar Evento" : "Criar Evento"}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <input name="name" type="text" placeholder="Nome do Evento" defaultValue={editingEvent?.name} className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none" required />
                    <div className="grid grid-cols-2 gap-4">
                        <input name="date" type="datetime-local" defaultValue={editingEvent?.date ? new Date(editingEvent.date).toISOString().substring(0,16) : ''} className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none" required />
                        <input name="deadline" type="date" defaultValue={editingEvent?.deadline} className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none" required />
                    </div>
                    <input name="location" type="text" placeholder="Local" defaultValue={editingEvent?.location} className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none" required />
                    <input name="value" type="number" step="0.01" placeholder="Valor (R$)" defaultValue={editingEvent?.value} className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none" required />
                    <textarea name="description" placeholder="Detalhes..." defaultValue={editingEvent?.description} className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none" rows={3} required></textarea>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50">{isSubmitting ? 'A salvar...' : 'Salvar Evento'}</button>
                </form>
            </Modal>

            <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar">
                <p className="text-lg">Deseja apagar o evento <strong>{confirmDelete?.name}</strong>?</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setConfirmDelete(null)} className="py-3 px-6 bg-slate-200 dark:bg-slate-700 font-bold rounded-xl text-slate-800 dark:text-white">Cancelar</button>
                    <button onClick={handleDeleteEvent} className="py-3 px-6 bg-red-600 text-white font-bold rounded-xl">Apagar</button>
                </div>
            </Modal>
        </div>
    );
};

// 6. ABA SORTEIO
const SorteioTab = ({ allPlayersData, scriptUrl }) => {
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [teams, setTeams] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [modalInfo, setModalInfo] = useState({ isOpen: false, title: '', message: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [numToDraw, setNumToDraw] = useState(1);
    const [drawnPlayers, setDrawnPlayers] = useState([]);
    const [drawMode, setDrawMode] = useState('selection'); 

    const sortedPlayers = useMemo(() => [...allPlayersData].sort((a, b) => a.name.localeCompare(b.name)), [allPlayersData]);
    const filteredPlayers = useMemo(() => sortedPlayers.filter(player => player.name.toLowerCase().includes(searchQuery.toLowerCase())), [sortedPlayers, searchQuery]);

    const handlePlayerToggle = (playerName) => {
        setSelectedPlayers(prev => prev.includes(playerName) ? prev.filter(name => name !== playerName) : [...prev, playerName]);
    };

    const handleDrawTeams = () => {
        if (selectedPlayers.length < 10) { setModalInfo({ isOpen: true, title: 'Atenção', message: 'Selecione pelo menos 10 jogadores para formar dois times.' }); return; }
        const playersToDraw = [...selectedPlayers].slice(0, 10);
        for (let i = playersToDraw.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playersToDraw[i], playersToDraw[j]] = [playersToDraw[j], playersToDraw[i]];
        }
        setTeams({ teamBlack: playersToDraw.slice(0, 5), teamRed: playersToDraw.slice(5, 10) });
        setDrawMode('teams');
    };
    
    const handleCustomDraw = () => {
        const num = Number(numToDraw);
        if (selectedPlayers.length < num) { setModalInfo({ isOpen: true, title: 'Atenção', message: `Selecione pelo menos ${num} jogador(es) para sortear.` }); return; }
        const shuffled = [...selectedPlayers].sort(() => 0.5 - Math.random());
        setDrawnPlayers(shuffled.slice(0, num));
        setDrawMode('custom');
    };

    const handleSaveDraw = async () => {
        if (!teams) return;
        setIsLoading(true);
        try {
            const data = await api.post(scriptUrl, { action: 'saveTeams', teamBlack: teams.teamBlack.join(','), teamRed: teams.teamRed.join(',') });
            if (data.result === 'success') setModalInfo({ isOpen: true, title: 'Sucesso', message: 'Times salvos na planilha com sucesso!' });
            else throw new Error(data.message || 'Erro desconhecido.');
        } catch (error) { setModalInfo({ isOpen: true, title: 'Erro', message: error.message }); } 
        finally { setIsLoading(false); }
    };
    
    const handleReset = () => { setSelectedPlayers([]); setTeams(null); setDrawnPlayers([]); setDrawMode('selection'); setNumToDraw(1); };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <Modal isOpen={modalInfo.isOpen} onClose={() => setModalInfo({ isOpen: false, title: '', message: '' })} title={modalInfo.title}>
                <p className="text-slate-700 dark:text-slate-300">{modalInfo.message}</p>
            </Modal>

            {drawMode === 'selection' && (
                <GlassCard>
                    <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4 border-b border-slate-200 dark:border-slate-700 pb-6">
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Sorteador Automático</h2>
                            <p className="text-slate-500 mt-1 font-medium">Selecione os atletas disponíveis na quadra.</p>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 px-6 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{selectedPlayers.length}</span>
                            <span className="text-sm font-bold text-slate-500 uppercase ml-2">Selecionados</span>
                        </div>
                    </div>
                    
                    <div className="mb-8 relative">
                        <input type="text" placeholder="Buscar jogador..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
                        <svg className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-10 max-h-[50vh] overflow-y-auto pr-2 pb-2">
                        {filteredPlayers.map(player => (
                            <button
                                key={player.name}
                                onClick={() => handlePlayerToggle(player.name)}
                                className={`p-4 rounded-2xl text-center font-bold transition-all duration-200 ${
                                    selectedPlayers.includes(player.name)
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]'
                                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                }`}
                            >
                                {player.name}
                            </button>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center text-center">
                             <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Jogo Oficial (5x5)</h3>
                            <p className="text-sm text-slate-500 mb-6">Sorteia 2 times equilibrados. Mínimo 10 selecionados.</p>
                            <button onClick={handleDrawTeams} disabled={selectedPlayers.length < 10} className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/30">
                                Sortear Times
                            </button>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center text-center">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Sorteio Avulso</h3>
                            <p className="text-sm text-slate-500 mb-6">Escolha a quantidade para um sorteio rápido.</p>
                            <div className="flex gap-3 w-full">
                                <select value={numToDraw} onChange={(e) => setNumToDraw(Number(e.target.value))} className="w-1/3 p-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white">
                                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <button onClick={handleCustomDraw} disabled={selectedPlayers.length === 0} className="w-2/3 bg-purple-600 text-white font-bold py-4 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-600/30">
                                    Sortear Nomes
                                </button>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            )}

            {drawMode === 'teams' && teams && (
                <GlassCard className="text-center">
                    <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-10">Confronto Definido!</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                        <div className="hidden md:flex absolute inset-0 items-center justify-center z-10 pointer-events-none">
                            <span className="bg-white dark:bg-slate-800 text-slate-400 font-black text-3xl italic p-4 rounded-full shadow-lg border border-slate-200 dark:border-slate-700">VS</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
                            <h3 className="text-3xl font-black text-white mb-6 tracking-widest uppercase">Time Preto</h3>
                            <ul className="space-y-3 relative z-10">
                                {teams.teamBlack.map(player => (
                                    <li key={player} className="text-white text-xl font-bold bg-white/10 p-3 rounded-xl border border-white/10">{player}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-emerald-600 border border-emerald-500 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                             <h3 className="text-3xl font-black text-white mb-6 tracking-widest uppercase">Time Verde</h3>
                             <ul className="space-y-3 relative z-10">
                                {teams.teamRed.map(player => (
                                    <li key={player} className="text-white text-xl font-bold bg-white/20 p-3 rounded-xl border border-white/20">{player}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
                        {isLoading ? <Loader message="Salvando histórico..." /> : (
                            <button onClick={handleSaveDraw} className="w-full sm:w-auto bg-indigo-600 text-white font-bold py-4 px-8 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30">
                                Gravar na Planilha
                            </button>
                        )}
                        <button onClick={handleReset} className="w-full sm:w-auto bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold py-4 px-8 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-all">
                            Refazer Sorteio
                        </button>
                    </div>
                </GlassCard>
            )}

            {drawMode === 'custom' && (
                <GlassCard className="text-center">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-8">Sorteio Avulso Concluído</h2>
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 p-8 rounded-3xl max-w-lg mx-auto">
                        <ul className="space-y-4">
                            {drawnPlayers.map((player, idx) => (
                                <li key={player} className="text-purple-700 dark:text-purple-300 text-2xl font-black bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex items-center gap-4">
                                    <span className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center text-sm">{idx+1}</span>
                                    {player}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="mt-10">
                        <button onClick={handleReset} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold py-4 px-8 rounded-xl hover:bg-slate-300 transition-all">
                            Voltar
                        </button>
                    </div>
                </GlassCard>
            )}
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
const NotificacoesTab = ({ scriptUrl }) => {
    const { data: notifData, isLoading, error, refetch } = useDataQuery(['notifications'], () => api.post(scriptUrl, { action: 'getNotifications' }));

    const notifications = useMemo(() => {
        if (!notifData?.data) return [];
        return [...notifData.data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
            const data = await api.post(scriptUrl, { 
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
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Título do Alerta</label>
                        <input name="title" type="text" placeholder="Ex: Novo Jogo Confirmado!" className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-white" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Corpo da Mensagem</label>
                        <textarea name="message" placeholder="Escreva a mensagem..." className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white resize-none" rows={4} required></textarea>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Ao clicar, abrir na aba:</label>
                        <select value={targetTab} onChange={(e) => setTargetTab(e.target.value)} className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
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
                {isLoading ? <Loader /> : error ? <p className="text-red-500">{error}</p> : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {notifications.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                Nenhum envio registado no sistema.
                            </div>
                        ) : notifications.map((notif, idx) => (
                            <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
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

// --- MAIN APP ---
const MainApp = ({ user, onLogout, SCRIPT_URL }) => {
    const [activeTab, setActiveTab] = useState('presenca');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { data: initialData, isLoading, refetch } = useDataQuery(['initialData'], () => api.post(SCRIPT_URL, { action: 'getInitialAppData' }));
    
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const TABS = useMemo(() => isAdmin ? ['presenca', 'relatorios', 'financas', 'jogos', 'eventos', 'sorteio', 'estatuto', 'notificacoes'] : ['presenca', 'relatorios', 'financas', 'jogos', 'eventos', 'sorteio', 'estatuto'], [isAdmin]);

    useEffect(() => {
        window.navigateToTab = (tabName) => { if (TABS.includes(tabName)) setActiveTab(tabName); };
        return () => delete window.navigateToTab;
    }, [TABS]);

    const TAB_CONFIG = {
        presenca: { icon: <Activity className="w-6 h-6 md:w-7 md:h-7 shrink-0" />, color: 'text-emerald-500 dark:text-emerald-400', activeBg: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' },
        jogos: { icon: <CalendarDays className="w-6 h-6 md:w-7 md:h-7 shrink-0" />, color: 'text-orange-500 dark:text-orange-400', activeBg: 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' },
        estatuto: { icon: <BookOpen className="w-6 h-6 md:w-7 md:h-7 shrink-0" />, color: 'text-teal-500 dark:text-teal-400', activeBg: 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' },
        financas: { icon: <DollarSign className="w-6 h-6 md:w-7 md:h-7 shrink-0" />, color: 'text-rose-500 dark:text-rose-400', activeBg: 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' },
        sorteio: { icon: <Users className="w-6 h-6 md:w-7 md:h-7 shrink-0" />, color: 'text-amber-500 dark:text-amber-400', activeBg: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' },
        eventos: { icon: <PartyPopper className="w-6 h-6 md:w-7 md:h-7 shrink-0" />, color: 'text-purple-500 dark:text-purple-400', activeBg: 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' },
        relatorios: { icon: <BarChart className="w-6 h-6 md:w-7 md:h-7 shrink-0" />, color: 'text-blue-500 dark:text-blue-400', activeBg: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' },
        notificacoes: { icon: <BellRing className="w-6 h-6 md:w-7 md:h-7 shrink-0" />, color: 'text-pink-500 dark:text-pink-400', activeBg: 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' },
    };

    const renderContent = () => {
        if (isLoading) return <Loader message="Carregando dados na quadra..." />;
        
        const appData = initialData?.data;
        
        const props = { 
            allPlayersData: appData?.dashboard?.players || [], 
            dates: appData?.dashboard?.dates || [], 
            financeData: appData?.finance, 
            nextGame: appData?.nextGame, 
            currentUser: user, isAdmin, scriptUrl: SCRIPT_URL, 
            pixCode: appData?.pixCode, refreshKey: Date.now() 
        };

        return (
            <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {activeTab === 'presenca' && <PresencaTab {...props} onAttendanceUpdate={refetch} onNavigate={setActiveTab} />}
                    {activeTab === 'relatorios' && <RelatoriosTab {...props} />}
                    {activeTab === 'financas' && <FinancasTab {...props} />}
                    {activeTab === 'jogos' && <JogosTab {...props} />}
                    {activeTab === 'eventos' && <EventosTab {...props} />}
                    {activeTab === 'sorteio' && <SorteioTab {...props} />}
                    {activeTab === 'estatuto' && <EstatutoTab />}
                    {activeTab === 'notificacoes' && <NotificacoesTab {...props} scriptUrl={SCRIPT_URL} />}
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 overflow-hidden">
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
                )}
            </AnimatePresence>

            <nav className={`fixed inset-y-0 left-0 z-50 md:relative transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 w-[72px] md:w-24 shrink-0 h-full flex flex-col items-center py-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border-r border-slate-200/50 dark:border-slate-700/50 shadow-2xl md:shadow-lg overflow-y-auto hide-scrollbar gap-4`}>
                <img src="https://lh3.googleusercontent.com/d/131DvcfgiRLLp9irVnVY8m9qNuM-0y7f8" alt="Logo" className="w-12 h-12 rounded-full mb-4" />
                {TABS.map(tab => (
                    <button key={tab} onClick={() => { setActiveTab(tab); setIsSidebarOpen(false); }} className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${activeTab === tab ? `${TAB_CONFIG[tab].activeBg} shadow-lg scale-110` : `${TAB_CONFIG[tab].color} hover:bg-slate-100 dark:hover:bg-slate-800`}`}>
                        {TAB_CONFIG[tab].icon}
                    </button>
                ))}
            </nav>

            <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
                <header className="shrink-0 p-4 flex justify-between items-center bg-white/40 dark:bg-slate-800/30 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><Menu className="w-6 h-6" /></button>
                        <img src={user.fotoUrl || 'https://placehold.co/100'} alt="Avatar" className="h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-700" crossOrigin="anonymous" />
                        <div className="hidden sm:block"><h1 className="text-xl font-black leading-none">Portal CBA</h1><p className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest">{user.name}</p></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={refetch} className="p-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl shadow-sm hover:shadow-md"><RefreshCw className="w-5 h-5" /></button>
                        <button onClick={onLogout} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-rose-500 font-bold text-sm rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-slate-200 dark:border-slate-700 flex items-center gap-2"><LogOut className="w-4 h-4 hidden sm:block"/> Sair</button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-8"><div className="max-w-7xl mx-auto pb-20">{renderContent()}</div></main>
            </div>
        </div>
    );
};

export default function App() {
    const [auth, setAuth] = useState({ status: 'unauthenticated', user: null, error: null });
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwNXGI4Cc5qGBye-IfWW_qqUcJ04NfArulExPXE4jgX0SZhWAmeWCjjKg2U9FFfHkHE/exec";

    useEffect(() => {
        if (!window.html2pdf) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            document.body.appendChild(script);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuth({ status: 'loading', user: null, error: null });
        const formData = new FormData(e.currentTarget);
        try {
            const data = await api.post(SCRIPT_URL, { action: 'loginUser', email: formData.get('email'), password: formData.get('password') });
            if (data.status === 'approved') setAuth({ status: 'authenticated', user: data, error: null });
            else setAuth({ status: 'unauthenticated', user: null, error: data.message });
        } catch (error) { setAuth({ status: 'unauthenticated', user: null, error: 'Falha no servidor.' }); }
    };

    return (
        <ThemeProvider>
            {auth.status === 'authenticated' ? <MainApp user={auth.user} onLogout={() => setAuth({ status: 'unauthenticated', user: null, error: null })} SCRIPT_URL={SCRIPT_URL} /> : <LoginScreen onLogin={handleLogin} isLoading={auth.status === 'loading'} error={auth.error} />}
        </ThemeProvider>
    );
}