import React, { useState, useEffect } from 'react';
import { getStocks, addStock, deleteStock, getAnalysis, toggleWatchStock } from '../services/api';
import StockChart from './StockChart';
import MarketIntelligence from './MarketIntelligence';
import ElderAnalysis from './ElderAnalysis';
import { Plus, Trash2, TrendingUp, Activity, Brain, LineChart, Star } from 'lucide-react';

const Dashboard = () => {
    const [stocks, setStocks] = useState([]);
    const [selectedSymbol, setSelectedSymbol] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [regimeData, setRegimeData] = useState(null);
    const [srLevels, setSrLevels] = useState([]);
    const [elderTactics, setElderTactics] = useState(null);
    const [macdDivergence, setMacdDivergence] = useState(null);
    const [f13Divergence, setF13Divergence] = useState(null);
    const [newSymbol, setNewSymbol] = useState('');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('weekly'); // 'weekly', 'elder' (daily), or 'intelligence'

    useEffect(() => {
        loadStocks();
    }, []);

    useEffect(() => {
        if (selectedSymbol) {
            loadAnalysis(selectedSymbol);
        }
    }, [selectedSymbol, view]);

    const loadStocks = async () => {
        try {
            const res = await getStocks();
            setStocks(res.data);
            if (res.data.length > 0 && !selectedSymbol) {
                setSelectedSymbol(res.data[0].symbol);
            }
        } catch (err) {
            console.error("Failed to load stocks", err);
        }
    };

    const loadAnalysis = async (symbol) => {
        setLoading(true);
        try {
            // Fix: pass period as first arg, interval as second
            const period = view === 'weekly' ? '2y' : '1y';
            const interval = view === 'weekly' ? '1wk' : '1d';

            const res = await getAnalysis(symbol, period, interval);
            setChartData(res.data.data);
            setRegimeData({
                regime: res.data.regime,
                reason: res.data.regime_reason,
                volatility: res.data.volatility,
                confidence: res.data.confidence,
                confluence: res.data.confluence_factor,
                confluence_details: res.data.confluence_details,
                macro: res.data.macro_status,
                relative_strength: res.data.relative_strength,
                macro_tides: res.data.macro_tides,
                suggestion: res.data.strategic_suggestion,
                decision: res.data.decision,
                sector_analysis: res.data.sector_analysis
            });
            setSrLevels(res.data.sr_levels || []);
            setElderTactics(res.data.elder_tactics || null);
            setMacdDivergence(res.data.macd_divergence || null);
            setF13Divergence(res.data.f13_divergence || null);
        } catch (err) {
            console.error("Failed to load analysis", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStock = async (e) => {
        e.preventDefault();
        if (!newSymbol) return;
        try {
            await addStock(newSymbol.toUpperCase());
            setNewSymbol('');
            loadStocks();
        } catch (err) {
            alert('Failed to add stock');
        }
    };

    const handleDeleteStock = async (symbol, e) => {
        e.stopPropagation();
        if (confirm(`Delete ${symbol}?`)) {
            try {
                await deleteStock(symbol);
                if (selectedSymbol === symbol) setSelectedSymbol(null);
                loadStocks();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleToggleWatch = async (symbol, e) => {
        e.stopPropagation();
        try {
            await toggleWatchStock(symbol);
            // Optimistic update or refresh
            loadStocks();
        } catch (err) {
            console.error("Failed to toggle watch status", err);
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            {/* Sidebar */}
            <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-700 font-bold text-xl flex items-center gap-2">
                    <TrendingUp className="text-green-500" />
                    StockAI
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            // Simple visual feedback could be improved but scanning is async
                            try {
                                await scanStocks();
                                loadStocks(); // Refresh logic
                            } catch (err) {
                                console.error("Scan failed", err);
                            }
                        }}
                        className="ml-auto text-xs bg-gray-700 hover:bg-purple-600 text-gray-300 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition-all"
                        title="Scan Watchlist for Recent Divergences"
                    >
                        <Zap size={12} />
                        SCAN
                    </button>
                </div>

                {/* Add Stock */}
                <form onSubmit={handleAddStock} className="p-4 border-b border-gray-700">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="bg-gray-700 text-white px-2 py-1 rounded w-full border border-gray-600 focus:border-blue-500 outline-none"
                            placeholder="Symbol..."
                            value={newSymbol}
                            onChange={(e) => setNewSymbol(e.target.value)}
                        />
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 p-1 rounded">
                            <Plus size={20} />
                        </button>
                    </div>
                </form>


                {/* Stock List */}
                <div className="flex-1 overflow-y-auto">
                    {stocks.map((stock) => (
                        <div
                            key={stock.symbol}
                            className={`p-3 flex justify-between items-center cursor-pointer hover:bg-gray-700 transition ${selectedSymbol === stock.symbol ? 'bg-gray-700 border-l-4 border-blue-500' : ''}`}
                            onClick={() => setSelectedSymbol(stock.symbol)}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${stock.impulse === 'green' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                                        stock.impulse === 'red' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                                            'bg-blue-500'
                                        }`}></div>
                                    <div className="font-bold">{stock.symbol}</div>
                                    {/* Divergence Icon */}
                                    {stock.divergence_status && (
                                        <div className={`ml-2 p-0.5 rounded-full ${stock.divergence_status.includes('bearish') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
                                            title={`${stock.divergence_status.replace('_', ' ').toUpperCase()} Divergence Detected`}
                                        >
                                            <Zap size={12} fill="currentColor" />
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-gray-400 truncate w-32">{stock.name || '-'}</div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => handleToggleWatch(stock.symbol, e)}
                                    className={`p-1.5 hover:bg-gray-600 rounded-lg transition-colors ${stock.is_watched ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
                                >
                                    <Star size={16} fill={stock.is_watched ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteStock(stock.symbol, e)}
                                    className="text-gray-500 hover:text-red-500 p-1"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-6 justify-between">
                    <div className="text-xl font-semibold">
                        {selectedSymbol ? `${selectedSymbol} Analysis` : 'Dashboard'}
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setView('weekly')}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md transition ${view === 'weekly' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                        >
                            <LineChart size={18} />
                            Elder Weekly
                        </button>
                        <button
                            onClick={() => setView('elder')}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md transition ${view === 'elder' ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                        >
                            <TrendingUp size={18} />
                            Elder Daily
                        </button>
                        <button
                            onClick={() => setView('intelligence')}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md transition ${view === 'intelligence' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                        >
                            <Brain size={18} />
                            Intelligence
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto bg-gray-900">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <Activity className="animate-spin mr-2" /> Loading...
                        </div>
                    ) : view === 'intelligence' ? (
                        <MarketIntelligence regimeData={regimeData} />
                    ) : view === 'elder' ? (
                        <ElderAnalysis data={chartData} symbol={selectedSymbol} srLevels={srLevels} tacticalAdvice={elderTactics} macdDivergence={macdDivergence} f13Divergence={f13Divergence} timeframeLabel="Daily" />
                    ) : view === 'weekly' ? (
                        <ElderAnalysis data={chartData} symbol={selectedSymbol} srLevels={srLevels} tacticalAdvice={elderTactics} macdDivergence={macdDivergence} f13Divergence={f13Divergence} timeframeLabel="Weekly" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Select a stock to view analysis
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default Dashboard;
