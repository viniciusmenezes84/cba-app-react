import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';

// --- CONTEXTO DE TEMA (Light/Dark Mode) ---
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
    const theme = 'dark';
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light');
        root.classList.add('dark');
    }, []);
    return (
        <ThemeContext.Provider value={{ theme, toggleTheme: () => {} }}>
            {children}
        </ThemeContext.Provider>
    );
};

const useTheme = () => useContext(ThemeContext);

// --- FUNÇÕES AUXILIARES DE COMUNICAÇÃO COM O SERVIDOR ---
const fetchWithGet = async (baseUrl, params) => {
    try {
        const url = new URL(baseUrl);
        const allParams = { ...params, cacheBust: new Date().getTime() };
        Object.keys(allParams).forEach(key => url.searchParams.append(key, allParams[key]));
        
        const res = await fetch(url, { method: 'GET', mode: 'cors', cache: 'no-cache' });
        if (!res.ok) throw new Error(`Erro de HTTP: ${res.status}`);
        return res.json();
    } catch (error) {
        console.error('Fetch GET error:', error);
        throw error;
    }
};

const fetchWithPost = async (baseUrl, params) => {
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
};

// --- CUSTOM HOOK PARA CACHE E DESEMPENHO ---
const useDataQuery = (key, queryFn, dependencies = []) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const queryFnRef = useRef(queryFn);

    useEffect(() => { queryFnRef.current = queryFn; }, [queryFn]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await queryFnRef.current();
            setData(result);
        } catch (err) {
            setError(err.message || "Erro desconhecido ao buscar dados.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchData, ...dependencies]);

    return { data, isLoading, error, refetch: fetchData };
};

// --- COMPONENTES UI (GLASSMORPHISM) ---
const GlassCard = ({ children, className = '', animate = true, onClick }) => {
    const clickableClass = onClick ? 'cursor-pointer transition-transform hover:scale-[1.02]' : '';
    return (
        <div onClick={onClick} className={`bg-white/80 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-xl rounded-3xl p-6 ${animate ? 'animate-fade-in-up' : ''} ${clickableClass} ${className}`}>
            {children}
        </div>
    );
};

const Loader = ({ message }) => (
    <div className="flex flex-col justify-center items-center py-20 text-center text-slate-500 dark:text-slate-400">
        <div className="w-14 h-14 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin shadow-lg"></div>
        {message && <p className="mt-6 text-lg font-medium animate-pulse">{message}</p>}
    </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto transform transition-all scale-100 animate-fade-in-up">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-700 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="mt-5">{children}</div>
            </div>
        </div>
    );
};

const AccordionItem = ({ title, children, isOpen, onClick }) => {
    const contentRef = useRef(null);
    return (
        <div className="border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden mb-4 transition-all duration-300 bg-white/50 dark:bg-slate-800/30">
            <button
                className="flex justify-between items-center w-full p-5 font-semibold text-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={onClick}
            >
                <span>{title}</span>
                <svg className={`w-6 h-6 shrink-0 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            <div ref={contentRef} style={{ maxHeight: isOpen ? `${contentRef.current?.scrollHeight}px` : '0' }} className="overflow-hidden transition-all duration-500 ease-in-out">
                <div className="p-6 prose dark:prose-invert max-w-none border-t border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300">{children}</div>
            </div>
        </div>
    );
};

const ChartComponent = ({ chartConfig }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const { theme } = useTheme();

    useEffect(() => {
        if (chartInstance.current) chartInstance.current.destroy();
        if (chartRef.current && chartConfig && window.Chart) {
            const ctx = chartRef.current.getContext('2d');
            const isDark = theme === 'dark';
            
            const updatedConfig = JSON.parse(JSON.stringify(chartConfig)); 
            if(updatedConfig.options?.scales?.y?.ticks) updatedConfig.options.scales.y.ticks.color = isDark ? '#94a3b8' : '#64748b';
            if(updatedConfig.options?.scales?.x?.ticks) updatedConfig.options.scales.x.ticks.color = isDark ? '#94a3b8' : '#64748b';
            if(updatedConfig.options?.plugins?.legend?.labels) updatedConfig.options.plugins.legend.labels.color = isDark ? '#e2e8f0' : '#475569';

            chartInstance.current = new window.Chart(ctx, updatedConfig);
        }
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [chartConfig, theme]);

    return <canvas ref={chartRef}></canvas>;
};

// --- AUTENTICAÇÃO E ACESSO ---
const LoginScreen = ({ onLogin, isLoading, error }) => (
    <div className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2070&auto=format&fit=crop')" }}>
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
        <div className="relative z-10 p-10 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl text-center w-full max-w-md animate-fade-in-up">
            <img src="https://lh3.googleusercontent.com/d/131DvcfgiRLLp9irVnVY8m9qNuM-0y7f8" alt="Logo CBA" className="h-28 w-28 rounded-full shadow-2xl mx-auto mb-6 ring-4 ring-white/20" />
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Portal do CBA</h1>
            <p className="text-slate-300 mb-8 font-medium">Basquete dos Aposentados</p>
            {error && <p className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm">{error}</p>}
            <form onSubmit={onLogin} className="space-y-5">
                <input name="email" type="email" placeholder="Email" className="w-full p-4 bg-slate-800/50 border border-slate-600 text-white rounded-xl placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" required />
                <input name="password" type="password" placeholder="Senha" className="w-full p-4 bg-slate-800/50 border border-slate-600 text-white rounded-xl placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" required />
                <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 disabled:opacity-70 transition-all transform hover:scale-[1.02] active:scale-95">
                    {isLoading ? 'Autenticando...' : 'Entrar na Área Restrita'}
                </button>
            </form>
        </div>
    </div>
);

const PendingScreen = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
        <div className="p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl text-center max-w-md">
            <h2 className="text-3xl font-black text-amber-500 mb-4">Acesso Pendente</h2>
            <p className="text-slate-600 dark:text-slate-300">O seu pedido de acesso foi enviado. Por favor, aguarde a aprovação de um administrador.</p>
        </div>
    </div>
);

const ResetPasswordModal = ({ isOpen, onClose, user, scriptUrl }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: 'As senhas não coincidem.' }); return; }
        if (!/^(?=.*[A-Z])(?=.*[0-9])/.test(newPassword)) { setMessage({ type: 'error', text: 'A senha deve conter pelo menos uma letra maiúscula e um número.' }); return; }

        setIsSubmitting(true);
        try {
            const data = await fetchWithPost(scriptUrl, { action: 'resetPassword', email: user.email, newPassword });
            if (data.result === 'success') {
                setMessage({ type: 'success', text: 'Senha alterada com sucesso! A sair...' });
                setTimeout(() => onClose(true), 2000);
            } else throw new Error(data.message || 'Erro desconhecido.');
        } catch (error) { setMessage({ type: 'error', text: error.message }); } 
        finally { setIsSubmitting(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={() => onClose(false)} title="Resetar Senha">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nova Senha</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                    <p className="text-xs text-slate-500 mt-1">Deve conter letras maiúsculas e números.</p>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Confirmar Senha</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                </div>
                {message.text && <p className={`p-3 rounded-xl font-bold text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{message.text}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg">
                    {isSubmitting ? 'A alterar...' : 'Alterar Senha'}
                </button>
            </form>
        </Modal>
    );
};

// --- COMPONENTES ESPECÍFICOS ---
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
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
            </div>
            <h2 className="text-xl text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider mb-4">Próximo Jogo</h2>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-3 w-full md:w-auto relative z-10">
                    <div className="flex items-center text-slate-800 dark:text-slate-100">
                        <span className="text-2xl mr-3">📅</span>
                        <span className="text-xl font-bold">{gameDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })} às {game.horario}</span>
                    </div>
                    <div className="flex items-center text-slate-600 dark:text-slate-300">
                        <span className="text-2xl mr-3">📍</span>
                        <span className="text-lg font-medium">{game.local}</span>
                    </div>
                    <div className="flex items-center text-slate-600 dark:text-slate-300">
                        <span className="text-2xl mr-3">🔥</span>
                        <span className="text-lg font-medium"><strong className="text-indigo-600 dark:text-indigo-400">{game.confirmados.length}</strong> Confirmados</span>
                    </div>
                </div>
                <div className="w-full md:w-64 shrink-0 z-10">
                    {isConfirmed ? (
                        <button onClick={() => onAttendanceUpdate(game.id, 'withdraw')} className="w-full font-bold py-4 px-6 rounded-2xl transition-all bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white shadow-lg">
                            Desistir (❌)
                        </button>
                    ) : (
                        <button onClick={() => onAttendanceUpdate(game.id, 'confirm')} className="w-full font-bold py-4 px-6 rounded-2xl transition-all bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 shadow-xl shadow-indigo-500/30">
                            Estou Dentro! (✅)
                        </button>
                    )}
                </div>
            </div>
        </GlassCard>
    );
};

