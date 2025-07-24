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
        
        const res = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });

        if (!res.ok) {
            throw new Error(`Erro de HTTP: ${res.status}`);
        }
        return res.json();
    } catch (error) {
        console.error('Fetch GET error:', error);
        throw error;
    }
};

const fetchWithPost = async (baseUrl, params) => {
    try {
        const res = await fetch(baseUrl, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(params),
        });

        if (!res.ok) {
             const errorText = await res.text().catch(() => 'Não foi possível ler o corpo do erro.');
            if (errorText.trim().toLowerCase().startsWith('<!doctype html')) {
                 throw new Error(`Erro de Servidor (${res.status}). A resposta foi uma página HTML, o que pode indicar um problema de permissão ou implantação. Verifique se o script está publicado para acesso anônimo.`);
            }
            throw new Error(`Erro de HTTP: ${res.status}. Resposta do servidor: ${errorText}`);
        }
        return res.json();
    } catch (error) {
        console.error('Fetch POST error:', error.message);
        throw error;
    }
};


// --- COMPONENTES AUXILIARES DE UI ---
const Loader = ({ message }) => (
    <div className="flex flex-col justify-center items-center py-20 text-center text-gray-500 dark:text-gray-400">
        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin"></div>
        {message && <p className="mt-4 text-lg">{message}</p>}
    </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 transition-opacity animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto transform transition-all scale-95 animate-fade-in-up">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
};

const AccordionItem = ({ title, children, isOpen, onClick }) => {
    const contentRef = useRef(null);
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4 transition-all duration-300">
            <button
                className="flex justify-between items-center w-full p-4 font-semibold text-lg text-left text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={onClick}
            >
                <span>{title}</span>
                <svg className={`w-6 h-6 shrink-0 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            <div
                ref={contentRef}
                style={{ maxHeight: isOpen ? `${contentRef.current?.scrollHeight}px` : '0' }}
                className="overflow-hidden transition-max-height duration-500 ease-in-out bg-white dark:bg-gray-800/50"
            >
                <div className="p-5 prose dark:prose-invert max-w-none border-t border-gray-200 dark:border-gray-700">{children}</div>
            </div>
        </div>
    );
};

const ChartComponent = ({ chartConfig }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const { theme } = useTheme();

    useEffect(() => {
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        if (chartRef.current && chartConfig && window.Chart) {
            const ctx = chartRef.current.getContext('2d');
            const isDark = theme === 'dark';
            
            const updatedConfig = JSON.parse(JSON.stringify(chartConfig)); 
            if(updatedConfig.options?.scales?.y?.ticks) updatedConfig.options.scales.y.ticks.color = isDark ? '#9ca3af' : '#6b7280';
            if(updatedConfig.options?.scales?.x?.ticks) updatedConfig.options.scales.x.ticks.color = isDark ? '#9ca3af' : '#6b7280';
            if(updatedConfig.options?.plugins?.legend?.labels) updatedConfig.options.plugins.legend.labels.color = isDark ? '#e5e7eb' : '#374151';

            chartInstance.current = new window.Chart(ctx, updatedConfig);
        }
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [chartConfig, theme]);

    return <canvas ref={chartRef}></canvas>;
};

// --- COMPONENTES DE AUTENTICAÇÃO ---

const LoginScreen = ({ onLogin, isLoading, error }) => (
    <div 
        className="min-h-screen bg-cover bg-center flex items-center justify-center p-4"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2070&auto=format&fit=crop')" }}
    >
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        <div className="relative z-10 p-8 bg-gray-900/70 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl text-center w-full max-w-sm">
            <img src="https://i.ibb.co/pGnycLc/ICONE-CBA.jpg" alt="Logo CBA" className="h-24 w-24 rounded-full shadow-lg mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Portal do CBA</h1>
            <p className="text-gray-300 mb-6">Por favor, entre para continuar.</p>
            {error && <p className="bg-red-500/30 text-red-200 p-3 rounded-md mb-4">{error}</p>}
            <form onSubmit={onLogin} className="space-y-4">
                <input name="email" type="email" placeholder="Email" className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-md placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500" required />
                <input name="password" type="password" placeholder="Senha" className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-md placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500" required />
                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors">
                    {isLoading ? 'A entrar...' : 'Entrar'}
                </button>
            </form>
        </div>
    </div>
);

const PendingScreen = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl text-center max-w-md">
            <h2 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-4">Acesso Pendente</h2>
            <p className="text-gray-600 dark:text-gray-300">O seu pedido de acesso foi enviado. Por favor, aguarde a aprovação de um administrador.</p>
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

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])/;
        if (!passwordRegex.test(newPassword)) {
            setMessage({ type: 'error', text: 'A senha deve conter pelo menos uma letra maiúscula e um número.' });
            return;
        }

        setIsSubmitting(true);
        const payload = {
            action: 'resetPassword',
            email: user.email,
            newPassword: newPassword,
        };

        try {
            const data = await fetchWithPost(scriptUrl, payload);
            if (data.result === 'success') {
                setMessage({ type: 'success', text: 'Senha alterada com sucesso! A sair...' });
                setTimeout(() => {
                    onClose(true); // Pass true to signal logout
                }, 2000);
            } else {
                throw new Error(data.message || 'Ocorreu um erro desconhecido.');
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={() => onClose(false)} title="Resetar Senha">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nova Senha</label>
                    <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" 
                        required 
                    />
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Deve conter letras maiúsculas e números.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar Nova Senha</label>
                    <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" 
                        required 
                    />
                </div>
                {message.text && (
                    <p className={`p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message.text}
                    </p>
                )}
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                    {isSubmitting ? 'A alterar...' : 'Alterar Senha'}
                </button>
            </form>
        </Modal>
    );
};


// --- COMPONENTES DAS ABAS ---

