import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// --- COMPONENTES AUXILIARES DE UI ---

const Loader = ({ message }) => (
    <div className="flex flex-col justify-center items-center py-20 text-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
        {message && <p className="mt-4 text-lg text-gray-600">{message}</p>}
    </div>
);

const SkeletonCard = () => (
    <div className="bg-white rounded-xl shadow-md animate-pulse">
        <div className="p-5">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
            <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="flex justify-between items-center">
                    <div className="h-4 bg-gray-200 rounded w-2/5"></div>
                    <div className="h-6 bg-gray-300 rounded w-1/3"></div>
                </div>
            </div>
        </div>
        <div className="bg-gray-50 px-5 py-3 flex justify-between items-center">
            <div className="h-8 bg-gray-200 rounded-full w-20"></div>
            <div className="flex gap-3">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
            </div>
        </div>
    </div>
);


const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto transform transition-all scale-95 animate-fade-in-up">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
};

const AccordionItem = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const contentRef = useRef(null);
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                className="flex justify-between items-center w-full p-4 font-semibold text-lg text-left text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{title}</span>
                <svg className={`w-6 h-6 shrink-0 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            <div
                ref={contentRef}
                style={{ maxHeight: isOpen ? `${contentRef.current.scrollHeight}px` : '0' }}
                className="overflow-hidden transition-max-height duration-500 ease-in-out bg-white"
            >
                <div className="p-5 prose max-w-none border-t border-gray-200">{children}</div>
            </div>
        </div>
    );
};

const ChartComponent = ({ chartConfig }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    useEffect(() => {
        if (chartInstance.current) chartInstance.current.destroy();
        if (chartRef.current && chartConfig && window.Chart) {
            const ctx = chartRef.current.getContext('2d');
            chartInstance.current = new window.Chart(ctx, chartConfig);
        }
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [chartConfig]);
    return <canvas ref={chartRef}></canvas>;
};

// --- COMPONENTES DAS ABAS ---

const PresencaTab = ({ allPlayersData, dates, isLoading, error, ModalComponent }) => {
    const [filter, setFilter] = useState('all');
    const [report, setReport] = useState(null);
    const [monthRange, setMonthRange] = useState({ start: '', end: '' });
    const [modalPlayer, setModalPlayer] = useState(null);
    const [selectedPerformancePlayer, setSelectedPerformancePlayer] = useState('');

    const availableMonths = useMemo(() => {
        const monthSet = new Set();
        dates.forEach(d => {
            const [day, month, year] = d.split('/');
            monthSet.add(`${year}-${month.padStart(2, '0')}`);
        });
        return Array.from(monthSet).sort();
    }, [dates]);

    const performanceData = useMemo(() => {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const relevantDates = dates.filter(d => {
            const [day, month, year] = d.split('/');
            return new Date(`${year}-${month}-${day}`) >= sixtyDaysAgo;
        });

        if (relevantDates.length === 0) return [];

        return allPlayersData.map(player => {
            const presencesInPeriod = relevantDates.reduce((count, date) => {
                return count + (player.attendance[date]?.includes('✅') ? 1 : 0);
            }, 0);
            
            const performancePercentage = (presencesInPeriod / relevantDates.length) * 100;
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

    useEffect(() => {
        if (availableMonths.length > 0) {
            setMonthRange({ start: availableMonths[0], end: availableMonths[availableMonths.length - 1] });
        }
        if(allPlayersData.length > 0) {
            setSelectedPerformancePlayer(allPlayersData[0].name);
        }
    }, [availableMonths, allPlayersData]);

    if (isLoading) return <Loader message="A carregar dados da planilha de presença..." />;
    if (error) return <p className="text-center text-red-500 py-8">{error}</p>;
    if (!allPlayersData.length) return <p className="text-center text-gray-500 py-8">Nenhum dado de presença encontrado.</p>;

    const getHallOfFameData = () => {
        const sortedByAverage = [...allPlayersData].sort((a, b) => b.average - a.average || a.name.localeCompare(b.name));
        const sortedByTotalPresence = [...allPlayersData].sort((a, b) => b.presences - a.presences || a.name.localeCompare(b.name));
        const leastPresentSorted = [...allPlayersData].sort((a, b) => a.average - b.average || a.name.localeCompare(b.name));
        const lastGameDate = new Date(dates[dates.length - 1].split('/').reverse().join('-'));
        const lastMonth = lastGameDate.getMonth();
        const lastYear = lastGameDate.getFullYear();
        const gamesInLastMonth = dates.filter(d => {
            const gameDate = new Date(d.split('/').reverse().join('-'));
            return gameDate.getMonth() === lastMonth && gameDate.getFullYear() === lastYear;
        });
        const perfectPlayers = gamesInLastMonth.length > 0 ? allPlayersData.filter(p => gamesInLastMonth.every(date => p.attendance[date]?.includes('✅'))) : [];
        return { onFire: sortedByAverage[0], mostPresent: sortedByTotalPresence[0], leastPresent: leastPresentSorted.slice(0, 3), monthlyPerfect: perfectPlayers };
    };

    const hallOfFame = getHallOfFameData();
    const attendanceChartConfig = { type: 'line', data: { labels: dates, datasets: [{ label: 'Jogadores Presentes', data: dates.map(date => allPlayersData.reduce((count, player) => count + (player.attendance[date]?.includes('✅') ? 1 : 0), 0)), fill: false, borderColor: 'rgb(75, 192, 192)', tension: 0.1 }] }, options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } };
    const averageBarChartConfig = { type: 'bar', data: { labels: [...allPlayersData].sort((a, b) => b.average - a.average).map(p => p.name), datasets: [{ label: 'Média de Presença (%)', data: [...allPlayersData].sort((a, b) => b.average - a.average).map(p => p.average), backgroundColor: [...allPlayersData].sort((a, b) => b.average - a.average).map(p => p.average >= 75 ? '#22c55e' : p.average >= 50 ? '#3b82f6' : '#f59e0b') }] }, options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } } };
    const filterButtons = [{ key: 'desempenho', label: 'Desempenho' }, { key: 'all', label: 'Todos' }, { key: 'good', label: 'Melhores' }, { key: 'regular', label: 'Regulares' }, { key: 'bad', label: 'Abaixo' }, { key: 'faltas', label: 'Faltosos' }];
    const filterFunctions = { 'all': () => true, 'good': p => p.average >= 75, 'regular': p => p.average >= 50 && p.average < 75, 'bad': p => p.average < 50, 'faltas': p => p.unjustifiedAbsences > 0, 'desempenho': () => true };
    const sortedData = (filter === 'faltas') ? [...allPlayersData].sort((a, b) => b.unjustifiedAbsences - a.unjustifiedAbsences) : [...allPlayersData].sort((a, b) => b.average - a.average);
    const filteredData = (filter === 'desempenho') ? performanceData : sortedData.filter(filterFunctions[filter]);
    const selectedPlayerData = performanceData.find(p => p.name === selectedPerformancePlayer);


    const handleGenerateReport = () => {
        if (!monthRange.start || !monthRange.end) {
            alert("Por favor, selecione um período de meses.");
            return;
        }

        const [startYear, startMonth] = monthRange.start.split('-').map(Number);
        const [endYear, endMonth] = monthRange.end.split('-').map(Number);

        if (startYear > endYear || (startYear === endYear && startMonth > endMonth)) {
            alert("O mês de início não pode ser posterior ao mês de fim.");
            return;
        }

        const periodDates = dates.filter(d => {
            const [day, month, year] = d.split('/').map(Number);
            const date = new Date(year, month - 1, day);
            const startDate = new Date(startYear, startMonth - 1, 1);
            const endDate = new Date(endYear, endMonth, 0); // Last day of the end month
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

    return (
        <div className="space-y-8">
            <section className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">🏆 Quadro de Honra 🏆</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <h3 className="text-lg font-semibold text-orange-600 mb-2">On Fire 🔥</h3>
                        <p className="text-2xl font-bold">{hallOfFame.onFire?.name}</p>
                        <p className="text-xl text-orange-700 font-semibold">{hallOfFame.onFire?.average}%</p>
                    </div>
                    <div className="text-center p-4 bg-cyan-50 rounded-lg">
                        <h3 className="text-lg font-semibold text-cyan-600 mb-2">Mais Presente</h3>
                        <p className="text-2xl font-bold">{hallOfFame.mostPresent?.name}</p>
                        <p className="text-xl text-cyan-700 font-semibold">{hallOfFame.mostPresent?.presences} jogos</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-600 mb-2">100% no Mês ✅</h3>
                        {hallOfFame.monthlyPerfect.length > 0 ?
                            <p className="font-bold text-lg">{hallOfFame.monthlyPerfect.map(p => p.name).join(', ')}</p> :
                            <p className="text-gray-600">Ninguém.</p>
                        }
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                        <h3 className="text-lg font-semibold text-red-600 mb-2 text-center">Menos Presentes 📉</h3>
                        <ul className="text-left space-y-1 text-sm">
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
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Tendência de Presença por Jogo</h2>
                    <ChartComponent chartConfig={attendanceChartConfig} />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Comparativo de Médias (%)</h2>
                    <ChartComponent chartConfig={averageBarChartConfig} />
                </div>
            </section>

            <section className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Análise Geral de Presença</h2>
                        <p className="text-sm text-gray-500">Clique no nome de um jogador para ver os detalhes.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
                        {filterButtons.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`py-2 px-4 text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    filter === key
                                    ? 'bg-blue-600 text-white ring-blue-500'
                                    : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-5">
                    {filteredData.length === 0 ?
                        <p className="text-center text-gray-500">Nenhum jogador corresponde a este filtro.</p> :
                        
                        filter === 'desempenho' ? (
                            <div className="space-y-4">
                                <div className="mb-4">
                                    <label htmlFor="player-performance-select" className="block text-sm font-medium text-gray-700 mb-1">Selecione um Jogador:</label>
                                    <p className="text-xs text-gray-500 mt-1 mb-2">Referência: Ata de Reunião 06/01/2025 - Cláusula 4.</p>
                                    <select 
                                        id="player-performance-select"
                                        value={selectedPerformancePlayer} 
                                        onChange={(e) => setSelectedPerformancePlayer(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                    >
                                        {allPlayersData.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                    </select>
                                </div>
                                {selectedPlayerData && (
                                    <div className="p-4 border rounded-lg bg-gray-50">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-xl">{selectedPlayerData.name}</span>
                                            <span className={`font-semibold text-lg ${selectedPlayerData.performancePercentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>{selectedPlayerData.performancePercentage.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
                                            <div className={`h-4 rounded-full ${selectedPlayerData.performancePercentage >= 50 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${selectedPlayerData.performancePercentage}%` }}></div>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1 flex justify-between">
                                            <span>{selectedPlayerData.presencesInPeriod} de {selectedPlayerData.gamesInPeriod} jogos nos últimos 60 dias</span>
                                            <span>Status: <span className={`font-bold ${selectedPlayerData.performancePercentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>{selectedPlayerData.status}</span></span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={filter === 'all' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2' : 'space-y-4'}>
                                {filteredData.map(player => (
                                    <div key={player.name}>
                                        {filter === 'faltas' ? (
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <button onClick={() => setModalPlayer(player)} className="w-1/2 text-left truncate pr-2 font-medium text-blue-600 hover:text-blue-800 hover:underline">{player.name}</button>
                                                    <div className="w-1/2 text-right"><span className="font-semibold text-orange-600">{player.unjustifiedAbsences} falta(s)</span></div>
                                                </div>
                                                <div className="text-xs text-gray-500 pl-4 mt-1">
                                                    Datas: {player.unjustifiedAbsenceDates.join(', ')}
                                                </div>
                                            </div>
                                        ) : filter === 'all' ? (
                                            <div className="flex items-center justify-between border-b border-gray-100 py-1">
                                                <button onClick={() => setModalPlayer(player)} className="text-left truncate pr-2 font-medium text-blue-600 hover:text-blue-800 hover:underline">{player.name}</button>
                                                <span className="font-semibold text-gray-700">{player.average}%</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-4">
                                                <button onClick={() => setModalPlayer(player)} className="w-1/4 text-left truncate font-medium text-blue-600 hover:text-blue-800 hover:underline">{player.name}</button>
                                                <div className="w-2/4 bg-gray-200 rounded-full h-4">
                                                    <div
                                                        className={`h-4 rounded-full ${player.average >= 75 ? 'bg-green-500' : player.average >= 50 ? 'bg-blue-600' : 'bg-yellow-500'}`}
                                                        style={{ width: `${player.average}%` }}
                                                    ></div>
                                                </div>
                                                <span className="font-semibold w-1/4 text-right">{player.average}%</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </div>
            </section>

            <section className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Extrair Relatório por Período</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-4">
                    <div>
                        <label htmlFor="month-selector-start" className="block text-sm font-medium text-gray-700 mb-1">Mês de Início:</label>
                        <select id="month-selector-start" value={monthRange.start} onChange={e => setMonthRange({ ...monthRange, start: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                            {availableMonths.map(m => <option key={m} value={m}>{new Date(m + '-02').toLocaleString('pt-BR', {month: 'long', year: 'numeric'})}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="month-selector-end" className="block text-sm font-medium text-gray-700 mb-1">Mês de Fim:</label>
                        <select id="month-selector-end" value={monthRange.end} onChange={e => setMonthRange({ ...monthRange, end: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                            {availableMonths.map(m => <option key={m} value={m}>{new Date(m + '-02').toLocaleString('pt-BR', {month: 'long', year: 'numeric'})}</option>)}
                        </select>
                    </div>
                    <div><button onClick={handleGenerateReport} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700">Gerar Relatório</button></div>
                </div>
                {report && (
                    <div className="mt-6">
                        <h3 className="text-xl font-semibold mb-2">{report.title}</h3>
                        <ul className="list-disc list-inside mt-2 text-gray-700 space-y-1">
                            {report.data.map(p => <li key={p.name}><strong>{p.name}:</strong> {p.presences} presença(s)</li>)}
                        </ul>
                        <div className="mt-4 text-right">
                            <button onClick={() => setReport(null)} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600">Limpar Relatório</button>
                        </div>
                    </div>
                )}
            </section>

            <ModalComponent isOpen={!!modalPlayer} onClose={() => setModalPlayer(null)} title={modalPlayer?.name}>
                <div className="text-left">
                    <div className="mb-4 p-2 bg-gray-100 rounded-md text-center">
                        <strong>{modalPlayer?.presences}</strong> Presenças | <strong>{modalPlayer?.totalGames - modalPlayer?.presences}</strong> Ausências
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {dates.map(date => {
                            const status = modalPlayer?.attendance[date]?.trim() || '❌';
                            let colorClass = 'bg-gray-300';
                            if (status.includes('✅')) colorClass = 'bg-green-500';
                            else if (status.toUpperCase() === 'NÃO JUSTIFICOU') colorClass = 'bg-orange-500';
                            else if (status.includes('❌')) colorClass = 'bg-red-500';
                            return <div key={date} className={`w-5 h-5 border border-gray-400 ${colorClass}`} title={`${date}: ${status}`}></div>;
                        })}
                    </div>
                </div>
            </ModalComponent>
        </div>
    );
};

// Aba de Estatuto
const EstatutoTab = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Estatuto e Regras do CBA</h2>
        <div className="space-y-4">
            <AccordionItem title="Regulamento">
                <h3 className="font-bold">CBA – BASQUETE DOS APOSENTADOS</h3>
                <h4 className="font-bold">REGULAMENTO</h4>
                <p><strong>PRESIDENTE:</strong> NEILOR</p>
                <p><strong>COMPOSIÇÃO DIRETORIA:</strong> ARCANJO, GONZAGA, NEILOR, PORTUGAL, VINICIUS, MILHO</p>
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
            </AccordionItem>
            <AccordionItem title="Ata reunião 06/01/2025">
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
            </AccordionItem>
             <AccordionItem title="Ata reunião 02/04/2025">
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
            </AccordionItem>
             <AccordionItem title="Ata reunião 10/05/2025">
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
            </AccordionItem>
        </div>
    </div>
);

// Aba de Finanças
const FinancasTab = ({ financeData, isLoading, error, refreshData }) => {
    const [monthFilter, setMonthFilter] = useState('all');

    if (isLoading) return <Loader message="A carregar dados financeiros..." />;
    if (error) return <p className="text-center text-red-500 py-8">{error}</p>;
    if (!financeData) return <p className="text-center text-gray-500 py-8">Nenhum dado financeiro encontrado.</p>;

    const { revenues, expenses, paymentStatus, paymentHeaders, availableMonths, summary } = financeData;

    const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const getFilteredData = () => {
        if (summary) {
            return {
                filteredRevenues: [],
                filteredExpenses: [],
                totalRevenue: summary.revenue,
                totalExpense: summary.expense,
                totalBalance: summary.balance,
            };
        }
        const filteredRevenues = (monthFilter === 'all') ? revenues : revenues.filter(r => r.month === monthFilter);
        const filteredExpenses = (monthFilter === 'all') ? expenses : expenses.filter(e => e.month === monthFilter);

        const totalRevenue = filteredRevenues.reduce((sum, item) => sum + item.value, 0);
        const totalExpense = filteredExpenses.reduce((sum, item) => sum + item.value, 0);
        const totalBalance = totalRevenue - totalExpense;

        return { filteredRevenues, filteredExpenses, totalRevenue, totalExpense, totalBalance };
    };

    const { filteredRevenues, filteredExpenses, totalRevenue, totalExpense, totalBalance } = getFilteredData();

    const financeSummaryChartConfig = {
        type: 'bar',
        data: {
            labels: ['Receita', 'Despesa', 'Saldo'],
            datasets: [{
                label: 'Valores Totais (R$)',
                data: [totalRevenue, totalExpense, totalBalance],
                backgroundColor: ['#22c55e', '#ef4444', '#3b82f6'],
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { ticks: { callback: value => formatCurrency(value) } } }
        }
    };
    
    const financeBarChartConfig = summary ? null : {
        type: 'bar',
        data: {
            labels: availableMonths,
            datasets: [
                { label: 'Receita', data: availableMonths.map(month => revenues.filter(r => r.month === month).reduce((sum, r) => sum + r.value, 0)), backgroundColor: '#22c55e' },
                { label: 'Despesa', data: availableMonths.map(month => expenses.filter(e => e.month === month).reduce((sum, e) => sum + e.value, 0)), backgroundColor: '#ef4444' }
            ]
        },
        options: { scales: { y: { beginAtZero: true } } }
    };


    return (
        <div className="space-y-8">
            {!summary && (
                <section className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-center">
                        <h2 className="text-2xl font-bold mb-4 sm:mb-0 text-gray-800">Resumo Financeiro</h2>
                        <div>
                            <label htmlFor="month-filter" className="text-sm font-medium text-gray-700 mr-2">Filtrar por Mês:</label>
                            <select id="month-filter" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm">
                                <option value="all">Todos os Meses</option>
                                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                </section>
            )}

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500 text-center"><h2 className="text-xl font-semibold text-gray-500 mb-2">✅ Receita</h2><p className="text-3xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p></div>
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500 text-center"><h2 className="text-xl font-semibold text-gray-500 mb-2">❌ Despesa</h2><p className="text-3xl font-bold text-red-600">{formatCurrency(totalExpense)}</p></div>
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500 text-center"><h2 className="text-xl font-semibold text-gray-500 mb-2">💰 Saldo</h2><p className="text-3xl font-bold text-blue-600">{formatCurrency(totalBalance)}</p></div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Comparativo de Totais</h2>
                    <ChartComponent chartConfig={financeSummaryChartConfig} />
                </section>
                {!summary && financeBarChartConfig && (
                    <section className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Gráfico: Receita vs. Despesa (Mensal)</h2>
                        <ChartComponent chartConfig={financeBarChartConfig} />
                    </section>
                )}
            </div>

            {!summary && (
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">Detalhes de Receitas</h2>
                        <div className="max-h-96 overflow-y-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 sticky top-0"><tr><th className="px-4 py-2">Data</th><th className="px-4 py-2">Descrição</th><th className="px-4 py-2 text-right">Valor</th></tr></thead>
                            <tbody>
                                {filteredRevenues.map((r, i) => <tr key={i}><td className="px-4 py-2">{r.date.toLocaleDateString('pt-BR')}</td><td className="px-4 py-2">{r.description}</td><td className="px-4 py-2 text-right">{formatCurrency(r.value)}</td></tr>)}
                            </tbody>
                        </table></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">Detalhes de Despesas</h2>
                        <div className="max-h-96 overflow-y-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 sticky top-0"><tr><th className="px-4 py-2">Data</th><th className="px-4 py-2">Descrição</th><th className="px-4 py-2 text-right">Valor</th></tr></thead>
                            <tbody>
                                {filteredExpenses.map((e, i) => <tr key={i}><td className="px-4 py-2">{e.date.toLocaleDateString('pt-BR')}</td><td className="px-4 py-2">{e.description}</td><td className="px-4 py-2 text-right">{formatCurrency(e.value)}</td></tr>)}
                            </tbody>
                        </table></div>
                    </div>
                </section>
            )}
            {paymentStatus.length > 0 && (
                 <section className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">Controlo de Mensalidades</h2>
                    <div className="max-h-96 overflow-y-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 sticky top-0"><tr><th className="px-4 py-2">Jogador</th>{paymentHeaders.map(h => <th key={h} className="px-4 py-2 text-center">{h}</th>)}</tr></thead>
                        <tbody>
                            {paymentStatus.map(p => <tr key={p.player}><td className="px-4 py-2 font-semibold">{p.player}</td>{paymentHeaders.map(h => <td key={h} className="px-4 py-2 text-center">{p.statuses[h] === 'OK' ? '✅' : (p.statuses[h] ? '❌' : '')}</td>)}</tr>)}
                        </tbody>
                    </table></div>
                </section>
            )}
        </div>
    );
};

// Aba de Sorteio (VERSÃO CORRIGIDA E FINAL)
const SorteioTab = ({ allPlayersData, scriptUrl, ModalComponent }) => {
    // --- STATE ---
    const [confirmedPlayers, setConfirmedPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(allPlayersData[0]?.name || '');
    const [teams, setTeams] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Para o carregamento inicial da lista
    const [isSubmitting, setIsSubmitting] = useState(false); // Para ações de POST (confirmar, resetar)
    const [error, setError] = useState(null);

    // State para os modais
    const [modalContent, setModalContent] = useState(null); // Para alertas: { title, body }
    const [resetConfirmModalOpen, setResetConfirmModalOpen] = useState(false);

    // --- BUSCA DE DADOS ---
    const fetchConfirmations = useCallback(() => {
        setIsLoading(true);
        setError(null);
        const url = `${scriptUrl}?action=getConfirmations&cacheBust=${new Date().getTime()}`;
        return fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`Erro ao buscar dados: ${res.statusText}`);
                return res.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    setConfirmedPlayers(data.players || []);
                } else {
                    throw new Error(data.message || 'Falha ao buscar confirmações da planilha.');
                }
            })
            .catch((err) => {
                setError(err.message);
                setConfirmedPlayers([]);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [scriptUrl]);

    useEffect(() => {
        if (allPlayersData.length > 0) {
            fetchConfirmations();
        } else {
            setIsLoading(false);
        }
    }, [allPlayersData, fetchConfirmations]);

    // --- AÇÕES (ENVIAR DADOS - POST) ---
    const postData = (payload) => {
        setIsSubmitting(true);
        setError(null);
        return fetch(scriptUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(payload).toString(),
        })
        .then(res => {
            if (!res.ok) {
                throw new Error(`Erro de rede: ${res.status} - ${res.statusText}`);
            }
            return res.json().catch(() => {
                // Se a resposta não for JSON, mas a requisição foi OK, assumimos sucesso.
                // Isso lida com redirecionamentos do Google Apps Script.
                return { status: 'success' };
            });
        })
        .then(data => {
            if (data.status === 'error') {
                throw new Error(data.message);
            }
            return data;
        })
        .finally(() => {
            setIsSubmitting(false);
        });
    };

    // --- HANDLERS DE EVENTOS ---
    const handleConfirm = () => {
        if (!selectedPlayer) {
            setModalContent({ title: 'Atenção', body: 'Por favor, selecione um jogador.' });
            return;
        }
        if (confirmedPlayers.includes(selectedPlayer)) {
            setModalContent({ title: 'Atenção', body: `${selectedPlayer} já confirmou a presença.` });
            return;
        }

        const oldPlayers = confirmedPlayers;
        setConfirmedPlayers(prev => [...prev, selectedPlayer]); // Atualização Otimista

        postData({ action: 'confirmPlayer', player: selectedPlayer })
            .catch(err => {
                setConfirmedPlayers(oldPlayers); // Reverte em caso de erro
                setModalContent({ title: 'Erro ao Confirmar', body: err.message });
            });
    };

    const handleResetRequest = () => {
        const oldPlayers = confirmedPlayers;
        setConfirmedPlayers([]); // Atualização Otimista
        setTeams(null);

        postData({ action: 'resetConfirmations' })
            .catch(err => {
                setConfirmedPlayers(oldPlayers); // Reverte em caso de erro
                setModalContent({ title: 'Erro ao Reiniciar', body: err.message });
            });
    };
    
    const handleReset = () => {
        setResetConfirmModalOpen(true);
    };

    const handleSort = () => {
        const playersToSort = [...confirmedPlayers].slice(0, 10);
        for (let i = playersToSort.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playersToSort[i], playersToSort[j]] = [playersToSort[j], playersToSort[i]];
        }
        setTeams({
            a: playersToSort.slice(0, 5),
            b: playersToSort.slice(5, 10)
        });
    };

    // --- RENDERIZAÇÃO ---
    if (isLoading && confirmedPlayers.length === 0) return <Loader message="A carregar lista de confirmações..." />;

    return (
        <div className="space-y-8">
            <ModalComponent
                isOpen={!!modalContent}
                onClose={() => setModalContent(null)}
                title={modalContent?.title || ''}
            >
                <p>{modalContent?.body}</p>
                <div className="text-right mt-4">
                    <button onClick={() => setModalContent(null)} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">
                        OK
                    </button>
                </div>
            </ModalComponent>

            <ModalComponent
                isOpen={resetConfirmModalOpen}
                onClose={() => setResetConfirmModalOpen(false)}
                title="Confirmar Ação"
            >
                <p>Tem a certeza que quer limpar a lista de confirmações? Esta ação não pode ser desfeita.</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setResetConfirmModalOpen(false)} className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400">
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            setResetConfirmModalOpen(false);
                            handleResetRequest();
                        }}
                        className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Aguarde...' : 'Limpar Lista'}
                    </button>
                </div>
            </ModalComponent>

            <section className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Confirmação de Presença</h2>
                {error && <p className="text-red-500 mb-4 bg-red-100 p-3 rounded-md"><strong>Erro:</strong> {error}</p>}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} className="w-full sm:w-1/2 p-2 border border-gray-300 rounded-md shadow-sm">
                        {allPlayersData.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                    <button onClick={handleConfirm} disabled={isSubmitting || !selectedPlayer} className="w-full sm:w-auto bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {isSubmitting ? 'A confirmar...' : 'Confirmar Presença'}
                    </button>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">✅ Lista de Confirmados ({confirmedPlayers.length})</h2>
                    <div className="space-y-2">
                         <ol className="list-decimal list-inside space-y-2">
                            {confirmedPlayers.slice(0, 10).map((player, index) => (
                                <li key={index} className="font-semibold text-green-700">{player}</li>
                            ))}
                        </ol>
                        {confirmedPlayers.length > 10 && (
                            <>
                                <hr className="my-2 border-gray-300" />
                                <p className="text-sm font-medium text-gray-600 mt-2 mb-1">Lista de Espera:</p>
                                <ol className="list-decimal list-inside space-y-2" start="11">
                                    {confirmedPlayers.slice(10).map((player, index) => (
                                        <li key={index} className="text-gray-600">{player}</li>
                                    ))}
                                </ol>
                            </>
                        )}
                        {confirmedPlayers.length === 0 && !isLoading && (
                            <p className="text-center text-gray-500 py-4">Nenhum jogador confirmado ainda.</p>
                        )}
                    </div>
                </section>
                <section className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">Equipes</h2>
                        <button onClick={handleReset} className="text-sm font-semibold text-red-600 hover:underline mt-2 sm:mt-0" disabled={isSubmitting}>Resetar Lista</button>
                    </div>
                    <button onClick={handleSort} disabled={confirmedPlayers.length < 10 || isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        Sortear os 10 Primeiros
                    </button>
                    {teams && (
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-xl font-semibold text-center mb-2 p-2 bg-yellow-400 text-black rounded-md">Time A</h3>
                                <ul className="space-y-1 text-center">{teams.a.map(p => <li key={p}>{p}</li>)}</ul>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-center mb-2 p-2 bg-blue-800 text-white rounded-md">Time B</h3>
                                <ul className="space-y-1 text-center">{teams.b.map(p => <li key={p}>{p}</li>)}</ul>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

// --- ABA DE EVENTOS COM MODAIS FUNCIONAIS ---
const EventosTab = ({ scriptUrl, allPlayers, ModalComponent }) => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(null);
    const [eventToDelete, setEventToDelete] = useState(null);

    const fetchEvents = useCallback(() => {
        setIsLoading(true);
        setError(null);
        const url = `${scriptUrl}?action=getAllEvents&cacheBust=${new Date().getTime()}`;
        fetch(url)
            .then(res => res.ok ? res.json() : Promise.reject(`Erro ao buscar eventos: ${res.statusText}`))
            .then(data => {
                if (data.status === 'success') {
                    setEvents(data.events || []);
                } else {
                    throw new Error(data.message || 'Falha ao carregar eventos.');
                }
            })
            .catch(err => setError(err.message))
            .finally(() => setIsLoading(false));
    }, [scriptUrl]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        if (!isDetailsModalOpen || !currentEvent) return;
        const updatedEvent = events.find(e => e.name === currentEvent.name);
        if (updatedEvent && JSON.stringify(updatedEvent) !== JSON.stringify(currentEvent)) {
            setCurrentEvent(updatedEvent);
        } else if (!updatedEvent) {
            setIsDetailsModalOpen(false);
        }
    }, [events, isDetailsModalOpen, currentEvent]);


    const postEventData = (payload) => {
        setIsSubmitting(true);
        return fetch(scriptUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(payload).toString() })
            .then(res => res.ok ? res.json() : Promise.reject(`Erro de rede: ${res.status} - ${res.statusText}`))
            .then(data => {
                if (data.status === 'error') throw new Error(data.message);
                return data;
            })
            .catch(err => {
                if (err instanceof SyntaxError) return { status: 'success' };
                throw err;
            })
            .finally(() => setIsSubmitting(false));
    };

    const handleSaveEvent = (eventData) => {
        postEventData({ action: 'createOrUpdateEvent', ...eventData })
            .then(() => { setIsEventModalOpen(false); fetchEvents(); })
            .catch(err => alert(`Erro ao salvar evento: ${err.message}`));
    };

    const handleDeleteEvent = (eventName) => {
        postEventData({ action: 'deleteEvent', eventName })
            .then(() => { setEventToDelete(null); fetchEvents(); })
            .catch(err => alert(`Erro ao apagar evento: ${err.message}`));
    };

    const handleConfirmPlayer = (eventName, playerName) => {
        const originalEvents = [...events];
        const updatedEvents = events.map(event => {
            if (event.name === eventName) {
                return { ...event, players: [...event.players, playerName] };
            }
            return event;
        });
        setEvents(updatedEvents);

        postEventData({ action: 'confirmEventPlayer', eventName, playerName })
            .catch(err => {
                setEvents(originalEvents);
                alert(`Erro ao confirmar presença: ${err.message}`);
            });
    };
    
    const handleRemovePlayer = (eventName, playerName) => {
        const originalEvents = [...events];
        const updatedEvents = events.map(event => {
            if (event.name === eventName) {
                return { ...event, players: event.players.filter(p => p !== playerName) };
            }
            return event;
        });
        setEvents(updatedEvents);

        postEventData({ action: 'removeEventPlayer', eventName, playerName })
            .catch(err => {
                setEvents(originalEvents);
                alert(`Erro ao remover presença: ${err.message}`);
            });
    };

    if (isLoading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );
    if (error) return <p className="text-center text-red-500 py-8">{error}</p>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Próximos Eventos</h2>
                <button onClick={() => { setCurrentEvent(null); setIsEventModalOpen(true); }} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 shadow-md transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    + Criar Evento
                </button>
            </div>

            {events.length === 0 && <p className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">Nenhum evento encontrado. Clique em "Criar Evento" para começar.</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => (
                    <div key={event.name} className={`bg-white rounded-xl shadow-lg overflow-hidden transition-transform transform hover:-translate-y-1 ${event.status === 'Fechado' ? 'opacity-60' : ''}`}>
                        <div className="p-5">
                            <h3 className="text-xl font-bold text-gray-900 truncate">{event.name}</h3>
                            <p className="text-sm text-gray-500 mb-3">{event.date}</p>
                            <p className="text-gray-600 mb-4 h-16 overflow-hidden text-ellipsis">{event.description}</p>
                            <div className="border-t pt-4 mt-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Valor/Pessoa:</span>
                                    <span className="font-semibold text-gray-800">{parseFloat(event.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Arrecadado:</span>
                                    <span className="font-bold text-lg text-green-600">{(event.players.length * parseFloat(event.value)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-5 py-3 flex justify-between items-center">
                             <span className={`px-3 py-1 text-xs font-semibold rounded-full ${event.status === 'Aberto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{event.status}</span>
                             <div className="flex gap-3">
                                <button onClick={() => { setCurrentEvent(event); setIsDetailsModalOpen(true); }} className="text-sm font-semibold text-blue-600 hover:underline">Detalhes</button>
                                <button onClick={() => { setCurrentEvent(event); setIsEventModalOpen(true); }} className="text-sm font-semibold text-gray-600 hover:underline">Editar</button>
                                <button onClick={() => setEventToDelete(event)} className="text-sm font-semibold text-red-600 hover:underline">Apagar</button>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {isEventModalOpen && 
                <EventFormModal 
                    isOpen={isEventModalOpen} 
                    onClose={() => setIsEventModalOpen(false)}
                    onSave={handleSaveEvent}
                    event={currentEvent}
                    isSubmitting={isSubmitting}
                    ModalComponent={Modal}
                />
            }
            {isDetailsModalOpen &&
                <EventDetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    event={currentEvent}
                    allPlayers={allPlayers}
                    onConfirmPlayer={handleConfirmPlayer}
                    onRemovePlayer={handleRemovePlayer}
                    isSubmitting={isSubmitting}
                    ModalComponent={Modal}
                />
            }
            {eventToDelete &&
                <Modal isOpen={!!eventToDelete} onClose={() => setEventToDelete(null)} title="Confirmar Exclusão">
                    <p>Tem a certeza que quer apagar o evento "<strong>{eventToDelete.name}</strong>"? Esta ação não pode ser desfeita.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setEventToDelete(null)} className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400">Cancelar</button>
                        <button onClick={() => handleDeleteEvent(eventToDelete.name)} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700" disabled={isSubmitting}>
                            {isSubmitting ? 'A apagar...' : 'Apagar Evento'}
                        </button>
                    </div>
                </Modal>
            }
        </div>
    );
};

// --- MODAIS PARA EVENTOS ---

const EventFormModal = ({ isOpen, onClose, onSave, event, isSubmitting, ModalComponent }) => {
    const [formData, setFormData] = useState({
        eventName: event?.name || '',
        eventDate: event?.date ? new Date(event.date.split('/').reverse().join('-')).toISOString().split('T')[0] : '',
        eventDescription: event?.description || '',
        eventValue: event?.value || 0
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, originalEventName: event?.name });
    };

    return (
        <ModalComponent isOpen={isOpen} onClose={onClose} title={event ? "Editar Evento" : "Criar Novo Evento"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="eventName" className="block text-sm font-medium text-gray-700">Nome do Evento</label>
                    <input type="text" name="eventName" id="eventName" value={formData.eventName} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                    <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700">Data</label>
                    <input type="date" name="eventDate" id="eventDate" value={formData.eventDate} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                    <label htmlFor="eventDescription" className="block text-sm font-medium text-gray-700">Descrição</label>
                    <textarea name="eventDescription" id="eventDescription" value={formData.eventDescription} onChange={handleChange} rows="3" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
                </div>
                <div>
                    <label htmlFor="eventValue" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                    <input type="number" name="eventValue" id="eventValue" value={formData.eventValue} onChange={handleChange} step="0.01" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
                    <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors" disabled={isSubmitting}>
                        {isSubmitting ? 'A guardar...' : 'Guardar Evento'}
                    </button>
                </div>
            </form>
        </ModalComponent>
    );
};

const EventDetailsModal = ({ isOpen, onClose, event, allPlayers, onConfirmPlayer, onRemovePlayer, isSubmitting, ModalComponent }) => {
    const [selectedPlayer, setSelectedPlayer] = useState('');

    const unconfirmedPlayers = allPlayers.filter(p => !event.players.includes(p.name));

    useEffect(() => {
        if (unconfirmedPlayers.length > 0) {
            setSelectedPlayer(unconfirmedPlayers[0].name);
        } else {
            setSelectedPlayer('');
        }
    }, [event.players, allPlayers]);


    return (
        <ModalComponent isOpen={isOpen} onClose={onClose} title={`Detalhes: ${event.name}`}>
            <div>
                <p><strong>Data:</strong> {event.date}</p>
                <p><strong>Valor:</strong> {parseFloat(event.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <p className="my-2"><strong>Descrição:</strong> {event.description}</p>
                <hr className="my-4"/>
                <h4 className="text-lg font-semibold mb-2">Confirmar Presença</h4>
                <div className="flex gap-2">
                    <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} className="flex-grow p-2 border border-gray-300 rounded-md">
                        {unconfirmedPlayers.length > 0 ? 
                            unconfirmedPlayers.map(p => <option key={p.name} value={p.name}>{p.name}</option>) :
                            <option>Ninguém para confirmar</option>
                        }
                    </select>
                    <button onClick={() => onConfirmPlayer(event.name, selectedPlayer)} disabled={isSubmitting || unconfirmedPlayers.length === 0} className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400">Confirmar</button>
                </div>
                <hr className="my-4"/>
                <h4 className="text-lg font-semibold mb-2">Jogadores Confirmados ({event.players.length})</h4>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {event.players.map(player => (
                        <li key={player} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                            <span>{player}</span>
                            <button onClick={() => onRemovePlayer(event.name, player)} className="text-red-500 text-xs hover:underline">Remover</button>
                        </li>
                    ))}
                    {event.players.length === 0 && <p className="text-gray-500">Nenhum jogador confirmado.</p>}
                </ul>
            </div>
        </ModalComponent>
    );
};


// --- COMPONENTE PRINCIPAL ---
export default function App() {
    const [librariesLoaded, setLibrariesLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState('presenca');
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [attendanceData, setAttendanceData] = useState({ isLoading: true, data: null, error: null });
    const [financeData, setFinanceData] = useState({ isLoading: true, data: null, error: null });
    
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0JdnbctEkcHae8hJoma0-ExjNiGBfJP5otA9BD32x-J3K7iE3ACjxPUvFHubKGaEZpg/exec";

    const fetchAttendanceData = useCallback(async () => {
        const ATTENDANCE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vToVgb2bcwJcd-MAfIjYDK-B13qFQcNt1g6O5GKgCVyvlJbqrUi_9ZtXfrmlYZi1A/pub?output=csv';
        setAttendanceData(prev => ({ ...prev, isLoading: true }));
        try {
            if (!window.Papa) {
                throw new Error("A biblioteca de análise (PapaParse) não foi carregada.");
            }
            const results = await new Promise((resolve, reject) => {
                window.Papa.parse(ATTENDANCE_SHEET_URL, {
                    download: true,
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: h => h.trim().replace(/^\uFEFF/, ''),
                    complete: resolve,
                    error: reject
                });
            });

            if (results.errors.length > 0) throw new Error(results.errors.map(e => e.message).join(', '));
            if (!results.data || results.data.length === 0) throw new Error('A planilha de presença parece estar vazia.');
            
            const headers = results.meta.fields;
            const playerNameField = headers[0];
            const allDates = headers.slice(1).filter(h => h && h.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/));
            allDates.sort((a, b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
            
            const processedData = results.data
                .map(row => {
                    const name = row[playerNameField]?.trim();
                    if (!name) return null;
                    const attendance = {};
                    let presences = 0;
                    let unjustifiedAbsences = 0;
                    let unjustifiedAbsenceDates = [];
                    let relevantGames = 0;
                    allDates.forEach(date => {
                        const status = row[date]?.trim() || '';
                        if (status) {
                            relevantGames++;
                            if (status.includes('✅')) presences++;
                            else if (status.toUpperCase() === 'NÃO JUSTIFICOU') {
                                unjustifiedAbsences++;
                                unjustifiedAbsenceDates.push(date);
                            }
                        }
                        attendance[date] = status;
                    });
                    const average = relevantGames > 0 ? parseFloat(((presences / relevantGames) * 100).toFixed(1)) : 0;
                    return { name, presences, totalGames: relevantGames, average, unjustifiedAbsences, unjustifiedAbsenceDates, attendance };
                })
                .filter(Boolean);

            if (processedData.length === 0) throw new Error("Nenhum dado de jogador válido foi encontrado.");
            setAttendanceData({ isLoading: false, data: { players: processedData, dates: allDates }, error: null });
            setLastUpdated(new Date());
        } catch (error) {
            setAttendanceData({ isLoading: false, data: null, error: `Erro ao carregar dados de presença: ${error.message}` });
        }
    }, []);

    const fetchFinanceData = useCallback(async () => {
        const FINANCE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0fIELkR4lk2apHxZ9JbhTUUI8M4ICKGCEe3ntox5zyYsaccFftSx4mFyne5xpzA/pub?output=csv';
        setFinanceData({ isLoading: true, data: null, error: null });
        try {
            if (!window.Papa) {
                throw new Error("A biblioteca de análise (PapaParse) não foi carregada.");
            }
            const results = await new Promise((resolve, reject) => {
                window.Papa.parse(FINANCE_SHEET_URL, {
                    download: true,
                    header: false,
                    skipEmptyLines: true,
                    complete: resolve,
                    error: reject
                });
            });
            
            if (results.errors.length > 0) throw new Error(results.errors.map(e => e.message).join(', '));
            if (!results.data || results.data.length === 0) throw new Error('A planilha de finanças parece estar vazia.');

            const data = results.data;
            let revenues = [], expenses = [], paymentStatus = [];
            let availableMonths = new Set();
            const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            let currentSection = null, isPaymentSection = false, paymentHeaders = [];

            const parseCurrency = (value) => {
                if (typeof value === 'number') return value;
                if (typeof value !== 'string' || !value) return 0;
                const cleanStr = value.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
                return parseFloat(cleanStr) || 0;
            };
            
            data.forEach(row => {
                const firstCell = row[0]?.toUpperCase() || '';
                if (firstCell.includes('RECEITAS')) { currentSection = 'revenue'; isPaymentSection = false; return; }
                if (firstCell.includes('DESPESAS')) { currentSection = 'expense'; isPaymentSection = false; return; }
                if (firstCell.includes('JOGADOR')) { currentSection = 'payment'; isPaymentSection = true; paymentHeaders = row.slice(1).filter(h => h); return; }

                if (isPaymentSection && row[0]) {
                    const playerPayment = { player: row[0], statuses: {} };
                    paymentHeaders.forEach((month, index) => { playerPayment.statuses[month] = row[index + 1] || ''; });
                    paymentStatus.push(playerPayment);
                    return;
                }

                const dateParts = row[0]?.split('/');
                const date = dateParts?.length === 3 ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0]) : null;
                const description = row[1];
                const valueStr = row[2];

                if (date && description && valueStr) {
                    const value = parseCurrency(valueStr);
                    const monthName = monthNames[date.getMonth()];
                    const entry = { date, description, value, month: monthName };
                    if (currentSection === 'revenue') revenues.push(entry);
                    else if (currentSection === 'expense') expenses.push(entry);
                    availableMonths.add(monthName);
                }
            });

            const hasDetailedTransactions = revenues.length > 0 || expenses.length > 0;
            if (!hasDetailedTransactions) {
                 const revenueCell = data[38]?.[15] || 'R$ 0,00';
                 const expenseCell = data[54]?.[15] || 'R$ 0,00';
                 const balanceCell = data[56]?.[15] || 'R$ 0,00';
                 setFinanceData({ isLoading: false, data: { summary: { revenue: parseCurrency(revenueCell), expense: parseCurrency(expenseCell), balance: parseCurrency(balanceCell) }, paymentStatus, paymentHeaders }, error: null });
            } else {
                setFinanceData({ isLoading: false, data: { revenues, expenses, paymentStatus, paymentHeaders, availableMonths: [...availableMonths].sort((a,b) => monthNames.indexOf(a) - monthNames.indexOf(b)) }, error: null });
            }
            setLastUpdated(new Date());
        } catch (error) {
            setFinanceData({ isLoading: false, data: null, error: `Erro ao carregar dados financeiros: ${error.message}` });
        }
    }, []);

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

    useEffect(() => {
        if (!librariesLoaded) return;
        fetchAttendanceData();
    }, [librariesLoaded, fetchAttendanceData]);

    const handleTabClick = (tab) => {
        setActiveTab(tab);
        if (tab === 'financas' && !financeData.data && !financeData.error && librariesLoaded) {
            fetchFinanceData();
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'presenca':
                return <PresencaTab allPlayersData={attendanceData.data?.players || []} dates={attendanceData.data?.dates || []} isLoading={attendanceData.isLoading} error={attendanceData.error} ModalComponent={Modal} />;
            case 'estatuto':
                return <EstatutoTab />;
            case 'financas':
                return <FinancasTab financeData={financeData.data} isLoading={financeData.isLoading} error={financeData.error} />;
            case 'sorteio':
                 return <SorteioTab allPlayersData={attendanceData.data?.players || []} scriptUrl={SCRIPT_URL} ModalComponent={Modal} />;
            case 'eventos':
                return <EventosTab scriptUrl={SCRIPT_URL} allPlayers={attendanceData.data?.players || []} ModalComponent={Modal} />;
            default:
                return null;
        }
    };

    if (!librariesLoaded) return <Loader message="Carregando bibliotecas essenciais..." />;

    const TABS = ['presenca', 'estatuto', 'financas', 'sorteio', 'eventos'];
    const TAB_ICONS = {
        presenca: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        estatuto: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        financas: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        sorteio: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0 1.172 1.953 1.172 5.119 0 7.072z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>,
        eventos: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    };

    return (
        <div className="bg-gray-100 text-gray-800 font-sans min-h-screen">
            <div className="container mx-auto p-4 md:p-8">
                <header className="mb-8 flex flex-col items-center text-center space-y-2">
                    <img src="https://i.ibb.co/pGnycLc/ICONE-CBA.jpg" alt="Logo CBA" className="h-24 w-24 rounded-full shadow-lg" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/96x96/1e3a8a/ffffff?text=CBA'; }} />
                    <div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">CBA - Basquete dos Aposentados</h1>
                        <p className="text-gray-500 mt-1">O seu portal completo para eventos, finanças e estatísticas do time.</p>
                    </div>
                </header>

                <div className="mb-6">
                    <nav className="flex space-x-1 sm:space-x-2 p-1 bg-gray-200 rounded-lg">
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => handleTabClick(tab)}
                                className={`w-full py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-medium rounded-md transition-colors duration-300 flex items-center justify-center ${activeTab === tab ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-300 hover:text-gray-800'}`}
                            >
                                {TAB_ICONS[tab]}
                                <span className="hidden sm:inline">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div id="tab-content">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
}