// ==========================================
// --- DEFINIÇÃO DAS ABAS DA APLICAÇÃO ---
// ==========================================

// 1. ABA PRESENÇA (DASHBOARD PRINCIPAL)
const PresencaTab = ({ allPlayersData, dates, financeData, isLoading, error, nextGame, currentUser, onAttendanceUpdate, onNavigate }) => {
    const availableYears = useMemo(() => {
        if (!dates || dates.length === 0) return [new Date().getFullYear().toString()];
        const uniqueDates = [...new Set(dates)];
        return [...new Set(uniqueDates.map(d => d.substring(0, 4)))].sort((a, b) => b - a);
    }, [dates]);

    const [selectedYear, setSelectedYear] = useState(availableYears[0]);
    
    const filteredDatesByYear = useMemo(() => {
        const uniqueDates = [...new Set(dates || [])];
        return uniqueDates.filter(d => d.startsWith(selectedYear));
    }, [dates, selectedYear]);

    // Filtrar apenas datas que realmente ocorreram
    const playedDatesByYear = useMemo(() => {
        return filteredDatesByYear.filter(date =>
            allPlayersData.some(p => p.attendance[date]?.includes('✅'))
        );
    }, [filteredDatesByYear, allPlayersData]);

    const playersWithStats = useMemo(() => {
        if (!allPlayersData || !playedDatesByYear.length) return [];
        
        return allPlayersData.map(p => {
            let validGames = 0;
            let presences = 0;
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

    // Destaque do Ano: Quem tem MAIS presenças absolutas vence.
    const topPresencePlayer = [...playersWithStats]
        .filter(p => p.validGames > 0 && p.isEligibleForHoF !== false && String(p.isEligibleForHoF).toUpperCase() !== 'FALSE')
        .sort((a,b) => {
            if (b.presences !== a.presences) return b.presences - a.presences;
            if (b.percentage !== a.percentage) return b.percentage - a.percentage;
            return 0;
        })[0];

    // Maior Média Ano: Maior %, com desempate por nº de presenças
    const topPercentagePlayer = [...playersWithStats]
        .filter(p => p.validGames > 0 && p.isEligibleForHoF !== false && String(p.isEligibleForHoF).toUpperCase() !== 'FALSE')
        .sort((a,b) => b.percentage - a.percentage || b.presences - a.presences)[0];

    const totalAtletas = allPlayersData.length;
    let totalValidPlayerGames = 0;
    let totalGlobalPresences = 0;

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

    // Status Financeiro Pessoal
    const myFinanceRecord = financeData?.paymentStatus?.find(p => p.player.toLowerCase() === currentUser.name.toLowerCase());
    let myDebt = 0;
    if (myFinanceRecord && financeData?.paymentHeaders) {
        const monthMap = { "janeiro": 0, "fevereiro": 1, "março": 2, "abril": 3, "maio": 4, "junho": 5, "julho": 6, "agosto": 7, "setembro": 8, "outubro": 9, "novembro": 10, "dezembro": 11 };
        const currentMonth = new Date().getMonth();
        financeData.paymentHeaders.forEach(m => {
            const statusStr = String(myFinanceRecord.statuses[m] || '').trim().toLowerCase();
            const mIndex = monthMap[m.toLowerCase()];
            if (statusStr !== 'isento' && statusStr !== '20' && mIndex < currentMonth) {
                myDebt += 20;
            }
        });
    }

    // Gráfico Agrupado por Mês
    const chartData = useMemo(() => {
        const monthlyData = new Array(12).fill(0);
        const monthsMap = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

        playedDatesByYear.forEach(dateStr => {
            const monthIndex = parseInt(dateStr.substring(5, 7), 10) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                const gamePresences = allPlayersData.reduce((c, p) => c + (p.attendance[dateStr]?.includes('✅') ? 1 : 0), 0);
                monthlyData[monthIndex] += gamePresences;
            }
        });

        return {
            type: 'bar',
            data: {
                labels: monthsMap,
                datasets: [{
                    label: 'Total de Presenças',
                    data: monthlyData,
                    backgroundColor: '#818cf8',
                    borderRadius: 4
                }]
            },
            options: { 
                scales: { y: { beginAtZero: true } }, 
                plugins: { legend: { display: false } } 
            }
        };
    }, [playedDatesByYear, allPlayersData]);

    if (isLoading) return <Loader message="Sincronizando quadra..." />;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="space-y-6 animate-fade-in-up">
            <ProximoJogoCard game={nextGame} currentUser={currentUser} onAttendanceUpdate={onAttendanceUpdate} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Destaque do Ano Card */}
                <GlassCard className="col-span-1 md:col-span-2 bg-gradient-to-br from-orange-500 to-rose-600 !text-white border-none flex items-center justify-between overflow-hidden relative">
                    <div className="absolute -right-10 opacity-20 text-[150px]">🏆</div>
                    <div className="relative z-10">
                        <h3 className="text-orange-200 font-bold uppercase tracking-wider text-xs mb-1">Destaque do Ano</h3>
                        <p className="text-3xl font-black mb-1">{topPresencePlayer?.name || '--'}</p>
                        <p className="text-lg font-medium">{topPresencePlayer?.presences || 0} presenças em {jogosRealizados} jogos</p>
                    </div>
                </GlassCard>

                <GlassCard className="col-span-1 md:col-span-1 flex flex-col justify-center items-center text-center">
                    <h3 className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-2">Maior Média Ano</h3>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{topPercentagePlayer?.name || '--'}</p>
                    <span className="mt-2 px-4 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-black rounded-full">
                        {topPercentagePlayer?.percentage?.toFixed(0)}%
                    </span>
                </GlassCard>

                <GlassCard className="col-span-1 md:col-span-1 flex flex-col justify-center items-center text-center bg-indigo-50 dark:bg-indigo-900/20">
                    <h3 className="text-indigo-500 font-bold uppercase tracking-wider text-xs mb-2">Jogos Realizados</h3>
                    <p className="text-5xl font-black text-indigo-600 dark:text-indigo-400">{jogosRealizados}</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Em {selectedYear}</p>
                </GlassCard>

                <GlassCard 
                    className={`col-span-1 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between overflow-hidden relative ${myDebt > 0 ? 'bg-gradient-to-br from-rose-500 to-red-600 !text-white border-none' : 'bg-gradient-to-br from-emerald-500 to-teal-600 !text-white border-none'}`} 
                    onClick={() => {
                        if (onNavigate) onNavigate('financas');
                        else if (window.navigateToTab) window.navigateToTab('financas');
                    }}
                >
                    <div className="absolute -right-4 opacity-20 text-[100px] pointer-events-none">{myDebt > 0 ? '⚠️' : '✅'}</div>
                    <div className="relative z-10 flex-grow pr-4">
                        <h3 className="font-bold uppercase tracking-wider text-xs mb-1 opacity-80">Meu Status Financeiro</h3>
                        <p className="text-2xl font-black mb-1">{myDebt > 0 ? 'Mensalidade Atrasada' : 'Tudo em Dia!'}</p>
                        <p className="text-sm font-medium">{myDebt > 0 ? `Você possui pendências de R$ ${myDebt.toFixed(2)}.` : 'Obrigado por fortalecer o CBA.'}</p>
                    </div>
                    <div className="relative z-10 mt-4 sm:mt-0 shrink-0">
                        <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-md ${myDebt > 0 ? 'bg-white text-rose-600' : 'bg-white text-emerald-600'}`}>Ver Detalhes →</span>
                    </div>
                </GlassCard>

                <GlassCard className="col-span-1 flex flex-col justify-center items-center text-center bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                    <h3 className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-2">Atletas Ativos</h3>
                    <p className="text-4xl font-black text-slate-800 dark:text-white">{totalAtletas}</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Registados no Elenco</p>
                </GlassCard>

                <GlassCard className="col-span-1 flex flex-col justify-center items-center text-center bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                    <h3 className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-2">Quórum Médio</h3>
                    <p className="text-4xl font-black text-slate-800 dark:text-white">{globalAverage.toFixed(0)}%</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Presença da Equipa</p>
                </GlassCard>

                <GlassCard className="col-span-1 md:col-span-4">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tendência de Quórum (Mensal)</h3>
                        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl outline-none font-bold text-sm">
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="h-64">
                        <ChartComponent chartConfig={chartData} />
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

// 2. ABA RELATÓRIOS E EXPORTAÇÃO PDF
const RelatoriosTab = ({ allPlayersData, dates }) => {
    const [selectedPlayer, setSelectedPlayer] = useState('todos');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [sortConfig, setSortConfig] = useState({ key: 'percentage', direction: 'desc' });
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const availableYears = useMemo(() => {
        if (!dates || dates.length === 0) return [new Date().getFullYear().toString()];
        const uniqueDates = [...new Set(dates)];
        const years = [...new Set(uniqueDates.map(d => d.substring(0, 4)))];
        return years.sort((a, b) => b - a);
    }, [dates]);

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
            let validGames = 0;
            let presences = 0;
            let faults = 0;

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
    const singlePlayerChart = useMemo(() => (!singlePlayer ? null : {
        type: 'doughnut', data: { labels: ['Presença', 'Ausência'], datasets: [{ data: [singlePlayer.presences, singlePlayer.totalGames - singlePlayer.presences], backgroundColor: ['#4f46e5', '#334155'], borderWidth: 0, cutout: '75%' }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    }), [singlePlayer]);

    // Exportação do PDF Corporativo
    const handleExportPDF = async () => {
        if (!window.html2pdf) {
            alert('A biblioteca de PDF ainda não foi carregada. Aguarde um instante.');
            return;
        }
        setIsGeneratingPDF(true);

        setTimeout(() => {
            const element = document.getElementById('pdf-corporate-report');
            const opt = {
                margin:       [0.4, 0, 0.4, 0], 
                filename:     `Relatorio_CBA_${selectedYear}_${selectedPlayer === 'todos' ? 'Geral' : selectedPlayer.replace(/\s+/g, '_')}.pdf`,
                image:        { type: 'jpeg', quality: 1 },
                html2canvas:  { scale: 2, useCORS: true, width: 794 }, 
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
            };

            window.html2pdf().set(opt).from(element).save().then(() => {
                setIsGeneratingPDF(false);
            });
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
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // Dados Globais para o PDF
    const globalTotalGames = playedDates.length;
    const globalAveragePercentage = reportData.length > 0 
        ? reportData.reduce((acc, curr) => acc + curr.percentage, 0) / reportData.length 
        : 0;

    return (
        <div className="space-y-8 animate-fade-in-up">
            <GlassCard className="flex flex-col xl:flex-row justify-between items-center gap-4">
                <div className="flex items-center w-full xl:w-auto">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl mr-4"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012-2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></div>
                    <div><h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Central de Relatórios</h2><p className="text-sm text-slate-500">Dados operacionais e performance</p></div>
                </div>
                
                {/* Seletores & Botões de Exportação */}
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                    <div className="flex gap-3">
                        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold outline-none flex-1 md:w-32">{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
                        <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl flex-grow md:w-64 outline-none">
                            <option value="todos">Resumo do Elenco</option>
                            {[...allPlayersData].sort((a,b)=>a.name.localeCompare(b.name)).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                        <button onClick={handleShareWhatsApp} className="flex-1 md:flex-none p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md" title="Enviar resumo por WhatsApp">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.267.655 4.398 1.908 6.161l.217.324-1.251 4.565 4.654-1.225.308.214z"/></svg>
                            <span className="hidden sm:block">Partilhar</span>
                        </button>
                        <button onClick={handleExportPDF} disabled={isGeneratingPDF} className="flex-1 md:flex-none p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50" title="Gerar PDF corporativo">
                            {isGeneratingPDF ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            )}
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
                            <div key={p.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/30">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* PLAYER CARD */}
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
                                <ChartComponent chartConfig={singlePlayerChart} />
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
            )}

            {/* ========================================================= */}
            {/* RELATÓRIO OCULTO PARA EXPORTAÇÃO EM PDF (ESTILO CORPORATIVO) */}
            {/* ========================================================= */}
            <div className="absolute opacity-0 pointer-events-none -z-50 left-[-9999px] top-[-9999px]">
                <div id="pdf-corporate-report" style={{ width: '794px', backgroundColor: '#ffffff', boxSizing: 'border-box' }} className="p-10 text-slate-800">
                    
                    {/* Cabeçalho do PDF */}
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
                            {/* Resumo do Elenco PDF */}
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

                            {/* Top Performers Bar Chart PDF */}
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

                            {/* Tabela Completa PDF */}
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
                            {/* Relatório Individual PDF */}
                            <div className="flex gap-8 mb-10">
                                <div className="shrink-0">
                                    {singlePlayer.fotoUrl ? (
                                        <img src={singlePlayer.fotoUrl} className="w-48 h-48 rounded-2xl object-cover shadow-lg border border-slate-200" crossOrigin="anonymous" />
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
        else {
            const userRecord = financeData.paymentStatus.find(p => p.player.toLowerCase() === currentUser.name.toLowerCase());
            if (userRecord) setSelectedPlayer(userRecord.player);
        }
    }, [financeData, isAdmin, currentUser.name]);

    const getEnhancedStatus = (monthName, originalStatus) => {
        const statusStr = String(originalStatus || '').trim().toLowerCase();
        if (statusStr === 'isento') return { text: 'Isento', code: 'isento' };
        if (statusStr === '20') return { text: 'Pago', code: 'pago' };
        
        const monthMap = { "janeiro": 0, "fevereiro": 1, "março": 2, "abril": 3, "maio": 4, "junho": 5, "julho": 6, "agosto": 7, "setembro": 8, "outubro": 9, "novembro": 10, "dezembro": 11 };
        const currentMonth = new Date().getMonth();
        if (monthMap[monthName.toLowerCase()] < currentMonth) return { text: 'Em Atraso', code: 'atraso' };
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
        let totalReceber = 0;
        let inadimplentes = [];
        
        financeData.paymentStatus.forEach(p => {
            const debt = calculatePlayerDebt(p);
            if (debt > 0) {
                totalReceber += debt;
                inadimplentes.push({ name: p.player, debt });
            }
        });
        inadimplentes.sort((a,b) => b.debt - a.debt);
        return { totalReceber, inadimplentes };
    }, [financeData]);

    const handleSendReports = async () => {
        setIsSending(true);
        setEmailMessage({ text: 'A enviar relatórios...', type: 'info' });
        try {
            const data = await fetchWithPost(scriptUrl, { action: 'sendFinanceReports' });
            if (data.result === 'success') {
                setEmailMessage({ text: data.message, type: 'success' });
            } else {
                throw new Error(data.message || 'Erro desconhecido.');
            }
        } catch (error) {
            setEmailMessage({ text: `Erro: ${error.message}`, type: 'error' });
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) return <Loader message="Sincronizando cofre..." />;
    if (error) return <p className="text-center text-red-500 py-8">{error}</p>;
    if (!financeData) return <p className="text-center text-slate-500 py-8">Nenhum dado financeiro encontrado.</p>;

    const playerData = financeData.paymentStatus?.find(p => p.player === selectedPlayer);
    const playerDebt = calculatePlayerDebt(playerData);

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="bg-indigo-600 border-none !text-white text-center">
                    <h3 className="text-indigo-200 font-bold mb-1 uppercase tracking-wider text-sm">Saldo em Caixa</h3>
                    <p className="text-4xl font-black">R$ {financeData.summary.balance.toFixed(2)}</p>
                </GlassCard>
                <GlassCard className="text-center">
                    <h3 className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-sm">Total Receitas</h3>
                    <p className="text-3xl font-bold text-emerald-500">R$ {financeData.summary.revenue.toFixed(2)}</p>
                </GlassCard>
                <GlassCard className="text-center">
                    <h3 className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-sm">Total Despesas</h3>
                    <p className="text-3xl font-bold text-rose-500">R$ {financeData.summary.expense.toFixed(2)}</p>
                </GlassCard>
            </div>

            {isAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <GlassCard className="border-orange-500/30">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Painel de Cobrança</h3>
                            <span className="px-4 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 font-bold rounded-full">
                                A Receber: R$ {adminStats.totalReceber.toFixed(2)}
                            </span>
                        </div>
                        <div className="max-h-60 overflow-y-auto pr-2">
                            {adminStats.inadimplentes.length === 0 ? <p className="text-emerald-500 font-bold">Todos em dia! 🎉</p> : 
                            <ul className="space-y-3">
                                {adminStats.inadimplentes.map(p => (
                                    <li key={p.name} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                                        <span className="text-rose-500 font-bold">R$ {p.debt.toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={handleSendReports} disabled={isSending} className="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-cyan-700 disabled:bg-slate-400 transition-all shadow-md">
                                {isSending ? 'Enviando...' : 'Enviar Relatório por Email'}
                            </button>
                            {emailMessage.text && <p className={`mt-2 text-sm text-center font-bold ${emailMessage.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>{emailMessage.text}</p>}
                        </div>
                    </GlassCard>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <GlassCard className="lg:col-span-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Linha do Tempo Anual</h2>
                        {isAdmin && (
                            <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500">
                                {financeData.paymentStatus?.map(p => <option key={p.player} value={p.player}>{p.player}</option>)}
                            </select>
                        )}
                    </div>

                    {playerData ? (
                        <div>
                            {playerDebt > 0 && (
                                <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <h4 className="text-rose-600 dark:text-rose-400 font-bold text-lg">Atenção! Há pendências.</h4>
                                        <p className="text-sm text-rose-500/80">Regularize sua situação para não perder benefícios.</p>
                                    </div>
                                    <span className="text-3xl font-black text-rose-600 dark:text-rose-400">R$ {playerDebt.toFixed(2)}</span>
                                </div>
                            )}
                            
                            <div className="relative border-l-4 border-slate-200 dark:border-slate-700 ml-4 py-2 space-y-8">
                                {financeData.paymentHeaders?.map((month, index) => {
                                    const status = getEnhancedStatus(month, playerData.statuses[month]);
                                    const colors = {
                                        pago: 'bg-emerald-500 ring-emerald-500/30',
                                        atraso: 'bg-rose-500 ring-rose-500/30',
                                        pendente: 'bg-slate-300 dark:bg-slate-600 ring-transparent',
                                        isento: 'bg-blue-500 ring-blue-500/30'
                                    };
                                    return (
                                        <div key={month} className="relative flex items-center group">
                                            <div className={`absolute -left-[14px] w-6 h-6 rounded-full ring-4 border-2 border-white dark:border-slate-800 ${colors[status.code]} transition-transform group-hover:scale-125`}></div>
                                            <div className="ml-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl w-full border border-slate-100 dark:border-slate-700/50 flex justify-between items-center shadow-sm hover:shadow-md transition">
                                                <span className="font-bold text-lg capitalize text-slate-700 dark:text-slate-200">{month}</span>
                                                <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${status.code === 'pago' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : status.code === 'atraso' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' : status.code === 'isento' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600 dark:bg-slate-700'}`}>
                                                    {status.text}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : <p>Selecione um jogador.</p>}
                </GlassCard>

                <GlassCard className="flex flex-col items-center justify-center text-center bg-indigo-600 !text-white border-none relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10 w-full">
                        <h2 className="text-2xl font-bold mb-2 text-white">Quitar Débitos</h2>
                        <p className="text-indigo-200 text-sm mb-6">Use o PIX oficial do CBA para transferências seguras.</p>
                        
                        <div className="bg-white p-3 rounded-2xl mb-6 inline-block mx-auto shadow-2xl">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(pixCode)}&size=160x160&margin=0`} alt="QR Code PIX" className="w-40 h-40 rounded-xl" />
                        </div>
                        
                        <div className="w-full bg-indigo-800/50 p-4 rounded-2xl border border-indigo-500/30">
                            <p className="text-xs font-semibold text-indigo-300 mb-2 uppercase tracking-widest">PIX Copia e Cola</p>
                            <div className="flex gap-2">
                                <input type="text" readOnly value={pixCode} className="w-full bg-transparent text-sm text-white border-b border-indigo-400 outline-none truncate" />
                                <button onClick={() => { 
                                    document.execCommand('copy'); 
                                    setCopySuccess('Copiado!');
                                    setTimeout(() => setCopySuccess(''), 2000);
                                }} className="p-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg shrink-0 transition">
                                    Copiar
                                </button>
                            </div>
                            {copySuccess && <p className="text-emerald-400 text-xs font-bold mt-2">{copySuccess}</p>}
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

// --- ABA JOGOS ---
const JogosTab = ({ currentUser, isAdmin, scriptUrl, ModalComponent, refreshKey }) => {
    const { data: gamesData, isLoading, error: queryError, refetch } = useDataQuery(['games', refreshKey], () => fetchWithPost(scriptUrl, { action: 'getGames' }), [refreshKey]);

    const games = useMemo(() => {
        if (!gamesData?.data) return [];
        return gamesData.data.sort((a, b) => new Date(b.data) - new Date(a.data));
    }, [gamesData]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGame, setEditingGame] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', content: null });
    const [confirmDelete, setConfirmDelete] = useState(null);

    const handleOpenModal = (game = null) => {
        setEditingGame(game);
        setIsModalOpen(true);
        setModalMessage('');
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setModalMessage('');
        const formData = new FormData(e.target);
        const payload = {
            action: editingGame ? 'updateGame' : 'createGame',
            id: editingGame ? editingGame.id : undefined,
            data: formData.get('data'),
            horario: formData.get('horario'),
            local: formData.get('local'),
        };

        try {
            const data = await fetchWithPost(scriptUrl, payload);
            if (data.result === 'success') {
                setIsModalOpen(false);
                setEditingGame(null);
                refetch();

                if (payload.action === 'createGame') {
                    const gameDate = new Date(payload.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
                    const message = `Novo jogo do CBA marcado! 🏀\n\n📅 Data: ${gameDate}\n⏰ Horário: ${payload.horario}\n📍 Local: ${payload.local}\n\nConfirme sua presença no portal!`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

                    setInfoModal({
                        isOpen: true,
                        title: 'Jogo Criado com Sucesso!',
                        content: (
                            <div>
                                <p className="mb-4">O novo jogo foi adicionado. Você pode compartilhar a convocação no WhatsApp.</p>
                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-all shadow-md">
                                    Compartilhar no WhatsApp
                                </a>
                            </div>
                        )
                    });
                }
                if (payload.action === 'createGame' && window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PROMPT_SAVE_TO_CALENDAR', payload: { title: `Jogo CBA - ${payload.local}`, startDate: `${payload.data}T${payload.horario}:00`, location: payload.local } }));
                }
            } else {
                throw new Error(data.message || 'Ocorreu um erro desconhecido.');
            }
        } catch (error) {
            setModalMessage(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    async function handleAttendance(gameId, actionType) {
        try {
            const data = await fetchWithPost(scriptUrl, { action: 'handleAttendanceUpdate', itemId: gameId, playerName: currentUser.name, actionType: actionType, type: 'game' });
            if (data.result !== 'success') throw new Error(data.message || 'Erro ao atualizar presença.');
            refetch();
        } catch (err) {
            setInfoModal({ isOpen: true, title: "Erro", content: <p>{err.message}</p> });
        }
    }
    
    const handleDeleteGame = async (game) => {
        if (!game) return;
        setConfirmDelete(null); 
        try {
            const data = await fetchWithPost(scriptUrl, { action: 'deleteGame', id: game.id });
            if (data.result === 'success') refetch();
            else throw new Error(data.message || "Não foi possível apagar o jogo.");
        } catch (err) {
            setInfoModal({ isOpen: true, title: 'Erro ao Apagar', content: <p>{err.message}</p> });
        } 
    };

    if (isLoading) return <Loader message="A carregar jogos..." />;

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Calendário de Jogos</h2>
                {isAdmin && (
                    <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-indigo-700 transition shadow-md">
                        Criar Jogo
                    </button>
                )}
            </div>

            {games.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum jogo agendado no momento.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {games.map(game => {
                        const isConfirmed = game.confirmados.includes(currentUser.name);
                        return (
                            <GlassCard key={game.id} className="flex flex-col relative border-t-4 border-t-indigo-500">
                                {isAdmin && (
                                    <div className="absolute top-2 right-2 flex gap-1 bg-white/50 dark:bg-slate-800/50 rounded-lg p-1 backdrop-blur-sm">
                                        <button onClick={() => handleOpenModal(game)} className="p-1.5 text-slate-500 hover:text-indigo-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                        <button onClick={() => setConfirmDelete(game)} className="p-1.5 text-slate-500 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-4 mt-2">
                                    <div>
                                        <p className="text-2xl font-black text-slate-800 dark:text-white">{new Date(game.data + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{game.horario} @ {game.local}</p>
                                    </div>
                                    <div className="text-right bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl">
                                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{game.confirmados.length}</p>
                                        <p className="text-[10px] uppercase font-bold text-slate-500">Confir.</p>
                                    </div>
                                </div>
                                <div className="flex-grow mb-6 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                    <h4 className="font-bold text-xs uppercase tracking-wider mb-2 text-slate-500">Lista de Presença</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {game.confirmados.length > 0 ? game.confirmados.map(name => (
                                            <span key={name} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-2.5 py-1 text-xs font-bold rounded-lg shadow-sm">{name}</span>
                                        )) : <p className="text-xs text-slate-400">Ninguém confirmado ainda.</p>}
                                    </div>
                                </div>
                                <div className="mt-auto">
                                    {isConfirmed ? (
                                        <button onClick={() => handleAttendance(game.id, 'withdraw')} className="w-full font-bold py-3 px-4 rounded-xl transition-all bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50 dark:hover:bg-red-900/40">
                                            Desistir da Convocação
                                        </button>
                                    ) : (
                                        <button onClick={() => handleAttendance(game.id, 'confirm')} className="w-full font-bold py-3 px-4 rounded-xl transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">
                                            Confirmar Presença
                                        </button>
                                    )}
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            )}

            <ModalComponent isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingGame(null); }} title={editingGame ? "Editar Jogo" : "Criar Novo Jogo"}>
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Data</label>
                            <input name="data" type="date" defaultValue={editingGame?.data} className="w-full p-3 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Horário</label>
                            <input name="horario" type="time" defaultValue={editingGame?.horario} className="w-full p-3 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Local</label>
                        <input name="local" type="text" placeholder="Ex: Quadra Vila Militar" defaultValue={editingGame?.local} className="w-full p-3 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
                    </div>
                    {modalMessage && <p className="text-red-500 font-bold text-sm bg-red-50 p-3 rounded-lg">{modalMessage}</p>}
                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-70 transition-all shadow-lg">
                        {isSubmitting ? 'Processando...' : (editingGame ? 'Guardar Alterações' : 'Agendar Jogo')}
                    </button>
                </form>
            </ModalComponent>
            
            <ModalComponent isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar Exclusão">
                <div>
                    <p className="text-lg">Tem a certeza que quer apagar o jogo do dia <strong>{confirmDelete ? new Date(confirmDelete.data + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}</strong>?</p>
                    <div className="flex justify-end gap-4 mt-8">
                        <button onClick={() => setConfirmDelete(null)} className="py-3 px-6 bg-slate-200 text-slate-800 font-bold rounded-xl hover:bg-slate-300">Cancelar</button>
                        <button onClick={() => handleDeleteGame(confirmDelete)} className="py-3 px-6 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg">Sim, Apagar</button>
                    </div>
                </div>
            </ModalComponent>

            <ModalComponent isOpen={infoModal.isOpen} onClose={() => setInfoModal({ isOpen: false, title: '', content: null })} title={infoModal.title}>
                {infoModal.content}
            </ModalComponent>
        </div>
    );
};

// --- ABA EVENTOS ---
const EventosTab = ({ scriptUrl, currentUser, isAdmin, ModalComponent, refreshKey }) => {
    const { data: eventsData, isLoading, error: queryError, refetch } = useDataQuery(
        ['events', refreshKey], 
        () => fetchWithPost(scriptUrl, { action: 'getEvents' }),
        [refreshKey]
    );

    const events = useMemo(() => {
        if (!eventsData?.data) return [];
        return eventsData.data.map(event => ({
            ...event,
            value: parseFloat(event.value) || 0,
            attendees: event.attendees ? event.attendees.split(',').map(name => name.trim()) : []
        }));
    }, [eventsData]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });

    const formatCurrency = (val) => typeof val === 'number' ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
    
    const handleOpenModal = (event = null) => {
        setEditingEvent(event);
        setIsModalOpen(true);
        setModalMessage('');
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setModalMessage('');
        const formData = new FormData(e.target);
        const payload = {
            action: editingEvent ? 'updateEvent' : 'createEvent',
            id: editingEvent ? editingEvent.id : undefined,
            name: formData.get('name'),
            date: formData.get('date'),
            deadline: formData.get('deadline'),
            location: formData.get('location'),
            value: formData.get('value'),
            description: formData.get('description'),
        };

        try {
            const data = await fetchWithPost(scriptUrl, payload);
            if (data.result === 'success') {
                setIsModalOpen(false);
                setEditingEvent(null);
                refetch();
                if (payload.action === 'createEvent' && window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PROMPT_SAVE_TO_CALENDAR', payload: { title: payload.name, startDate: payload.date, location: payload.location } }));
                }
            } else {
                throw new Error(data.message || 'Ocorreu um erro desconhecido.');
            }
        } catch (error) {
            setModalMessage(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    async function handleAttendance(eventId, actionType) {
        try {
            const data = await fetchWithPost(scriptUrl, { action: 'handleAttendanceUpdate', itemId: eventId, playerName: currentUser.name, actionType: actionType, type: 'event' });
            if (data.result === 'success') {
                refetch();
            } else {
                throw new Error(data.message || `Não foi possível atualizar a presença.`);
            }
        } catch (error) {
            setInfoModal({ isOpen: true, title: 'Erro', message: error.message });
        }
    }

     const handleDeleteEvent = async (event) => {
        if (!event) return;
        setConfirmDelete(null); 
        try {
            const data = await fetchWithPost(scriptUrl, { action: 'deleteEvent', id: event.id });
            if (data.result === 'success') refetch();
            else throw new Error(data.message || "Não foi possível apagar o evento.");
        } catch (err) {
            setInfoModal({ isOpen: true, title: 'Erro ao Apagar', message: err.message });
        }
    };

    if (isLoading) return <Loader message="A buscar resenhas..." />;

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Eventos & Confraternizações</h2>
                {isAdmin && (
                    <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-indigo-700 transition shadow-md">
                        Criar Evento
                    </button>
                )}
            </div>

            {events.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum evento agendado no momento.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {events.map(event => {
                        const isConfirmed = event.attendees.includes(currentUser.name);
                        const isDeadlinePassed = new Date() > new Date(event.deadline);
                        const totalCollected = event.attendees.length * event.value;

                        return (
                            <GlassCard key={event.id} className="flex flex-col relative">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{event.name}</h3>
                                    {isAdmin && (
                                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                                            <button onClick={() => handleOpenModal(event)} className="p-1.5 text-slate-500 hover:text-indigo-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                            <button onClick={() => setConfirmDelete(event)} className="p-1.5 text-slate-500 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="space-y-1 mb-4">
                                    <p className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><span className="text-xl">📅</span> {new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                    <p className="font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2"><span className="text-xl">📍</span> {event.location}</p>
                                </div>
                                
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-700">
                                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">{event.description}</p>
                                    <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-3">
                                        <span className="font-bold text-slate-500 text-xs uppercase tracking-widest">Cota Individual</span>
                                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">{formatCurrency(event.value)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-1">
                                        <span className="font-semibold text-slate-500">Arrecadado:</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(totalCollected)}</span>
                                    </div>
                                </div>
                                
                                <div className="mb-6 flex-grow">
                                    <div className="flex justify-between items-end mb-2">
                                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Confirmados ({event.attendees.length})</h4>
                                        <p className="text-[10px] uppercase font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Limite: {new Date(event.deadline).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {event.attendees.length > 0 ? event.attendees.map(name => (
                                            <span key={name} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-2 py-1 text-xs font-bold rounded-lg shadow-sm">{name}</span>
                                        )) : <p className="text-xs text-slate-400">Ninguém animou ainda.</p>}
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    {isConfirmed ? (
                                        <button onClick={() => handleAttendance(event.id, 'withdraw')} disabled={isDeadlinePassed} className={`w-full font-bold py-3 px-4 rounded-xl transition-all ${isDeadlinePassed ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900/50'}`}>
                                            Desistir do Evento
                                        </button>
                                    ) : (
                                        <button onClick={() => handleAttendance(event.id, 'confirm')} disabled={isDeadlinePassed} className={`w-full font-bold py-3 px-4 rounded-xl transition-all ${!isDeadlinePassed ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30' : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'}`}>
                                            {isDeadlinePassed ? 'Inscrições Encerradas' : 'Confirmar Presença'}
                                        </button>
                                    )}
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            )}

            <ModalComponent isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingEvent(null); }} title={editingEvent ? "Editar Evento" : "Criar Evento"}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <input name="name" type="text" placeholder="Nome do Evento" defaultValue={editingEvent?.name || ''} className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data do Evento</label>
                            <input name="date" type="datetime-local" defaultValue={editingEvent?.date ? new Date(editingEvent.date).toISOString().substring(0, 16) : ''} className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Limite</label>
                            <input name="deadline" type="date" defaultValue={editingEvent?.deadline || ''} className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none" required />
                        </div>
                    </div>
                    <input name="location" type="text" placeholder="Local" defaultValue={editingEvent?.location || ''} className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
                    <input name="value" type="number" step="0.01" placeholder="Valor p/ Pessoa (ex: 50.00)" defaultValue={editingEvent?.value || ''} className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
                    <textarea name="description" placeholder="Detalhes da resenha..." defaultValue={editingEvent?.description || ''} className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" rows="3" required></textarea>
                    {modalMessage && <p className="text-red-500 text-sm bg-red-50 p-2 rounded-lg">{modalMessage}</p>}
                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-70 transition-all">
                        {isSubmitting ? 'Salvando...' : (editingEvent ? 'Atualizar' : 'Criar')}
                    </button>
                </form>
            </ModalComponent>
            
            <ModalComponent isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar">
                <p className="text-lg">Deseja apagar o evento <strong>{confirmDelete?.name}</strong>?</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setConfirmDelete(null)} className="py-3 px-6 bg-slate-200 font-bold rounded-xl text-slate-800">Cancelar</button>
                    <button onClick={() => handleDeleteEvent(confirmDelete)} className="py-3 px-6 bg-red-600 text-white font-bold rounded-xl">Apagar</button>
                </div>
            </ModalComponent>
            <ModalComponent isOpen={infoModal.isOpen} onClose={() => setInfoModal({ isOpen: false, title: '', message: '' })} title={infoModal.title}><p>{infoModal.message}</p></ModalComponent>
        </div>
    );
};

// --- ABA SORTEIO ---
const SorteioTab = ({ allPlayersData, scriptUrl, ModalComponent }) => {
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
            const data = await fetchWithPost(scriptUrl, { action: 'saveTeams', teamBlack: teams.teamBlack.join(','), teamRed: teams.teamRed.join(',') });
            if (data.result === 'success') setModalInfo({ isOpen: true, title: 'Sucesso', message: 'Times salvos na planilha com sucesso!' });
            else throw new Error(data.message || 'Erro desconhecido.');
        } catch (error) { setModalInfo({ isOpen: true, title: 'Erro', message: error.message }); } 
        finally { setIsLoading(false); }
    };
    
    const handleReset = () => { setSelectedPlayers([]); setTeams(null); setDrawnPlayers([]); setDrawMode('selection'); setNumToDraw(1); };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <ModalComponent isOpen={modalInfo.isOpen} onClose={() => setModalInfo({ isOpen: false, title: '', message: '' })} title={modalInfo.title}>
                <p>{modalInfo.message}</p>
            </ModalComponent>

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

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-10 max-h-96 overflow-y-auto pr-2 pb-2">
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
                                <select value={numToDraw} onChange={(e) => setNumToDraw(Number(e.target.value))} className="w-1/3 p-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
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

// --- ABA ESTATUTO ---
const EstatutoTab = () => {
    const [openAccordion, setOpenAccordion] = useState('Regulamento');
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

// --- ABA NOTIFICAÇÕES ---
const NotificacoesTab = ({ scriptUrl }) => {
    const { data: notifData, isLoading, error, refetch } = useDataQuery(['notifications'], () => fetchWithPost(scriptUrl, { action: 'getNotifications' }));

    const notifications = useMemo(() => {
        if (!notifData?.data) return [];
        return notifData.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [notifData]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState({ message: '', type: '' });
    const [targetTab, setTargetTab] = useState('presenca'); 

    const handleFormSubmit = async (e) => {
        e.preventDefault(); 
        setIsSubmitting(true); 
        setSubmitStatus({ message: '', type: '' });
        
        const formData = new FormData(e.target);
        
        try {
            const data = await fetchWithPost(scriptUrl, { 
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
                        <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg> 
                        Disparar Push
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
                        <textarea name="message" placeholder="Escreva a mensagem..." className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white resize-none" rows="4" required></textarea>
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
                                <svg className="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
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


// --- MAIN APP E ROTEAMENTO DE ABAS ---
const MainApp = ({ user, onLogout, SCRIPT_URL, librariesLoaded }) => {
    const [activeTab, setActiveTab] = useState('presenca');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // O hook gerencia o estado e o cache dos dados base
    const { data: initialData, isLoading, refetch } = useDataQuery(['initialData'], () => fetchWithPost(SCRIPT_URL, { action: 'getInitialAppData' }));
    
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const TABS = useMemo(() => isAdmin ? ['presenca', 'relatorios', 'financas', 'jogos', 'eventos', 'sorteio', 'estatuto', 'notificacoes'] : ['presenca', 'relatorios', 'financas', 'jogos', 'eventos', 'sorteio', 'estatuto'], [isAdmin]);

    // Global listener for cross-tab navigation (ex: from React Native WebView)
    useEffect(() => {
        window.navigateToTab = (tabName) => {
            if (TABS.includes(tabName)) {
                setActiveTab(tabName);
            }
        };
        return () => {
            delete window.navigateToTab;
        };
    }, [TABS]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchWithPost(SCRIPT_URL, { action: 'clearCache' }).then(() => refetch()).finally(() => setIsRefreshing(false));
    };

    const renderContent = () => {
        if (isLoading) return <Loader message="Carregando dados na quadra..." />;
        
        const appData = initialData?.data;
        const props = { 
            allPlayersData: appData?.dashboard?.players || [], 
            dates: appData?.dashboard?.dates || [], 
            financeData: appData?.finance, 
            nextGame: appData?.nextGame, 
            currentUser: user, 
            isAdmin, 
            scriptUrl: SCRIPT_URL, 
            pixCode: appData?.pixCode, 
            ModalComponent: Modal 
        };

        switch (activeTab) {
            case 'presenca': return <PresencaTab {...props} onAttendanceUpdate={handleRefresh} onNavigate={setActiveTab} />;
            case 'relatorios': return <RelatoriosTab {...props} />;
            case 'financas': return <FinancasTab {...props} />;
            case 'jogos': return <JogosTab {...props} refreshKey={isRefreshing} />;
            case 'eventos': return <EventosTab {...props} refreshKey={isRefreshing} />;
            case 'sorteio': return <SorteioTab {...props} />;
            case 'estatuto': return <EstatutoTab />;
            case 'notificacoes': return <NotificacoesTab {...props} />;
            default: return null;
        }
    };

    const TAB_CONFIG = {
        presenca: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-7 md:w-7 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
            color: 'text-emerald-500 dark:text-emerald-400',
            activeBg: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
        },
        jogos: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-7 md:w-7 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" /></svg>,
            color: 'text-orange-500 dark:text-orange-400',
            activeBg: 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
        },
        estatuto: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-7 md:w-7 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
            color: 'text-teal-500 dark:text-teal-400',
            activeBg: 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
        },
        financas: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-7 md:w-7 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
            color: 'text-rose-500 dark:text-rose-400',
            activeBg: 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
        },
        sorteio: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-7 md:w-7 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
            color: 'text-amber-500 dark:text-amber-400',
            activeBg: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
        },
        eventos: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-7 md:w-7 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
            color: 'text-purple-500 dark:text-purple-400',
            activeBg: 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
        },
        relatorios: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-7 md:w-7 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
            color: 'text-blue-500 dark:text-blue-400',
            activeBg: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
        },
        notificacoes: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-7 md:w-7 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
            color: 'text-pink-500 dark:text-pink-400',
            activeBg: 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
        },
    };

    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/50 via-slate-50 to-slate-100 dark:from-indigo-900/20 dark:via-slate-900 dark:to-slate-900 transition-colors duration-500 text-slate-800 dark:text-slate-200 overflow-hidden">
            
            {/* Overlay para Mobile quando Sidebar está aberta */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* SIDEBAR VERTICAL */}
            <nav className={`fixed inset-y-0 left-0 z-50 md:relative transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 w-[72px] md:w-24 shrink-0 h-full flex flex-col items-center py-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border-r border-slate-200/50 dark:border-slate-700/50 shadow-2xl md:shadow-lg overflow-y-auto hide-scrollbar gap-3 md:gap-4`}>
                <div className="mb-6">
                     <img src="https://lh3.googleusercontent.com/d/131DvcfgiRLLp9irVnVY8m9qNuM-0y7f8" alt="Logo" className="w-12 h-12 rounded-full shadow-md border-2 border-indigo-100 dark:border-indigo-900/50" />
                </div>
                
                {TABS.map(tab => {
                    const config = TAB_CONFIG[tab];
                    const isActive = activeTab === tab;
                    return (
                        <button 
                            key={tab} 
                            onClick={() => { setActiveTab(tab); setIsSidebarOpen(false); }} 
                            className={`group relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl transition-all duration-300 ${isActive ? `${config.activeBg} scale-110` : `${config.color} hover:bg-slate-200/50 dark:hover:bg-slate-700/50 hover:scale-105`}`}
                            title={tab.charAt(0).toUpperCase() + tab.slice(1)}
                        >
                            {config.icon}
                        </button>
                    );
                })}
            </nav>

            {/* ÁREA DE CONTEÚDO PRINCIPAL */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
                {/* Cabeçalho */}
                <header className="shrink-0 p-4 md:px-8 md:py-5 flex justify-between items-center bg-white/40 dark:bg-slate-800/30 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 z-30">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <img src={user.fotoUrl || 'https://placehold.co/100'} alt="Avatar" className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-700" crossOrigin="anonymous" />
                        <div className="hidden sm:block">
                            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white leading-none">Portal CBA</h1>
                            <p className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] md:text-xs uppercase tracking-widest">{user.name}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 md:gap-3">
                        <button onClick={handleRefresh} className="p-2 md:p-2.5 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl shadow-sm hover:shadow-md transition">
                            <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 4a14.95 14.95 0 0117.47 9.47M20 20a14.95 14.95 0 01-17.47-9.47" /></svg>
                        </button>
                        <button onClick={onLogout} className="px-3 md:px-5 py-2 md:py-2.5 bg-slate-100 dark:bg-slate-800 text-rose-500 font-bold text-sm md:text-base rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition shadow-sm border border-slate-200 dark:border-slate-700">Sair</button>
                    </div>
                </header>

                {/* Abas / Conteúdo */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto pb-20">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function App() {
    const [auth, setAuth] = useState({ status: 'unauthenticated', user: null, error: null });
    const [librariesLoaded, setLibrariesLoaded] = useState(false);
    
    // Endpoint do servidor Apps Script
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwNXGI4Cc5qGBye-IfWW_qqUcJ04NfArulExPXE4jgX0SZhWAmeWCjjKg2U9FFfHkHE/exec";

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuth({ status: 'loading', user: null, error: null });
        try {
            const data = await fetchWithPost(SCRIPT_URL, { action: 'loginUser', email: e.target.email.value, password: e.target.password.value });
            if (data.status === 'approved') {
                setAuth({ status: 'authenticated', user: data, error: null });
            } else {
                setAuth({ status: 'unauthenticated', user: null, error: data.message });
            }
        } catch (error) { 
            setAuth({ status: 'unauthenticated', user: null, error: 'Falha no servidor.' }); 
        }
    };

    useEffect(() => {
        const loadScript = (src, id) => new Promise((resolve) => {
            if (document.getElementById(id)) return resolve();
            const s = document.createElement('script'); 
            s.src = src; s.id = id; s.onload = resolve;
            document.body.appendChild(s);
        });
        
        Promise.all([
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js', 'papa'),
            loadScript('https://cdn.jsdelivr.net/npm/chart.js', 'chartjs'),
            // Biblioteca para gerar PDF
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js', 'html2pdf')
        ]).then(() => setLibrariesLoaded(true));
    }, []);

    if (!librariesLoaded || auth.status === 'loading') {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader message="Inicializando Portal..." /></div>;
    }
    
    return (
        <ThemeProvider>
            {auth.status === 'authenticated' ? (
                <MainApp user={auth.user} onLogout={() => setAuth({ status: 'unauthenticated', user: null, error: null })} SCRIPT_URL={SCRIPT_URL} librariesLoaded={librariesLoaded} /> 
            ) : (
                <LoginScreen onLogin={handleLogin} isLoading={false} error={auth.error} />
            )}
        </ThemeProvider>
    );
}