const PresencaTab = ({ allPlayersData, dates, isLoading, error, ModalComponent }) => {
    const [filter, setFilter] = useState('all');
    const [report, setReport] = useState(null);
    const [monthRange, setMonthRange] = useState({ start: '', end: '' });
    const [modalPlayer, setModalPlayer] = useState(null);
    const [selectedPerformancePlayer, setSelectedPerformancePlayer] = useState('');
    const [modalInfo, setModalInfo] = useState({ isOpen: false, title: '', message: '' });

    const availableMonths = useMemo(() => {
        const monthSet = new Set();
        if(dates) {
            dates.forEach(d => {
                // Dates are YYYY-MM-DD, so we take the first 7 characters for YYYY-MM
                monthSet.add(d.substring(0, 7));
            });
        }
        return Array.from(monthSet).sort();
    }, [dates]);

    const performanceData = useMemo(() => {
        if (!allPlayersData || !dates) return [];
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const relevantDates = dates.filter(d => new Date(d) >= sixtyDaysAgo);

        if (relevantDates.length === 0) return [];

        return allPlayersData.map(player => {
            const presencesInPeriod = relevantDates.reduce((count, date) => {
                return count + (player.attendance[date]?.includes('✅') ? 1 : 0);
            }, 0);
            
            const performancePercentage = (relevantDates.length > 0) ? (presencesInPeriod / relevantDates.length) * 100 : 0;
            const status = performancePercentage >= 50 ? 'Em conformidade' : 'Abaixo da meta';
            
            return {
                ...player,
                performancePercentage,
                status,
                gamesInPeriod: relevantDates.length,
                presencesInPeriod,
            };
        }).sort((a, b) => b.performancePercentage - a.performancePercentage);
    }, [allPlayersData, dates]);
    
    const teamPerformance = useMemo(() => {
        if (!performanceData || performanceData.length === 0) {
            return { average: 0, status: 'N/A' };
        }
        const totalPercentage = performanceData.reduce((sum, player) => sum + player.performancePercentage, 0);
        const average = totalPercentage / performanceData.length;
        
        return {
            average,
            status: average >= 50 ? 'Em conformidade' : 'Abaixo da meta',
        };
    }, [performanceData]);

    useEffect(() => {
        if (availableMonths.length > 0) {
            setMonthRange({ start: availableMonths[0], end: availableMonths[availableMonths.length - 1] });
        }
        if(allPlayersData && allPlayersData.length > 0) {
            setSelectedPerformancePlayer(allPlayersData[0].name);
        }
    }, [availableMonths, allPlayersData]);

    const getHallOfFameData = () => {
        if (!allPlayersData) return { onFire: null, mostPresent: null, leastPresent: [] };
        // Filtra jogadores elegíveis para o Quadro de Honra
        const eligiblePlayers = allPlayersData.filter(p => p.isEligibleForHoF);

        if (eligiblePlayers.length === 0) return { onFire: null, mostPresent: null, leastPresent: [] };

        const sortedByAverage = [...eligiblePlayers].sort((a, b) => b.average - a.average || a.name.localeCompare(b.name));
        const sortedByTotalPresence = [...eligiblePlayers].sort((a, b) => b.presences - a.presences || a.name.localeCompare(b.name));
        const leastPresentSorted = [...eligiblePlayers].sort((a, b) => a.average - b.average || a.name.localeCompare(b.name));
        
        return { onFire: sortedByAverage[0], mostPresent: sortedByTotalPresence[0], leastPresent: leastPresentSorted.slice(0, 3) };
    };

    const hallOfFame = getHallOfFameData();
    
    const attendanceChartConfig = useMemo(() => {
        if (!allPlayersData || !dates) return {};
        return { 
            type: 'line', 
            data: { 
                labels: dates.map(d => new Date(d).toLocaleDateString('pt-BR')), 
                datasets: [{ 
                    label: 'Jogadores Presentes', 
                    data: dates.map(date => allPlayersData.reduce((count, player) => count + (player.attendance[date]?.includes('✅') ? 1 : 0), 0)), 
                    fill: false, 
                    borderColor: 'rgb(75, 192, 192)', 
                    tension: 0.1 
                }] 
            }, 
            options: { 
                scales: { 
                    y: { beginAtZero: true, ticks: { stepSize: 1 } } 
                } 
            } 
        }
    }, [dates, allPlayersData]);

    const averageBarChartConfig = useMemo(() => {
        if (!allPlayersData) return {};
        const sortedPlayers = [...allPlayersData].sort((a, b) => b.average - a.average);
        return { 
            type: 'bar', 
            data: { 
                labels: sortedPlayers.map(p => p.name), 
                datasets: [{ 
                    label: 'Média de Presença (%)', 
                    data: sortedPlayers.map(p => p.average), 
                    backgroundColor: sortedPlayers.map(p => p.average >= 75 ? '#22c55e' : p.average >= 50 ? '#3b82f6' : '#f59e0b') 
                }] 
            }, 
            options: { 
                indexAxis: 'y', 
                responsive: true, 
                plugins: { legend: { display: false } } 
            } 
        };
    }, [allPlayersData]);

    const filterButtons = [
        { key: 'desempenho', label: 'Desempenho', emoji: '📈' },
        { key: 'all', label: 'Todos', emoji: '👥' },
        { key: 'good', label: 'Melhores', emoji: '👍' },
        { key: 'regular', label: 'Regulares', emoji: '👌' },
        { key: 'bad', label: 'Abaixo', emoji: '👎' },
        { key: 'faltas', label: 'Faltosos', emoji: '⚠️' }
    ];
    const filterFunctions = { 'all': () => true, 'good': p => p.average >= 75, 'regular': p => p.average >= 50 && p.average < 75, 'bad': p => p.average < 50, 'faltas': p => p.unjustifiedAbsences > 0, 'desempenho': () => true };
    const sortedData = (allPlayersData && filter === 'faltas') ? [...allPlayersData].sort((a, b) => b.unjustifiedAbsences - a.unjustifiedAbsences) : (allPlayersData ? [...allPlayersData].sort((a, b) => b.average - a.average) : []);
    const filteredData = (filter === 'desempenho') ? performanceData : (allPlayersData ? sortedData.filter(filterFunctions[filter]) : []);
    const selectedPlayerData = performanceData.find(p => p.name === selectedPerformancePlayer);


    const handleGenerateReport = () => {
        if (!monthRange.start || !monthRange.end) {
            setModalInfo({ isOpen: true, title: "Período Inválido", message: "Por favor, selecione um período de meses." });
            return;
        }

        const [startYear, startMonth] = monthRange.start.split('-').map(Number);
        const [endYear, endMonth] = monthRange.end.split('-').map(Number);

        if (startYear > endYear || (startYear === endYear && startMonth > endMonth)) {
            setModalInfo({ isOpen: true, title: "Período Inválido", message: "O mês de início não pode ser posterior ao mês de fim." });
            return;
        }

        const periodDates = dates.filter(d => {
            const date = new Date(d);
            const startDate = new Date(startYear, startMonth - 1, 1);
            const endDate = new Date(endYear, endMonth, 0); 
            return date >= startDate && date <= endDate;
        });

        const reportData = allPlayersData
            .map(player => ({
                name: player.name,
                presences: periodDates.reduce((count, date) => count + (player.attendance[date]?.includes('✅') ? 1 : 0), 0)
            }))
            .sort((a, b) => b.presences - a.presences);

        const formatMonth = (monthStr) => {
            const [year, month] = monthStr.split('-');
            return new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        }

        setReport({
            title: `Relatório de Presença (${formatMonth(monthRange.start)} a ${formatMonth(monthRange.end)})`,
            data: reportData
        });
    };

    if (isLoading) return <Loader message="A carregar dados da planilha de presença..." />;
    if (error) return <p className="text-center text-red-500 py-8">{error}</p>;
    if (!allPlayersData || !allPlayersData.length) return <p className="text-center text-gray-500 py-8">Nenhum dado de presença encontrado.</p>;

    return (
        <div className="space-y-8">
            <section className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-gray-100">🏆 Quadro de Honra 🏆</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-2">On Fire 🔥</h3>
                        <p className="text-2xl font-bold dark:text-gray-100">{hallOfFame.onFire?.name}</p>
                        <p className="text-xl text-orange-700 dark:text-orange-500 font-semibold">{hallOfFame.onFire?.average}%</p>
                    </div>
                    <div className="text-center p-4 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                        <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400 mb-2">Mais Presente</h3>
                        <p className="text-2xl font-bold dark:text-gray-100">{hallOfFame.mostPresent?.name}</p>
                        <p className="text-xl text-cyan-700 dark:text-cyan-500 font-semibold">{hallOfFame.mostPresent?.presences} jogos</p>
                    </div>
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg lg:col-span-1 sm:col-span-2">
                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2 text-center">Menos Presentes 📉</h3>
                        <ul className="text-left space-y-1 text-sm text-gray-800 dark:text-gray-300">
                            {hallOfFame.leastPresent.map(player => (
                                <li key={player.name} className="flex justify-between">
                                    <span>{player.name}</span> <span className="font-semibold">{player.average}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Tendência de Presença por Jogo</h2>
                    <ChartComponent chartConfig={attendanceChartConfig} />
                </div>
                <div className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Comparativo de Médias (%)</h2>
                    <ChartComponent chartConfig={averageBarChartConfig} />
                </div>
            </section>

            <section className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Análise Geral de Presença</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Clique no nome de um jogador para ver os detalhes.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
                        {filterButtons.map(({ key, label, emoji }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`py-2 px-4 text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center ${
                                    filter === key
                                    ? 'bg-blue-600 text-white ring-blue-500'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                }`}
                            >
                                <span className="mr-2">{emoji}</span> {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-5">
                    {filteredData.length === 0 ?
                        <p className="text-center text-gray-500 dark:text-gray-400">Nenhum jogador corresponde a este filtro.</p> :
                        
                        filter === 'desempenho' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 flex flex-col items-center">
                                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Desempenho Geral do CBA</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">Referência: Ata de Reunião 06/01/2025 - Cláusula 4<br/>(Meta: 50% de presença nos últimos 60 dias)</p>
                                    <div className="relative w-40 h-40">
                                        <svg className="w-full h-full" viewBox="0 0 36 36">
                                            <path
                                                className="text-gray-200 dark:text-gray-700"
                                                strokeWidth="3.8"
                                                stroke="currentColor"
                                                fill="none"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                            <path
                                                className={teamPerformance.average >= 50 ? 'text-green-500' : 'text-red-500'}
                                                strokeWidth="3.8"
                                                strokeDasharray={`${teamPerformance.average}, 100`}
                                                strokeLinecap="round"
                                                stroke="currentColor"
                                                fill="none"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-4xl font-bold text-gray-800 dark:text-gray-100">{teamPerformance.average.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="text-center mt-4">
                                        <p className={`font-bold text-xl ${teamPerformance.average >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{teamPerformance.status}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Média de presença do CBA</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Análise Individual</h3>
                                    <div className="mb-4">
                                        <label htmlFor="player-performance-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selecione um Jogador:</label>
                                        <select 
                                            id="player-performance-select"
                                            value={selectedPerformancePlayer} 
                                            onChange={(e) => setSelectedPerformancePlayer(e.target.value)}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm"
                                        >
                                            {allPlayersData.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    {selectedPlayerData && (
                                        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-xl dark:text-gray-100">{selectedPlayerData.name}</span>
                                                <span className={`font-semibold text-lg ${selectedPlayerData.performancePercentage >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{selectedPlayerData.performancePercentage.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mt-2">
                                                <div className={`h-4 rounded-full ${selectedPlayerData.performancePercentage >= 50 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${selectedPlayerData.performancePercentage}%` }}></div>
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex justify-between">
                                                <span>{selectedPlayerData.presencesInPeriod} de {selectedPlayerData.gamesInPeriod} jogos</span>
                                                <span>Status: <span className={`font-bold ${selectedPlayerData.performancePercentage >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{selectedPlayerData.status}</span></span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className={filter === 'all' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2' : 'space-y-4'}>
                                {filteredData.map(player => (
                                    <div key={player.name}>
                                        {filter === 'faltas' ? (
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <button onClick={() => setModalPlayer(player)} className="w-1/2 text-left truncate pr-2 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">{player.name}</button>
                                                    <div className="w-1/2 text-right"><span className="font-semibold text-orange-600 dark:text-orange-400">{player.unjustifiedAbsences} falta(s)</span></div>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 pl-4 mt-1">
                                                    Datas: {player.unjustifiedAbsenceDates.map(d => new Date(d).toLocaleDateString('pt-BR')).join(', ')}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-4">
                                                <button onClick={() => setModalPlayer(player)} className="w-1/3 text-left truncate font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">{player.name}</button>
                                                <div className="w-1/3 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                                    <div
                                                        className={`h-4 rounded-full ${player.average >= 75 ? 'bg-green-500' : player.average >= 50 ? 'bg-blue-600' : 'bg-yellow-500'}`}
                                                        style={{ width: `${player.average}%` }}
                                                    ></div>
                                                </div>
                                                <span className="font-semibold w-1/3 text-right dark:text-gray-300">{player.average}%</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </div>
            </section>

            <section className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Extrair Relatório por Período</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-4">
                    <div>
                        <label htmlFor="month-selector-start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mês de Início:</label>
                        <select id="month-selector-start" value={monthRange.start} onChange={e => setMonthRange({ ...monthRange, start: e.target.value })} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm">
                            {availableMonths.map(m => <option key={m} value={m}>{new Date(m + '-02').toLocaleString('pt-BR', {month: 'long', year: 'numeric'})}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="month-selector-end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mês de Fim:</label>
                        <select id="month-selector-end" value={monthRange.end} onChange={e => setMonthRange({ ...monthRange, end: e.target.value })} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm">
                            {availableMonths.map(m => <option key={m} value={m}>{new Date(m + '-02').toLocaleString('pt-BR', {month: 'long', year: 'numeric'})}</option>)}
                        </select>
                    </div>
                    <div><button onClick={handleGenerateReport} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700">Gerar Relatório</button></div>
                </div>
                {report && (
                    <div className="mt-6">
                        <h3 className="text-xl font-semibold mb-2 dark:text-gray-100">{report.title}</h3>
                        <ul className="list-disc list-inside mt-2 text-gray-700 dark:text-gray-300 space-y-1">
                            {report.data.map(p => <li key={p.name}><strong>{p.name}:</strong> {p.presences} presença(s)</li>)}
                        </ul>
                        <div className="mt-4 text-right">
                            <button onClick={() => setReport(null)} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600">Limpar Relatório</button>
                        </div>
                    </div>
                )}
            </section>

            <ModalComponent isOpen={!!modalPlayer} onClose={() => setModalPlayer(null)} title={`Detalhes de ${modalPlayer?.name}`}>
                {modalPlayer && (
                    <div className="text-left space-y-4">
                        <div className="flex justify-center mb-4">
                            {modalPlayer?.fotoUrl ? (
                                <img src={modalPlayer.fotoUrl} alt={modalPlayer.name} className="w-32 h-32 rounded-full object-cover border-4 border-blue-500" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/128x128/e2e8f0/4a5568?text=' + modalPlayer.name.charAt(0); }} />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center border-4 border-blue-500">
                                    <span className="text-5xl text-gray-500 dark:text-gray-400">{modalPlayer?.name.charAt(0)}</span>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                            <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-400">Posição</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{modalPlayer?.posicao}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-400">Nº Camisa</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{modalPlayer?.numero}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-400">Altura</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{modalPlayer?.altura}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-400">Membro Desde</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{new Date(modalPlayer?.dataEntrada + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="font-semibold text-gray-600 dark:text-gray-400">Especialidade</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{modalPlayer?.especialidade}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                             <div className="text-center">
                                <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">{modalPlayer?.ppj}</p>
                                <p className="font-semibold text-gray-600 dark:text-gray-400">Pontos/Jogo</p>
                            </div>
                             <div className="text-center">
                                <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">{modalPlayer?.rpj}</p>
                                <p className="font-semibold text-gray-600 dark:text-gray-400">Ressaltos/Jogo</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Histórico de Presença</h4>
                            <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md text-center text-gray-800 dark:text-gray-200">
                                <strong>{modalPlayer?.presences}</strong> Presenças | <strong>{modalPlayer?.totalGames - modalPlayer?.presences}</strong> Ausências
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {(() => {
                                    // Filtra as datas para exibir apenas a partir da data de entrada do jogador.
                                    const playerEntryDate = modalPlayer?.dataEntrada && modalPlayer.dataEntrada !== 'N/A' 
                                        ? new Date(modalPlayer.dataEntrada + 'T00:00:00') 
                                        : null;

                                    const visibleDates = playerEntryDate
                                        ? dates.filter(dateStr => new Date(dateStr + 'T00:00:00') >= playerEntryDate)
                                        : dates;

                                    return visibleDates.map(date => {
                                        const status = modalPlayer?.attendance[date]?.trim() || '❌';
                                        let colorClass = 'bg-gray-300 dark:bg-gray-600';
                                        if (status.includes('✅')) colorClass = 'bg-green-500';
                                        else if (status.toUpperCase() === 'NÃO JUSTIFICOU') colorClass = 'bg-orange-500';
                                        else if (status.includes('❌')) colorClass = 'bg-red-500';
                                        
                                        // Adiciona 'T00:00:00' para garantir que a data seja interpretada no fuso horário local e não UTC, evitando erros de um dia.
                                        const displayDate = new Date(date + 'T00:00:00');
                                        
                                        return <div key={date} className={`w-5 h-5 border border-gray-400 dark:border-gray-500 ${colorClass}`} title={`${displayDate.toLocaleDateString('pt-BR')}: ${status}`}></div>;
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </ModalComponent>
            
            <ModalComponent 
                isOpen={modalInfo.isOpen} 
                onClose={() => setModalInfo({ isOpen: false, title: '', message: '' })} 
                title={modalInfo.title}
            >
                <p>{modalInfo.message}</p>
            </ModalComponent>
        </div>
    );
};

const EstatutoTab = () => {
    const [openAccordion, setOpenAccordion] = useState('Regulamento');

    const toggleAccordion = (title) => {
        setOpenAccordion(openAccordion === title ? null : title);
    };

    const estatutoItens = [
        {
            title: "Regulamento",
            content: (
                <>
                    <h3 className="font-bold">CBA – BASQUETE DOS APOSENTADOS</h3>
                    <h4 className="font-bold">REGULAMENTO</h4>
                    <p><strong>PRESIDENTE:</strong> NEILOR</p>
                    <p><strong>COMPOSIÇÃO DIRETORIA:</strong> ARCANJO, GONZAGA, NEILOR, PORTUGAL, VINICIUS, MILHO, ANDRE DIAS</p>
                    <p><strong>CHAVE PIX PAGAMENTO CNPJ:</strong> 36.560.422/0001-69 (NEILOR – NUNBANK)</p>
                    <p>COMPROVANTE DEVERÁ SER ENVIADO NO PRIVADO DE NEILOR</p>
                    
                    <h4 className="font-bold mt-4">1- MENSALIDADE</h4>
                    <ul className="list-disc list-inside">
                        <li>VALOR R$ 20,00 até dia 10 de cada mês;</li>
                        <li>Controle financeiro – Neilor;</li>
                    </ul>

                    <h4 className="font-bold mt-4">2- PENALIDADES</h4>
                    <ul className="list-disc list-inside">
                        <li>Briga – expulsão do basquete dos aposentados;</li>
                        <li>Xingamentos direcionados – advertências verbal;</li>
                        <li>Inclusão de nome na lista e não ir(falta injustificada) – 1 domingo suspenso;</li>
                        <li>Falta grave intencional( NÃO PODE EXISTIR) – avaliar no dia, em caso de reincidência 1 domingo suspenso;</li>
                        <li>Atraso não justificado(30 minutos tolerância) – Irá aguardar 2 “babas”;</li>
                        <li>Obrigatório utilização de calçado(tênis) para jogar;</li>
                        <li>Utilização de camisa e bermuda nas dependências da Vila Militar;</li>
                    </ul>

                    <h4 className="font-bold mt-4">3- CONFRATERNIZAÇÃO - Conforme disponibilidade financeira</h4>
                    <ul className="list-disc list-inside">
                        <li>A cada 2 meses;</li>
                        <li>A mega festa do final ano, juntamente com o torneio;</li>
                    </ul>

                    <h4 className="font-bold mt-4">4- PADRÃO</h4>
                    <ul className="list-disc list-inside">
                        <li>Prazo de troca do padrão – 2 anos ( data base setembro);</li>
                        <li>Convidado irá utilizar colete(preto e vermelho) o responsável pelo convidado irá lavar(colete disponibilizado pelo CBA);
                            <ul className="list-disc list-inside ml-6">
                                <li>Na falta do colete disponibilizado, o convidado deverá estar disposto de camisa preta e vermelha;</li>
                            </ul>
                        </li>
                        <li>Utilização de bermuda PRETA ou o mais escura possível;</li>
                    </ul>

                    <h4 className="font-bold mt-4">5- CONVIDADO</h4>
                    <ul className="list-disc list-inside">
                        <li>Limitado a 2 convites, após só com efetivação;</li>
                        <li>Limitador de convidado na lista até sexta, atingindo o quórum de 15 efetivos não irá ter convidado;</li>
                        <li>Convidados deverão ter acima de 30 anos ou no perfil do CBA;</li>
                        <li>Permissão de 2 convidados por domingo – Considerando uma taxa de manutenção paga pelo mensalista responsável de R$ 10,00;</li>
                    </ul>

                    <h4 className="font-bold mt-4">6- PARA PERMANENCIA NO CBA DEVERÁ</h4>
                    <ul className="list-disc list-inside">
                        <li>Manter assiduidade e a exclusão do grupo irá ocorrer após 2 meses de inatividade;</li>
                        <li>A Inatividade poderá ser levado em conta o período de até 4 meses;</li>
                        <li>Inadimplência por 3 meses, irá ocorrer a exclusão;</li>
                    </ul>

                    <h4 className="font-bold mt-4">7- EXCEÇÕES</h4>
                    <ul className="list-disc list-inside">
                        <li>Soldados e Oficiais da Policia Militar;</li>
                        <li>Não atingindo o limite do quórum mínimo(15 mensalistas) e os convidados estarem fora do padrão, deverá ser analisado caso a caso por Neilor;</li>
                        <li>Referente a assiduidade, irá ser analisado caso impossibilidade da presença;</li>
                    </ul>
                </>
            )
        },
        {
            title: "Ata reunião 06/01/2025",
            content: (
                 <>
                    <h3 className="font-bold">Ata de Reunião - CBA-Basquete dos Aposentados</h3>
                    <p><strong>Data:</strong> 06/01/2025</p>
                    <p><strong>Horário:</strong> 20h</p>
                    <p><strong>Local:</strong> Reunião Online</p>
                    <p><strong>Presidente da Reunião:</strong> Neilor Leite</p>
                    <p><strong>Vice-presidente:</strong> Lucas Portugal</p>
                    
                    <h4 className="font-bold mt-4">Pauta da Reunião</h4>
                    <ol className="list-decimal list-inside">
                        <li>Prestação de contas 2024/2025</li>
                        <li>Novo padrão CBA 2025</li>
                        <li>Site do CBA</li>
                        <li>Assiduidade dos Associados</li>
                        <li>Cota Social</li>
                        <li>Confraternizações</li>
                    </ol>

                    <h4 className="font-bold mt-4">Resoluções</h4>
                    <p>As seguintes decisões foram tomadas durante a reunião:</p>
                    <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Prestação de Contas:</strong> O Sr. Neilor será responsável por realizar a prestação de contas referente aos anos mencionados anteriormente.</li>
                        <li><strong>Verificação de Orçamento:</strong> Será efetuada uma consulta ao fabricante para obtenção de um novo orçamento atualizado. Após validação dos valores, os custos serão parcelados entre os jogadores.</li>
                        <li><strong>Criação e Gestão do Site:</strong> Foi informado que o site oficial do CBA (www.basquetedosaposentados.com.br) já está criado. Os responsáveis pela gestão do site deverão alimentar os dados de cadastro necessários para apresentação aos jogadores.</li>
                        <li><strong>Controle de Presença:</strong> Será implementado um sistema de controle de presença dos jogadores. A cada 60 dias, um relatório de assiduidade será disponibilizado, e os jogadores deverão cumprir uma frequência mínima de 50% dos jogos. Em caso de descumprimento da meta estabelecida, o jogador deverá apresentar uma justificativa para as ausências.</li>
                        <li><strong>Política de Cota de Mensalidade:</strong> Será oferecida uma cota especial para os jogadores que comprovarem situação de desemprego. Essa política permitirá que o jogador tenha até 360 dias para regularizar sua situação financeira. Caso o jogador retorne ao mercado de trabalho antes do prazo estipulado, o pagamento da mensalidade padrão (R$ 20,00) deverá ser retomado imediatamente.</li>
                        <li><strong>Confraternização Periódica:</strong> Será realizado a cada 90 dias uma confraternização do grupo, a data será verificada nos últimos 30 dias, será disponibilizado um valor a ser combinado do caixa do CBA para aquisição do churrasco.</li>
                    </ol>

                    <h4 className="font-bold mt-4">Prazos</h4>
                    <p>Até 07/01/2025 – Prestação de Contas anos 2024/2025</p>

                    <h4 className="font-bold mt-4">Encerramento</h4>
                    <p>Nada mais havendo a tratar, a reunião foi encerrada às (21:45).</p>
                    <p className="mt-8">____________________Neilor de Paiva Leite___________________<br />Assinatura do Presidente</p>
                    <p className="mt-4">________________Lucas Pereira Portugal____________________<br />Assinatura do Vice-presidente</p>
                </>
            )
        },
        {
            title: "Ata reunião 02/04/2025",
            content: (
                <>
                    <h3 className="font-bold">Ata de Reunião - CBA-Basquete dos Aposentados</h3>
                    <p><strong>Data:</strong> 02/04/2025</p>
                    <p><strong>Horário:</strong> 20h</p>
                    <p><strong>Local:</strong> Reunião Online</p>
                    <p><strong>Presidente da Reunião:</strong> Neilor Leite</p>
                    <p><strong>Vice-presidente:</strong> Lucas Portugal</p>
                    
                    <h4 className="font-bold mt-4">Pauta da Reunião</h4>
                    <ol className="list-decimal list-inside">
                        <li>Prestação de contas 2024/2025</li>
                        <li>Novo padrão CBA 2025</li>
                        <li>Site do CBA</li>
                        <li>Assiduidade dos Associados</li>
                        <li>Cota Social</li>
                        <li>Confraternizações</li>
                    </ol>

                    <h4 className="font-bold mt-4">Resoluções</h4>
                    <p>As seguintes decisões foram tomadas durante a reunião:</p>
                    <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Prestação de Contas:</strong> O Sr. Neilor será responsável por realizar a prestação de contas referente aos anos mencionados anteriormente.</li>
                        <li><strong>Verificação de Orçamento:</strong> Será efetuada uma consulta ao fabricante para obtenção de um novo orçamento atualizado. Após validação dos valores, os custos serão parcelados entre os jogadores.</li>
                        <li><strong>Criação e Gestão do Site:</strong> Foi informado que o site oficial do CBA (www.basquetedosaposentados.com.br) já está criado. Os responsáveis pela gestão do site deverão alimentar os dados de cadastro necessários para apresentação aos jogadores.</li>
                        <li><strong>Controle de Presença:</strong> Será implementado um sistema de controle de presença dos jogadores. A cada 60 dias, um relatório de assiduidade será disponibilizado, e os jogadores deverão cumprir uma frequência mínima de 50% dos jogos. Em caso de descumprimento da meta estabelecida, o jogador deverá apresentar uma justificativa para as ausências.</li>
                        <li><strong>Política de Cota de Mensalidade:</strong> Será oferecida uma cota especial para os jogadores que comprovarem situação de desemprego. Essa política permitirá que o jogador tenha até 360 dias para regularizar sua situação financeira. Caso o jogador retorne ao mercado de trabalho antes do prazo estipulado, o pagamento da mensalidade padrão (R$ 20,00) deverá ser retomado imediatamente.</li>
                        <li><strong>Confraternização Periódica:</strong> Será realizado a cada 90 dias uma confraternização do grupo, a data será verificada nos últimos 30 dias, será disponibilizado um valor a ser combinado do caixa do CBA para aquisição do churrasco.</li>
                    </ol>

                    <h4 className="font-bold mt-4">Prazos</h4>
                    <p>Até 07/01/2025 – Prestação de Contas anos 2024/2025</p>

                    <h4 className="font-bold mt-4">Encerramento</h4>
                    <p>Nada mais havendo a tratar, a reunião foi encerrada às (21:45).</p>
                    <p className="mt-8">____________________Neilor de Paiva Leite___________________<br />Assinatura do Presidente</p>
                    <p className="mt-4">________________Lucas Pereira Portugal____________________<br />Assinatura do Vice-presidente</p>
                </>
            )
        },
        {
            title: "Ata reunião 10/05/2025",
            content: (
                 <>
                    <h3 className="font-bold">Ata de Reunião - CBA-Basquete dos Aposentados</h3>
                    <p><strong>Data:</strong> 10/05/2025</p>
                    <p><strong>Horário:</strong> 14hs</p>
                    <p><strong>Local:</strong> Reunião Online</p>
                    <p><strong>Presidente da Reunião:</strong> Neilor Leite</p>
                    <p><strong>Vice-presidente:</strong> Lucas Portugal</p>
                    
                    <h4 className="font-bold mt-4">Pauta da Reunião</h4>
                    <ol className="list-decimal list-inside">
                        <li>Uniformes 2025</li>
                        <li>Assiduidade</li>
                        <li>Data especiais</li>
                        <li>Arbitragem</li>
                        <li>Regras de Tempo</li>
                    </ol>

                    <h4 className="font-bold mt-4">Resoluções</h4>
                    <p>As seguintes decisões foram tomadas durante a reunião:</p>
                    <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Uniformes:</strong> A partir de 12/05/2025 será realizada a solicitação dos novos uniformes. O prazo estipulado para entrega é de 30 dias. A diretoria está em tratativas com o fornecedor para reduzir esse prazo. Caso não seja possível, será considerado um novo fornecedor.</li>
                        <li><strong>Assiduidade:</strong> Com base no relatório anexo, foi constatado que a maioria dos jogadores possui assiduidade inferior a 50%. Reconhecemos que muitos encontram-se afastados por motivos médicos ou pessoais. Para manter o quórum adequado, a diretoria deliberou pela adição de 4 novos jogadores. Ressalta-se que, até o momento, nenhum jogador será excluído.</li>
                        <li><strong>Datas especiais:</strong> Nas datas especiais será disponibilizada uma lista para confirmação de presença. Caso o número mínimo de 12 jogadores (incluindo convidados) não seja atingido até sexta-feira, às 18h, o jogo do domingo subsequente será cancelado.</li>
                        <li><strong>Arbitragem:</strong> As partidas contarão com dois árbitros, desde que o quórum mínimo de 12 jogadores seja alcançado. Caso contrário, não haverá arbitragem.</li>
                        <li><strong>Tempo:</strong> Por se tratar de um jogo amistoso entre amigos, não será aplicada a contagem de tempos técnicos (8 / 24 / 3 segundos). No entanto, em caso de falta que justifique, será permitido o arremesso de lance livre.</li>
                    </ol>

                    <h4 className="font-bold mt-4">Prazos</h4>
                    <p>Até 12/05/2025 – Nova solicitação de uniformes.</p>

                    <h4 className="font-bold mt-4">Encerramento</h4>
                    <p>Nada mais havendo a tratar, a reunião foi encerrada às (16hs).</p>
                    <p className="mt-8">____________________Neilor de Paiva Leite___________________<br />Assinatura do Presidente</p>
                    <p className="mt-4">________________Lucas Pereira Portugal____________________<br />Assinatura do Vice-presidente</p>
                </>
            )
        }
    ];

    return (
        <div className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">Estatuto e Regras do CBA</h2>
            <div className="space-y-2">
                {estatutoItens.map((item) => (
                    <AccordionItem
                        key={item.title}
                        title={item.title}
                        isOpen={openAccordion === item.title}
                        onClick={() => toggleAccordion(item.title)}
                    >
                        {item.content}
                    </AccordionItem>
                ))}
            </div>
        </div>
    );
};


const FinancasTab = ({ financeData, isLoading, error, currentUser, isAdmin, scriptUrl, pixCode }) => {
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [emailMessage, setEmailMessage] = useState({ text: '', type: '' });
    const [copySuccess, setCopySuccess] = useState('');

    useEffect(() => {
        if (!financeData || !financeData.paymentStatus || financeData.paymentStatus.length === 0) return;

        if (isAdmin) {
            // Set default to the first player for admins
            setSelectedPlayer(financeData.paymentStatus[0].player);
        } else {
            // Find and set the current user for non-admins
            const userRecord = financeData.paymentStatus.find(p => p.player.toLowerCase() === currentUser.name.toLowerCase());
            if (userRecord) {
                setSelectedPlayer(userRecord.player);
            }
        }
    }, [financeData, isAdmin, currentUser.name]);

    const handleCopyToClipboard = (e) => {
        const textToCopy = pixCode;
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setCopySuccess('Copiado!');
            setTimeout(() => setCopySuccess(''), 2000);
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            setCopySuccess('Falha ao copiar');
             setTimeout(() => setCopySuccess(''), 2000);
        }
        document.body.removeChild(textArea);
    };


    const formatCurrency = (value) => {
        if (typeof value !== 'number') return 'R$ 0,00';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getEnhancedStatus = (monthName, originalStatus) => {
        const statusStr = String(originalStatus || '').trim();
        
        if (statusStr.toLowerCase() === 'isento') {
            return { text: 'Isento', type: 'info' };
        }
        
        if (statusStr === '20') {
            return { text: 'Pago', type: 'pago' };
        }

        const monthMap = {
            "janeiro": 0, "fevereiro": 1, "março": 2, "abril": 3, "maio": 4, "junho": 5,
            "julho": 6, "agosto": 7, "setembro": 8, "outubro": 9, "novembro": 10, "dezembro": 11
        };
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Assuming the data is always for the current year. This can be enhanced with a year selector.
        const monthIndex = monthMap[monthName.toLowerCase()];

        if (monthIndex < currentMonth) {
            return { text: 'Em débito', type: 'atrasado' };
        }

        return { text: 'A Pagar', type: 'pendente' };
    };

    const getStatusPill = (statusInfo) => {
        let colorClass = 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300'; // default/info
        if (statusInfo.type === 'pago') colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        if (statusInfo.type === 'pendente') colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-300';
        if (statusInfo.type === 'atrasado') colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        
        return (
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
                {statusInfo.text}
            </span>
        );
    };

    const handleSendReports = async () => {
        setIsSending(true);
        setEmailMessage({ text: 'A enviar relatórios...', type: 'info' });

        try {
            const data = await fetchWithPost(scriptUrl, { action: 'sendFinanceReports' });
            if (data.result === 'success') {
                setEmailMessage({ text: data.message, type: 'success' });
            } else {
                throw new Error(data.message || 'Ocorreu um erro desconhecido.');
            }
        } catch (error) {
            setEmailMessage({ text: `Erro ao enviar e-mails: ${error.message}`, type: 'error' });
        } finally {
            setIsSending(false);
        }
    };
    
    if (isLoading) return <Loader message="A carregar dados financeiros..." />;
    if (error) return <p className="text-center text-red-500 py-8">{error}</p>;
    if (!financeData) return <p className="text-center text-gray-500 py-8">Nenhum dado financeiro encontrado.</p>;

    const playerData = financeData.paymentStatus?.find(p => p.player === selectedPlayer);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(pixCode)}&size=180x180&margin=10`;


    return (
        <div className="space-y-8">
            <section className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-gray-100">Resumo Financeiro</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                    <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Total de Receitas</h3>
                        <p className="text-3xl font-bold text-green-800 dark:text-green-200">{formatCurrency(financeData.summary.revenue)}</p>
                    </div>
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Total de Despesas</h3>
                        <p className="text-3xl font-bold text-red-800 dark:text-red-200">{formatCurrency(financeData.summary.expense)}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${financeData.summary.balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                        <h3 className={`text-lg font-semibold ${financeData.summary.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>Saldo Atual</h3>
                        <p className={`text-3xl font-bold ${financeData.summary.balance >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-orange-800 dark:text-orange-200'}`}>{formatCurrency(financeData.summary.balance)}</p>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <section className="lg:col-span-2 bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Histórico de Pagamentos</h2>
                    
                    <div className="mb-6">
                        <label htmlFor="player-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selecione um Jogador:</label>
                        <select
                            id="player-select"
                            value={selectedPlayer}
                            onChange={(e) => setSelectedPlayer(e.target.value)}
                            disabled={!isAdmin}
                            className="w-full max-w-xs p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-200 dark:disabled:bg-gray-700/50"
                        >
                            {financeData.paymentStatus?.map(p => <option key={p.player} value={p.player}>{p.player}</option>)}
                        </select>
                    </div>

                    {playerData ? (
                        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-fade-in">
                            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-6">{playerData.player}</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {financeData.paymentHeaders?.map(month => {
                                    const statusInfo = getEnhancedStatus(month, playerData.statuses[month]);
                                    return (
                                        <div key={month} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-gray-700/50 rounded-lg shadow-sm">
                                            <span className="font-semibold text-gray-700 dark:text-gray-200 mb-2 capitalize">{month}</span>
                                            {getStatusPill(statusInfo)}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            {isAdmin ? 'Selecione um jogador para ver seu histórico.' : 'Não foi possível encontrar seu histórico de pagamentos.'}
                        </p>
                    )}
                </section>
                
                <section className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg flex flex-col items-center">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Pagamento via PIX</h2>
                    <div className="p-2 bg-white rounded-lg">
                        <img src={qrCodeUrl} alt="QR Code PIX" className="w-48 h-48" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">Aponte a câmera do seu celular para pagar.</p>
                    <div className="mt-4 w-full">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">PIX Copia e Cola</label>
                        <div className="relative">
                            <input type="text" readOnly value={pixCode} className="w-full p-2 pr-10 text-xs bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md" />
                            <button onClick={handleCopyToClipboard} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" /><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H4z" /></svg>
                            </button>
                        </div>
                        {copySuccess && <p className="text-green-600 text-xs mt-1 text-center">{copySuccess}</p>}
                    </div>
                </section>
            </div>

            {isAdmin && (
                <section className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Ações Administrativas</h2>
                    <div className="flex flex-col items-start gap-4">
                        <button
                            onClick={handleSendReports}
                            disabled={isSending}
                            className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 disabled:bg-gray-400 transition-all shadow-md flex items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            {isSending ? 'Enviando...' : 'Enviar Relatório Mensal por Email'}
                        </button>
                        {emailMessage.text && (
                            <div className={`p-3 rounded-md text-sm w-full ${emailMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {emailMessage.text}
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
};


const SorteioTab = ({ allPlayersData, scriptUrl, ModalComponent }) => {
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [teams, setTeams] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [modalInfo, setModalInfo] = useState({ isOpen: false, title: '', message: '' });

    const sortedPlayers = useMemo(() => 
        [...allPlayersData].sort((a, b) => a.name.localeCompare(b.name)),
    [allPlayersData]);

    const handlePlayerToggle = (playerName) => {
        setSelectedPlayers(prev =>
            prev.includes(playerName)
                ? prev.filter(name => name !== playerName)
                : [...prev, playerName]
        );
    };

    const handleDrawTeams = () => {
        if (selectedPlayers.length < 10) {
            setModalInfo({ isOpen: true, title: 'Erro no Sorteio', message: 'É necessário selecionar pelo menos 10 jogadores para o sorteio.' });
            return;
        }

        const playersToDraw = [...selectedPlayers].slice(0, 10);

        for (let i = playersToDraw.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playersToDraw[i], playersToDraw[j]] = [playersToDraw[j], playersToDraw[i]];
        }

        const teamBlack = playersToDraw.slice(0, 5);
        const teamRed = playersToDraw.slice(5, 10);

        setTeams({ teamBlack, teamRed });
    };

    const handleSaveDraw = async () => {
        if (!teams) {
            setModalInfo({ isOpen: true, title: 'Erro', message: 'Nenhum time foi sorteado ainda.' });
            return;
        }
        setIsLoading(true);
        setModalInfo({ isOpen: false, title: '', message: '' });

        const payload = {
            action: 'saveTeams',
            teamBlack: teams.teamBlack.join(','),
            teamRed: teams.teamRed.join(','),
        };

        try {
            const data = await fetchWithPost(scriptUrl, payload);
            if (data.result === 'success') {
                setModalInfo({ isOpen: true, title: 'Sucesso', message: 'Times salvos com sucesso na planilha!' });
            } else {
                throw new Error(data.message || 'Ocorreu um erro desconhecido.');
            }
        } catch (error) {
            setModalInfo({ isOpen: true, title: 'Erro ao Salvar', message: `Não foi possível salvar os times. ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleReset = () => {
        setSelectedPlayers([]);
        setTeams(null);
    };

    return (
        <div className="space-y-8">
            <ModalComponent 
                isOpen={modalInfo.isOpen} 
                onClose={() => setModalInfo({ isOpen: false, title: '', message: '' })}
                title={modalInfo.title}
            >
                <p>{modalInfo.message}</p>
            </ModalComponent>

            {!teams && (
                <section className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Seleção de Jogadores</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Selecione os jogadores presentes para o sorteio de hoje. Os 10 primeiros selecionados participarão do sorteio.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {sortedPlayers.map(player => (
                            <button
                                key={player.name}
                                onClick={() => handlePlayerToggle(player.name)}
                                className={`p-3 rounded-lg text-center font-semibold transition-all duration-200 border-2 ${
                                    selectedPlayers.includes(player.name)
                                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                {player.name}
                            </button>
                        ))}
                    </div>
                    <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                         <p className="font-semibold text-lg">{selectedPlayers.length} / {allPlayersData.length} selecionados</p>
                        <button
                            onClick={handleDrawTeams}
                            disabled={selectedPlayers.length < 10}
                            className="w-full sm:w-auto bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                            Sortear Times
                        </button>
                    </div>
                </section>
            )}

            {teams && (
                <section className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg text-center animate-fade-in-up">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Times Sorteados!</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <h3 className="text-2xl font-bold text-white mb-4">Time Preto ⚫</h3>
                            <ul className="space-y-3">
                                {teams.teamBlack.map(player => (
                                    <li key={player} className="text-white text-lg font-medium bg-gray-700 p-2 rounded-md">{player}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-red-700 p-6 rounded-lg">
                             <h3 className="text-2xl font-bold text-white mb-4">Time Vermelho 🔴</h3>
                             <ul className="space-y-3">
                                {teams.teamRed.map(player => (
                                    <li key={player} className="text-white text-lg font-medium bg-red-600 p-2 rounded-md">{player}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                        {isLoading ? (
                            <Loader message="A salvar..." />
                        ) : (
                            <button
                                onClick={handleSaveDraw}
                                className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all shadow-lg"
                            >
                                Salvar Sorteio na Planilha
                            </button>
                        )}
                        <button
                            onClick={handleReset}
                            className="w-full sm:w-auto bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-all shadow-lg"
                        >
                            Sortear Novamente
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
};


const EventosTab = ({ scriptUrl, currentUser, isAdmin, ModalComponent, refreshKey }) => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });

    const formatCurrency = (value) => {
        if (typeof value !== 'number') return 'R$ 0,00';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    
    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchWithPost(scriptUrl, { action: 'getEvents' });
            if (data.result === 'success') {
                const formattedEvents = data.data.map(event => ({
                    ...event,
                    value: parseFloat(event.value) || 0,
                    attendees: event.attendees ? event.attendees.split(',').map(name => name.trim()) : []
                }));
                setEvents(formattedEvents);
            } else {
                throw new Error(data.message || 'Falha ao buscar eventos.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [scriptUrl]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents, refreshKey]);

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
        // --- SEU CÓDIGO ATUAL ---
        setIsModalOpen(false);
        setEditingEvent(null);
        fetchEvents(); // Refresh

        // --- NOVO BLOCO DE CÓDIGO ADICIONADO ---
        // Se for um evento novo (e não uma edição), pergunta se o usuário quer salvar no calendário.
        if (!isEditing && window.ReactNativeWebView) {
          const eventDetails = {
            title: payload.name,
            // O campo 'date' do formulário já vem no formato datetime-local (YYYY-MM-DDTHH:mm)
            startDate: payload.date, 
            // O app vai calcular a data final se não for enviada (duração de 2h)
            location: payload.location
          };
          
          // Envia a mensagem para o App para mostrar o pop-up de confirmação
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PROMPT_SAVE_TO_CALENDAR',
            payload: eventDetails
          }));
        }
        // --- FIM DO NOVO BLOCO ---

      } else {
        throw new Error(data.message || 'Ocorreu um erro desconhecido.');
      }
    } catch (error) {
      setModalMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }
    
    const handleAttendance = async (eventId, actionType) => {
        setEvents(prevEvents => prevEvents.map(e => e.id === eventId ? {...e, isConfirming: true} : e));

        const payload = {
            action: 'handleAttendanceUpdate',
            itemId: eventId,
            playerName: currentUser.name,
            actionType: actionType,
            type: 'event'
        };
        try {
             const data = await fetchWithPost(scriptUrl, payload);
            if (data.result === 'success') {
                fetchEvents();
            } else {
                 throw new Error(data.message || `Não foi possível atualizar a presença.`);
            }
        } catch (error) {
            setInfoModal({ isOpen: true, title: 'Erro', message: error.message });
            setEvents(prevEvents => prevEvents.map(e => e.id === eventId ? {...e, isConfirming: false} : e));
        }
    };

     const handleDeleteEvent = async (event) => {
        if (!event) return;
        setConfirmDelete(null); // Close confirmation modal
        setIsLoading(true);
        try {
            const payload = { action: 'deleteEvent', id: event.id };
            const data = await fetchWithPost(scriptUrl, payload);
            if (data.result === 'success') {
                fetchEvents();
            } else {
                throw new Error(data.message || "Não foi possível apagar o evento.");
            }
        } catch (err) {
            setInfoModal({ isOpen: true, title: 'Erro ao Apagar', message: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && events.length === 0) return <Loader message="A carregar eventos..." />;
    if (error) return <p className="text-center text-red-500 py-8">{error}</p>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Próximas Confraternizações</h2>
                {isAdmin && (
                    <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-all shadow-md">
                        Criar Evento
                    </button>
                )}
            </div>

            {events.length === 0 && !isLoading ? (
                <p className="text-center text-gray-500 py-8">Nenhum evento agendado no momento.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {events.map(event => {
                        const isConfirmed = event.attendees.includes(currentUser.name);
                        const deadlineDate = new Date(event.deadline);
                        const isDeadlinePassed = new Date() > deadlineDate;
                        const totalCollected = event.attendees.length * event.value;

                        return (
                        <div key={event.id} className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg flex flex-col">
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{event.name}</h3>
                                {isAdmin && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(event)} className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                        <button onClick={() => setConfirmDelete(event)} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">{event.location}</p>
                            <p className="text-xs text-red-600 font-bold mb-4">Data limite para confirmação: {new Date(event.deadline).toLocaleDateString('pt-BR')}</p>
                            
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg mb-4">
                                <p className="text-gray-700 dark:text-gray-300 mb-2 flex-grow">{event.description}</p>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-gray-600 dark:text-gray-300">Valor por pessoa:</span>
                                    <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(event.value)}</span>
                                </div>
                                 <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="font-semibold text-gray-600 dark:text-gray-300">Total arrecadado:</span>
                                    <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(totalCollected)}</span>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <h4 className="font-bold text-sm mb-2 text-gray-800 dark:text-gray-200">Confirmados ({event.attendees.length}):</h4>
                                <div className="flex flex-wrap gap-2">
                                    {event.attendees.length > 0 ? event.attendees.map(name => (
                                        <span key={name} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 text-xs font-semibold rounded-full">{name}</span>
                                    )) : <p className="text-xs text-gray-500 dark:text-gray-400">Ninguém confirmado ainda.</p>}
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                                {isConfirmed ? (
                                    <button
                                        onClick={() => handleAttendance(event.id, 'withdraw')}
                                        disabled={isDeadlinePassed || event.isConfirming}
                                        className={`w-full font-bold py-2 px-4 rounded-lg transition-all ${isDeadlinePassed ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}`}>
                                        {event.isConfirming ? 'A processar...' : 'Desistir'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleAttendance(event.id, 'confirm')}
                                        disabled={isDeadlinePassed || event.isConfirming}
                                        className={`w-full font-bold py-2 px-4 rounded-lg transition-all ${!isDeadlinePassed ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                                        {event.isConfirming ? 'A processar...' : 'Confirmar Presença'}
                                    </button>
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            <ModalComponent isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvent ? "Editar Evento" : "Criar Novo Evento"}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <input name="name" type="text" placeholder="Nome do Evento" defaultValue={editingEvent?.name || ''} className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data do Evento</label>
                            <input name="date" type="datetime-local" defaultValue={editingEvent?.date ? new Date(editingEvent.date).toISOString().substring(0, 16) : ''} className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Limite para Confirmação</label>
                            <input name="deadline" type="date" defaultValue={editingEvent?.deadline || ''} className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" required />
                        </div>
                    </div>
                    <input name="location" type="text" placeholder="Local do Evento" defaultValue={editingEvent?.location || ''} className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" required />
                    <input name="value" type="number" step="0.01" placeholder="Valor por Pessoa (ex: 20.00)" defaultValue={editingEvent?.value || ''} className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" required />
                    <textarea name="description" placeholder="Descrição (detalhes, o que levar, etc.)" defaultValue={editingEvent?.description || ''} className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" rows="4" required></textarea>
                    {modalMessage && <p className="text-red-500 text-sm">{modalMessage}</p>}
                    <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                        {isSubmitting ? 'A guardar...' : (editingEvent ? 'Guardar Alterações' : 'Criar Evento')}
                    </button>
                </form>
            </ModalComponent>
            
            <ModalComponent 
                isOpen={!!confirmDelete} 
                onClose={() => setConfirmDelete(null)}
                title="Confirmar Exclusão"
            >
                <div>
                    <p>Tem a certeza que quer apagar o evento "<strong>{confirmDelete?.name}</strong>"? Esta ação não pode ser desfeita.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancelar</button>
                        <button onClick={() => handleDeleteEvent(confirmDelete)} className="py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">Apagar</button>
                    </div>
                </div>
            </ModalComponent>

            <ModalComponent 
                isOpen={infoModal.isOpen} 
                onClose={() => setInfoModal({ isOpen: false, title: '', message: '' })} 
                title={infoModal.title}
            >
                <p>{infoModal.message}</p>
            </ModalComponent>
        </div>
    );
};

// --- NOVA ABA DE JOGOS ---
const JogosTab = ({ currentUser, isAdmin, scriptUrl, ModalComponent, refreshKey }) => {
    const [games, setGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGame, setEditingGame] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });
    const [confirmDelete, setConfirmDelete] = useState(null);

    const fetchGames = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchWithPost(scriptUrl, { action: 'getGames' });
            if (data.result === 'success') {
                const sortedGames = data.data.sort((a, b) => new Date(b.data) - new Date(a.data));
                setGames(sortedGames);
            } else {
                throw new Error(data.message || 'Falha ao buscar jogos.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [scriptUrl]);

    useEffect(() => {
        fetchGames();
    }, [fetchGames, refreshKey]);

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
        // --- SEU CÓDIGO ATUAL ---
        setIsModalOpen(false);
        setEditingGame(null);
        fetchGames();

        // --- NOVO BLOCO DE CÓDIGO ADICIONADO ---
        // Se for um jogo novo (e não uma edição), pergunta se o usuário quer salvar no calendário.
        if (!isEditing && window.ReactNativeWebView) {
          const eventDetails = {
            title: `Jogo CBA - ${payload.local}`,
            // Combina data e hora para criar um formato ISO 8601 que o app entende
            startDate: `${payload.data}T${payload.horario}:00`,
            // O app vai calcular a data final se não for enviada (duração de 2h)
            location: payload.local
          };

          // Envia a mensagem para o App para mostrar o pop-up de confirmação
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PROMPT_SAVE_TO_CALENDAR',
            payload: eventDetails
          }));
        }
        // --- FIM DO NOVO BLOCO ---

      } else {
        throw new Error(data.message || 'Ocorreu um erro desconhecido.');
      }
    } catch (error) {
      setModalMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
 

    const handleAttendance = async (gameId, actionType) => {
        const payload = {
            action: 'handleAttendanceUpdate',
            itemId: gameId,
            playerName: currentUser.name,
            actionType: actionType,
            type: 'game'
        };

        try {
            const data = await fetchWithPost(scriptUrl, payload);
            if (data.result !== 'success') {
                throw new Error(data.message || 'Erro ao atualizar presença.');
            }
            fetchGames(); // Re-fetch to get the latest state
        } catch (err) {
            setInfoModal({isOpen: true, title: "Erro", message: err.message});
        }
    };
    
    const handleDeleteGame = async (game) => {
        if (!game) return;
        setConfirmDelete(null); // Close confirmation modal
        setIsLoading(true);
        try {
            const payload = { action: 'deleteGame', id: game.id };
            const data = await fetchWithPost(scriptUrl, payload);
            if (data.result === 'success') {
                fetchGames();
            } else {
                throw new Error(data.message || "Não foi possível apagar o jogo.");
            }
        } catch (err) {
            setInfoModal({ isOpen: true, title: 'Erro ao Apagar', message: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <Loader message="A carregar jogos..." />;
    if (error) return <p className="text-center text-red-500 py-8">{error}</p>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Próximos Jogos</h2>
                {isAdmin && (
                    <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-all shadow-md">
                        Criar Jogo
                    </button>
                )}
            </div>

            {games.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum jogo agendado no momento.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {games.map(game => {
                        const isConfirmed = game.confirmados.includes(currentUser.name);
                        return (
                            <div key={game.id} className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 rounded-xl shadow-lg flex flex-col relative">
                                {isAdmin && (
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <button onClick={() => handleOpenModal(game)} className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        </button>
                                        <button onClick={() => setConfirmDelete(game)} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-xl font-bold text-gray-800 dark:text-white">{new Date(game.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{game.horario} @ {game.local}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-blue-500">{game.confirmados.length}</p>
                                        <p className="text-xs text-gray-500">Confirmados</p>
                                    </div>
                                </div>
                                
                                <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                                
                                <div className="flex-grow mb-4">
                                    <h4 className="font-bold text-sm mb-2 text-gray-800 dark:text-gray-200">Lista de Presença:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {game.confirmados.length > 0 ? game.confirmados.map(name => (
                                            <span key={name} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 text-xs font-semibold rounded-full">{name}</span>
                                        )) : <p className="text-xs text-gray-500 dark:text-gray-400">Ninguém confirmado ainda.</p>}
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    {isConfirmed ? (
                                        <button
                                            onClick={() => handleAttendance(game.id, 'withdraw')}
                                            className="w-full font-bold py-2 px-4 rounded-lg transition-all bg-red-500 text-white hover:bg-red-600">
                                            Desistir
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAttendance(game.id, 'confirm')}
                                            className="w-full font-bold py-2 px-4 rounded-lg transition-all bg-green-500 text-white hover:bg-green-600">
                                            Confirmar Presença
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ModalComponent isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingGame(null); }} title={editingGame ? "Editar Jogo" : "Criar Novo Jogo"}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data do Jogo</label>
                        <input name="data" type="date" defaultValue={editingGame?.data} className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Horário</label>
                        <input name="horario" type="time" defaultValue={editingGame?.horario} className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Local</label>
                        <input name="local" type="text" placeholder="Local do Jogo" defaultValue={editingGame?.local} className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" required />
                    </div>
                    {modalMessage && <p className="text-red-500 text-sm">{modalMessage}</p>}
                    <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                        {isSubmitting ? (editingGame ? 'A Guardar...' : 'A Criar...') : (editingGame ? 'Guardar Alterações' : 'Criar Jogo')}
                    </button>
                </form>
            </ModalComponent>
            
            <ModalComponent 
                isOpen={!!confirmDelete} 
                onClose={() => setConfirmDelete(null)}
                title="Confirmar Exclusão"
            >
                <div>
                    <p>Tem a certeza que quer apagar o jogo do dia "<strong>{confirmDelete ? new Date(confirmDelete.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}</strong>"? Esta ação não pode ser desfeita.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancelar</button>
                        <button onClick={() => handleDeleteGame(confirmDelete)} className="py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">Apagar</button>
                    </div>
                </div>
            </ModalComponent>

            <ModalComponent 
                isOpen={infoModal.isOpen} 
                onClose={() => setInfoModal({ isOpen: false, title: '', message: '' })} 
                title={infoModal.title}
            >
                <p>{infoModal.message}</p>
            </ModalComponent>
        </div>
    );
};

// --- APLICAÇÃO PRINCIPAL (APÓS LOGIN) ---

const MainApp = ({ user, onLogout, SCRIPT_URL, librariesLoaded }) => {
    const [activeTab, setActiveTab] = useState('presenca');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);

    const [appData, setAppData] = useState({ isLoading: true, data: null, error: null });
    
    const [lastKnownTimestamp, setLastKnownTimestamp] = useState(null);
    const [notifications, setNotifications] = useState({});
    const [refreshKey, setRefreshKey] = useState(0);
    
    const isAdmin = user && user.role && user.role.toUpperCase() === 'ADMIN';
    const TABS = useMemo(() => ['presenca', 'jogos', 'estatuto', 'financas', 'sorteio', 'eventos'], []);
    
    const activeTabRef = useRef(activeTab);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    const fetchInitialAppData = useCallback(async () => {
        setAppData(prev => ({ ...prev, isLoading: true }));
        try {
            const data = await fetchWithPost(SCRIPT_URL, { action: 'getInitialAppData' });
            if (data.result === 'success') {
                setAppData({ isLoading: false, data: data.data, error: null });
            } else {
                throw new Error(data.message || 'Falha ao buscar dados do aplicativo.');
            }
        } catch (error) {
            setAppData({ isLoading: false, data: null, error: `Erro ao carregar dados: ${error.message}` });
        }
    }, [SCRIPT_URL]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        // Limpa o cache no servidor antes de buscar novos dados
        fetchWithPost(SCRIPT_URL, { action: 'clearCache' })
            .then(() => fetchInitialAppData())
            .finally(() => setIsRefreshing(false));
        setRefreshKey(prev => prev + 1);
    }, [fetchInitialAppData, SCRIPT_URL]);

    const handleResetPasswordClose = (shouldLogout) => {
        setIsResetPasswordModalOpen(false);
        if (shouldLogout) {
            onLogout();
        }
    };
    
    useEffect(() => {
        if (librariesLoaded) {
            const getInitialTimestampAndData = async () => {
                try {
                    const data = await fetchWithPost(SCRIPT_URL, { action: 'getLastUpdate' });
                    if (data && data.result === 'success' && typeof data.timestamp === 'string') {
                        setLastKnownTimestamp(data.timestamp || new Date().toISOString());
                        fetchInitialAppData(); 
                    } else {
                       console.error("Resposta inesperada do servidor ao obter timestamp:", data);
                       throw new Error(data?.message || 'Falha ao obter timestamp inicial. A resposta do servidor não foi válida.');
                    }
                } catch (error) {
                    console.error("Falha na carga inicial:", error);
                    setAppData({ isLoading: false, data: null, error: `Erro na carga inicial: ${error.message}` });
                }
            };
            getInitialTimestampAndData();
        }
    }, [librariesLoaded, SCRIPT_URL, fetchInitialAppData]);

    useEffect(() => {
        if (!librariesLoaded || !lastKnownTimestamp) return;

        const checkForUpdates = async () => {
            try {
                const data = await fetchWithPost(SCRIPT_URL, { action: 'getLastUpdate' });
                if (data.result === 'success' && data.timestamp && data.timestamp !== lastKnownTimestamp) {
                    handleRefresh();
                    
                    const newNotifications = {};
                    TABS.forEach(tab => {
                        if (tab !== activeTabRef.current) {
                            newNotifications[tab] = true;
                        }
                    });
                    setNotifications(prev => ({ ...prev, ...newNotifications }));
                    setLastKnownTimestamp(data.timestamp);
                }
            } catch (error) {
                console.error("Falha ao verificar atualizações:", error);
            }
        };

        const intervalId = setInterval(checkForUpdates, 30000);
        return () => clearInterval(intervalId);
    }, [librariesLoaded, lastKnownTimestamp, SCRIPT_URL, TABS, handleRefresh]);
    
    const handleTabClick = (tab) => {
        setActiveTab(tab);
        if (notifications[tab]) {
            setNotifications(prev => ({ ...prev, [tab]: false }));
        }
    };

    const renderTabContent = () => {
        const attendanceData = appData.data?.dashboard;
        const financeData = appData.data?.finance;
        const pixCode = appData.data?.pixCode;

        switch (activeTab) {
            case 'presenca':
                return <PresencaTab allPlayersData={attendanceData?.players || []} dates={attendanceData?.dates || []} isLoading={appData.isLoading} error={appData.error} ModalComponent={Modal} />;
            case 'jogos':
                return <JogosTab currentUser={user} isAdmin={isAdmin} scriptUrl={SCRIPT_URL} ModalComponent={Modal} refreshKey={refreshKey} />;
            case 'estatuto':
                return <EstatutoTab />;
            case 'financas':
                return <FinancasTab financeData={financeData} isLoading={appData.isLoading} error={appData.error} currentUser={user} isAdmin={isAdmin} scriptUrl={SCRIPT_URL} pixCode={pixCode} />;
            case 'sorteio':
                 return <SorteioTab allPlayersData={attendanceData?.players || []} scriptUrl={SCRIPT_URL} ModalComponent={Modal} />;
            case 'eventos':
                return <EventosTab scriptUrl={SCRIPT_URL} currentUser={user} isAdmin={isAdmin} ModalComponent={Modal} refreshKey={refreshKey} />;
            default:
                return null;
        }
    };
    
    const TAB_ICONS = {
        presenca: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        jogos: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" /></svg>,
        estatuto: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
        financas: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        sorteio: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0 1.172 1.953 1.172 5.119 0 7.072z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>,
        eventos: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans min-h-screen">
            <div className="container mx-auto p-4 md:p-8">
                <header className="mb-8 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left">
                    <div className="flex items-center space-x-4">
                        {user.fotoUrl ? (
                            <img src={user.fotoUrl} alt={user.name} className="h-16 w-16 rounded-full shadow-lg object-cover" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/64x64/e2e8f0/4a5568?text=' + user.name.charAt(0); }} />
                        ) : (
                           <div className="h-16 w-16 rounded-full shadow-lg bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                                <span className="text-3xl text-gray-500 dark:text-gray-400">{user.name.charAt(0)}</span>
                           </div>
                        )}
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Portal do CBA</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Bem-vindo, {user.name}!</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 pt-4 sm:pt-0">
                        <button onClick={() => setIsResetPasswordModalOpen(true)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Resetar Senha</button>
                        <button onClick={onLogout} className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline">Sair</button>
                        <button onClick={handleRefresh} disabled={isRefreshing} className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <svg className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${isRefreshing ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4a14.95 14.95 0 0117.47 9.47M20 20a14.95 14.95 0 01-17.47-9.47" />
                            </svg>
                        </button>
                    </div>
                </header>

                <div className="mb-6">
                    <nav className="flex space-x-1 sm:space-x-2 p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => handleTabClick(tab)}
                                className={`w-full relative py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-medium rounded-md transition-colors duration-300 flex items-center justify-center ${activeTab === tab ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-200'}`}
                            >
                                {TAB_ICONS[tab]}
                                <span className="hidden sm:inline">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                                {notifications[tab] && (
                                    <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-800"></span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                <div id="tab-content">
                    {renderTabContent()}
                </div>
            </div>
            <ResetPasswordModal 
                isOpen={isResetPasswordModalOpen} 
                onClose={handleResetPasswordClose} 
                user={user} 
                scriptUrl={SCRIPT_URL} 
            />
        </div>
    );
}


// --- COMPONENTE ROOT ---
export default function App() {
    const [auth, setAuth] = useState({ status: 'unauthenticated', user: null, error: null });
    const [librariesLoaded, setLibrariesLoaded] = useState(false);
    
    // NOVO LINK DO SCRIPT ATUALIZADO
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbydLIlFajjG5lM0DQa24yGrEwarxZctdOB4c9gDiaOwpqUJynb9ediyOU5cKDRAeg_2EQ/exec";

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuth({ status: 'loading', user: null, error: null });
        const payload = {
            action: 'loginUser',
            email: e.target.email.value,
            password: e.target.password.value
        };
          
        try {
            const data = await fetchWithPost(SCRIPT_URL, payload);
            if (data.status === 'approved') {
                setAuth({ status: 'authenticated', user: { name: data.name, email: data.email, role: data.role, fotoUrl: data.fotoUrl }, error: null });
            } else if (data.status === 'pending') {
                setAuth({ status: 'pending', user: null, error: null });
            } else {
                setAuth({ status: 'unauthenticated', user: null, error: data.message });
            }
        } catch (error) {
            setAuth({ status: 'unauthenticated', user: null, error: 'Falha na comunicação com o servidor.' });
        }
    };
    
    const handleLogout = () => {
        setAuth({ status: 'unauthenticated', user: null, error: null });
    };

    useEffect(() => {
        const loadScript = (src, id) => new Promise((resolve, reject) => {
            if (document.getElementById(id)) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.id = id;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.body.appendChild(script);
        });

        Promise.all([
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js', 'papaparse-script'),
            loadScript('https://cdn.jsdelivr.net/npm/chart.js', 'chartjs-script')
        ])
        .then(() => setLibrariesLoaded(true))
        .catch(error => console.error("Failed to load essential libraries:", error));
    }, []);

    const renderContent = () => {
        if (!librariesLoaded && auth.status !== 'authenticated') {
             return <Loader message="A carregar bibliotecas..." />;
        }
        if (auth.status === 'loading') {
            return <Loader message="A processar..." />;
        }
    
        if (auth.status === 'unauthenticated') {
            return <LoginScreen 
                onLogin={handleLogin} 
                isLoading={auth.status === 'loading'} 
                error={auth.error} 
            />;
        }
        
        if (auth.status === 'pending') {
            return <PendingScreen />;
        }
    
        return (
            <MainApp user={auth.user} onLogout={handleLogout} SCRIPT_URL={SCRIPT_URL} librariesLoaded={librariesLoaded} />
        );
    };

    return (
        <ThemeProvider>
            <div className="bg-gray-100 dark:bg-gray-900 min-h-screen transition-colors duration-300">
                {renderContent()}
            </div>
        </ThemeProvider>
    );
}
