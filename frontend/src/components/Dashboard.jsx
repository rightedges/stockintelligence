import React, { useState, useEffect } from 'react';
import { getStocks, addStock, deleteStock, getAnalysis, toggleWatchStock, scanStocks, scanStocksEFI } from '../services/api';
import StockChart from './StockChart';
import MarketIntelligence from './MarketIntelligence';
import ElderAnalysis from './ElderAnalysis';
import TradeJournal from './TradeJournal';
import BacktestEngine from './BacktestEngine';
import TradeEntryModal from './TradeEntryModal';
import RightSidebar from './RightSidebar';
import TopToolbar from './TopToolbar';
import NavSidebar from './NavSidebar';
import { Activity, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
    const [stocks, setStocks] = useState([]);
    const [selectedSymbol, setSelectedSymbol] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [regimeData, setRegimeData] = useState(null);
    const [srLevels, setSrLevels] = useState([]);
    const [elderTactics, setElderTactics] = useState(null);
    const [macdDivergence, setMacdDivergence] = useState(null);
    const [f13Divergence, setF13Divergence] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [view, setView] = useState('weekly'); // 'weekly', 'elder' (daily), 'intelligence', 'backtest', 'journal'
    const [initError, setInitError] = useState(null);

    // --- Indicator State (Lifted from ElderAnalysis) ---
    const loadSetting = (key, defaultValue) => {
        try {
            const saved = localStorage.getItem(`elder_settings_${key}`);
            return saved !== null ? JSON.parse(saved) : defaultValue;
        } catch (e) {
            console.warn(`Error loading setting ${key}`, e);
            return defaultValue;
        }
    };

    const [indicators, setIndicators] = useState({
        showEMA: loadSetting('ema', true),
        showValueZones: loadSetting('valueZones', true),
        showSafeZones: loadSetting('safeZones', false),
        showSRLevels: loadSetting('srLevels', true),
        showDivergences: loadSetting('divergences', true),
        showMarkers: loadSetting('markers', true),
        // Panes
        showVolume: loadSetting('volume', true),
        showMACD: loadSetting('macd', true),
        showForce13: loadSetting('force13', true),
        showForce2: loadSetting('force2', true)
    });

    const toggleIndicator = (key) => {
        setIndicators(prev => {
            const newState = { ...prev, [key]: !prev[key] };
            // Persist immediately if not loading a template (handled separately)
            const mapping = {
                showEMA: 'ema',
                showValueZones: 'valueZones',
                showSafeZones: 'safeZones',
                showSRLevels: 'srLevels',
                showDivergences: 'divergences',
                showMarkers: 'markers',
                // Panes
                showVolume: 'volume',
                showMACD: 'macd',
                showForce13: 'force13',
                showForce2: 'force2'
            };
            if (mapping[key]) {
                localStorage.setItem(`elder_settings_${mapping[key]}`, JSON.stringify(newState[key]));
            }
            return newState;
        });
    };

    // --- Template Management ---
    const [templates, setTemplates] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('elder_templates') || '{}');
        } catch { return {}; }
    });

    const saveTemplate = (name) => {
        if (!name) return;
        const newTemplates = { ...templates, [name]: indicators };
        setTemplates(newTemplates);
        localStorage.setItem('elder_templates', JSON.stringify(newTemplates));
    };

    const loadTemplate = (name) => {
        const template = templates[name];
        if (template) {
            setIndicators(template);
            // Optionally update individual persistence keys too, so reload keeps the template
            Object.keys(template).forEach(key => {
                // Re-use logic or just rely on state for session
                // Ideally we update localstorage too
                // For now, let's keep it simple: State wins.
            });
        }
    };

    const deleteTemplate = (name) => {
        const newTemplates = { ...templates };
        delete newTemplates[name];
        setTemplates(newTemplates);
        localStorage.setItem('elder_templates', JSON.stringify(newTemplates));
    };

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
        // Skip analysis load for views that don't need it or handle it internally
        if (view === 'journal') return;

        setLoading(true);
        setChartData([]); // Clear previous data
        setRegimeData(null);
        setSrLevels([]);
        setElderTactics(null);
        setMacdDivergence(null);
        setF13Divergence(null);

        try {
            const period = view === 'weekly' ? '2y' : '1y';
            const interval = view === 'weekly' ? '1wk' : '1d';

            const res = await getAnalysis(symbol, period, interval);
            if (!res || !res.data) throw new Error("Invalid response from server");

            setChartData(res.data.data || []);
            setRegimeData({
                regime: res.data.regime || "Unknown",
                reason: res.data.regime_reason || "No data",
                volatility: res.data.volatility,
                confidence: res.data.confidence || "Low",
                confluence: res.data.confluence_factor || 0,
                confluence_details: res.data.confluence_details || {},
                macro: res.data.macro_status,
                relative_strength: res.data.relative_strength,
                macro_tides: res.data.macro_tides,
                suggestion: res.data.strategic_suggestion,
                decision: res.data.decision || "NEUTRAL",
                sector_analysis: res.data.sector_analysis
            });
            setSrLevels(res.data.sr_levels || []);
            setElderTactics(res.data.elder_tactics || null);
            setMacdDivergence(res.data.macd_divergence || null);
            setF13Divergence(res.data.f13_divergence || null);
        } catch (err) {
            console.error("Failed to load analysis", err);
            setChartData([]);
            setRegimeData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStock = async (symbol) => {
        if (!symbol) return;
        try {
            await addStock(symbol.toUpperCase());
            loadStocks();
        } catch (err) {
            alert('Failed to add stock');
        }
    };

    const handleDeleteStock = async (symbol, e) => {
        if (e) e.stopPropagation();
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
        if (e) e.stopPropagation();
        try {
            await toggleWatchStock(symbol);
            loadStocks();
        } catch (err) {
            console.error("Failed to toggle watch status", err);
        }
    };

    const handleScan = async (e) => {
        if (e) e.stopPropagation();
        if (isScanning) return;
        setIsScanning(true);
        try {
            await scanStocks();
            await loadStocks();
        } catch (err) {
            console.error("Scan failed", err);
        } finally {
            setIsScanning(false);
        }
    };

    // --- Modal & Action Handlers ---
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [isAnalysisSidebarOpen, setIsAnalysisSidebarOpen] = useState(false);

    const handleLogTrade = () => {
        setShowTradeModal(true);
    };

    const handleNotes = () => {
        setIsAnalysisSidebarOpen(prev => !prev);
    };

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
            {/* 1. Left Navigation (Slim) */}
            <NavSidebar currentView={view} setView={setView} />

            {/* 2. Main Center Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-950 relative">

                {/* TradingView-Style Top Toolbar */}
                <TopToolbar
                    symbol={selectedSymbol}
                    currentView={view}
                    setView={setView}
                    stocks={stocks}
                    onLogTrade={handleLogTrade}
                    onNotes={handleNotes}
                    indicators={indicators}
                    onToggleIndicator={toggleIndicator}
                    templates={templates}
                    onSaveTemplate={saveTemplate}
                    onLoadTemplate={loadTemplate}
                    onDeleteTemplate={deleteTemplate}
                />

                {/* View Content */}
                <div className="flex-1 relative overflow-hidden">
                    {initError ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-900/10 z-50">
                            <div className="flex flex-col items-center p-8 bg-gray-900 border border-red-500/30 rounded-2xl">
                                <AlertTriangle size={48} className="mb-4 text-red-500" />
                                <h2 className="text-xl font-bold mb-2 text-red-400">Analysis Engine Error</h2>
                                <p className="text-sm opacity-80 mb-4 text-gray-400">{initError}</p>
                                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-500">Retry</button>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-black/50 z-50 backdrop-blur-sm">
                            <Activity className="animate-spin mr-2" /> Loading Analysis...
                        </div>
                    ) : (
                        <div className="h-full overflow-y-auto custom-scrollbar">

                            {view === 'journal' ? (
                                <TradeJournal />
                            ) : view === 'backtest' ? (
                                <div className="p-4"><BacktestEngine /></div>
                            ) : view === 'elder' ? (
                                <ElderAnalysis
                                    key="daily-analysis"
                                    data={chartData}
                                    symbol={selectedSymbol}
                                    srLevels={srLevels}
                                    tacticalAdvice={elderTactics}
                                    macdDivergence={macdDivergence}
                                    f13Divergence={f13Divergence}
                                    timeframeLabel="Daily"
                                    regimeData={regimeData}
                                    setInitError={setInitError}
                                    onLogTrade={handleLogTrade}
                                    indicators={indicators}
                                    isSidebarOpen={isAnalysisSidebarOpen}
                                />
                            ) : view === 'weekly' ? (
                                <ElderAnalysis
                                    key="weekly-analysis"
                                    data={chartData}
                                    symbol={selectedSymbol}
                                    srLevels={srLevels}
                                    tacticalAdvice={elderTactics}
                                    macdDivergence={macdDivergence}
                                    f13Divergence={f13Divergence}
                                    timeframeLabel="Weekly"
                                    regimeData={regimeData}
                                    setInitError={setInitError}
                                    indicators={indicators}
                                    isSidebarOpen={isAnalysisSidebarOpen}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-600">
                                    Select a view
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Layer */}
            {showTradeModal && (
                <TradeEntryModal
                    isOpen={showTradeModal}
                    onClose={() => setShowTradeModal(false)}
                    symbol={selectedSymbol}
                    currentPrice={chartData && chartData.length > 0 ? chartData[chartData.length - 1].close : 0}
                />
            )}

            {/* 3. TradingView-Style Right Sidebar */}
            <RightSidebar
                // Watchlist Props
                stocks={stocks}
                selectedSymbol={selectedSymbol}
                onSelect={setSelectedSymbol}
                onAdd={handleAddStock}
                onDelete={handleDeleteStock}
                onToggleWatch={handleToggleWatch}
                isScanning={isScanning}
                onScan={handleScan}
                // Strategy Props
                data={chartData}
                tacticalAdvice={elderTactics}
                isWeekly={view === 'weekly'}
                f13Divergence={f13Divergence}
                regimeData={regimeData}
            />
        </div>
    );
};

export default Dashboard;
