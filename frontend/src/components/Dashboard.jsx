import React, { useState, useEffect, useRef } from 'react';
import { getStocks, addStock, deleteStock, getAnalysis, toggleWatchStock, scanStocks, scanStocksEFI } from '../services/api';
import StockChart from './StockChart';
import MarketIntelligence from './MarketIntelligence';
import TechnicalChart from './TechnicalChart';
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

    // --- Dynamic Indicator System ---
    const INITIAL_INDICATORS = {
        overlays: [
            { id: 'ema_13', type: 'ema', params: { window: 13 }, visible: true, label: 'EMA', color: '#60a5fa' },
            { id: 'ema_26', type: 'ema', params: { window: 26 }, visible: true, label: 'EMA', color: '#f59e0b' },
            { id: 'value_zones', type: 'valueZones', visible: true, label: 'Value Zone' },
            { id: 'safe_zones', type: 'safeZones', visible: false, label: 'Safe Zones' },
            { id: 'sr_levels', type: 'sr_levels', visible: true, label: 'S/R Levels' },
            { id: 'guppy', type: 'guppy', visible: false, label: 'Guppy MMA' },
            { id: 'bollinger', type: 'bollinger', visible: false, label: 'Bollinger Bands' },
            { id: 'atr_stop', type: 'atrStop', visible: false, label: 'ATR Volatility Stop' }
        ],
        panes: [
            { id: 'volume', type: 'volume', visible: true, label: 'Volume' },
            { id: 'macd', type: 'macd', params: { fast: 12, slow: 26, signal: 9 }, visible: true, label: 'MACD' },
            { id: 'force13', type: 'force13', visible: true, label: 'Force Index (13)' },
            { id: 'force2', type: 'force2', visible: true, label: 'Force Index (2)' }
        ],
        signals: [
            { id: 'macd_div', type: 'macdDivergence', visible: true, label: 'MACD Divergence' },
            { id: 'force_div', type: 'forceDivergence', visible: true, label: 'Force Divergence' },
            { id: 'force_markers', type: 'forceMarkers', visible: true, label: 'Force Markers' },
            { id: 'force_zones', type: 'forceZones', visible: true, label: 'Force Zones' },
            { id: 'guppy_signals', type: 'guppySignals', visible: false, label: 'GMMA Crossovers' },
            { id: 'candlestick_patterns', type: 'candlestickPatterns', visible: false, label: 'Candlestick Patterns' }
        ]
    };

    const getSavedConfig = (v) => {
        if (!['elder', 'weekly'].includes(v)) return INITIAL_INDICATORS;
        try {
            const saved = localStorage.getItem(`elder_indicator_configs_${v}`);
            if (!saved) return INITIAL_INDICATORS;

            const parsed = JSON.parse(saved);
            // Ensure new default indicators are merged into saved state
            const merged = { ...INITIAL_INDICATORS };

            Object.keys(INITIAL_INDICATORS).forEach(category => {
                const savedList = parsed[category] || [];
                const defaultList = INITIAL_INDICATORS[category] || [];

                // Keep saved items, but append any default items that are missing by ID
                const existingIds = new Set(savedList.map(item => item.id));
                const missingDefaults = defaultList.filter(item => !existingIds.has(item.id));

                merged[category] = [...savedList, ...missingDefaults];
            });

            return merged;
        } catch { return INITIAL_INDICATORS; }
    };

    const [indicatorConfigs, setIndicatorConfigs] = useState(() => getSavedConfig(view));

    const updateIndicatorConfig = (category, id, updates) => {
        setIndicatorConfigs(prev => {
            const newList = prev[category].map(item =>
                item.id === id ? { ...item, ...updates } : item
            );
            const newState = { ...prev, [category]: newList };
            if (['elder', 'weekly'].includes(view)) {
                localStorage.setItem(`elder_indicator_configs_${view}`, JSON.stringify(newState));
            }
            return newState;
        });
    };

    const addIndicator = (category, config) => {
        setIndicatorConfigs(prev => {
            const newState = { ...prev, [category]: [...prev[category], config] };
            if (['elder', 'weekly'].includes(view)) {
                localStorage.setItem(`elder_indicator_configs_${view}`, JSON.stringify(newState));
            }
            return newState;
        });
    };

    const removeIndicator = (category, id) => {
        setIndicatorConfigs(prev => {
            const newState = { ...prev, [category]: prev[category].filter(item => item.id !== id) };
            if (['elder', 'weekly'].includes(view)) {
                localStorage.setItem(`elder_indicator_configs_${view}`, JSON.stringify(newState));
            }
            return newState;
        });
    };

    // Chart Style State
    const [chartStyle, setChartStyle] = useState(() => {
        const saved = localStorage.getItem(`chartStyle_${view}`);
        return saved || 'normal';
    });

    const handleChartStyleChange = (style) => {
        setChartStyle(style);
        localStorage.setItem(`chartStyle_${view}`, style);
    };

    // Helper to extract dynamic parameters for API
    const getDynamicIndicatorList = (configs) => {
        const list = [];
        configs.overlays.forEach(o => {
            if (['ema', 'sma', 'rsi'].includes(o.type)) list.push({ type: o.type, params: o.params });
        });
        configs.panes.forEach(p => {
            if (p.type === 'macd') list.push({ type: p.type, params: p.params });
        });
        return list;
    };

    // --- Template Management ---
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [templates, setTemplates] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('elder_templates') || '{}');
        } catch { return {}; }
    });
    const [defaultTemplates, setDefaultTemplates] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('elder_default_templates') || '{}');
        } catch { return {}; }
    });

    const prevViewRef = useRef(null);

    const saveTemplate = (name) => {
        if (!name) return;
        const newTemplates = {
            ...templates,
            [name]: {
                indicatorConfigs,
                view
            }
        };
        setTemplates(newTemplates);
        localStorage.setItem('elder_templates', JSON.stringify(newTemplates));
        setActiveTemplate(name);
    };

    const setDefaultTemplate = (name) => {
        const newDefaults = {
            ...defaultTemplates,
            [view]: name
        };
        setDefaultTemplates(newDefaults);
        localStorage.setItem('elder_default_templates', JSON.stringify(newDefaults));
    };

    const loadTemplate = (name) => {
        const template = templates[name];
        if (template) {
            const configData = template.indicatorConfigs || template;

            // Merge defaults into template config if it's missing them
            const mergedConfig = { ...INITIAL_INDICATORS };
            Object.keys(INITIAL_INDICATORS).forEach(category => {
                const templateList = configData[category] || [];
                const defaultList = INITIAL_INDICATORS[category] || [];

                const existingIds = new Set(templateList.map(item => item.id));
                const missingDefaults = defaultList.filter(item => !existingIds.has(item.id));

                mergedConfig[category] = [...templateList, ...missingDefaults];
            });

            if (mergedConfig.overlays && mergedConfig.panes) {
                setIndicatorConfigs(mergedConfig);
                // Sync to timeframe-specific storage
                const targetView = template.view || view;
                if (['elder', 'weekly'].includes(targetView)) {
                    localStorage.setItem(`elder_indicator_configs_${targetView}`, JSON.stringify(mergedConfig));
                }
            } else {
                console.warn("Incompatible template format detected");
            }

            if (template.view) setView(template.view);
            setActiveTemplate(name);
        }
    };

    // Auto-load default template on view change
    useEffect(() => {
        if (prevViewRef.current !== view) {
            const defaultName = defaultTemplates[view];
            if (defaultName && templates[defaultName]) {
                loadTemplate(defaultName);
            }
            prevViewRef.current = view;
        }
    }, [view, defaultTemplates, templates]);

    useEffect(() => {
        if (['elder', 'weekly', 'backtest'].includes(view)) {
            setIndicatorConfigs(getSavedConfig(view));
        }
    }, [view]);

    const deleteTemplate = (name) => {
        const newTemplates = { ...templates };
        delete newTemplates[name];
        setTemplates(newTemplates);
        localStorage.setItem('elder_templates', JSON.stringify(newTemplates));
        if (activeTemplate === name) setActiveTemplate(null);
    };

    useEffect(() => {
        loadStocks();
    }, []);

    useEffect(() => {
        if (selectedSymbol) {
            loadAnalysis(selectedSymbol);
        }
    }, [selectedSymbol, view, indicatorConfigs]);

    const handleSymbolChange = async (newSymbol) => {
        const normalized = newSymbol.trim().toUpperCase();
        if (!normalized || normalized === selectedSymbol) return;

        // Just switch the symbol. loadAnalysis useEffect will handle the rest.
        // Validation happens on the backend during analysis fetch.
        setSelectedSymbol(normalized);
    };

    const handleAddToWatchlist = async (symbolToAdd) => {
        const normalized = symbolToAdd.toUpperCase();
        if (stocks.some(s => s.symbol.toUpperCase() === normalized)) return;

        try {
            const res = await addStock(normalized);
            setStocks(prev => [...prev, res.data]);
        } catch (err) {
            console.error("Failed to add to watchlist", err);
        }
    };

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
            const period = view === 'weekly' ? '5y' : '5y';
            const interval = view === 'weekly' ? '1wk' : '1d';

            const dynamicIndicators = getDynamicIndicatorList(indicatorConfigs);
            const results = await getAnalysis(symbol, period, interval, dynamicIndicators);
            if (!results || !results.data) throw new Error("Invalid response from server");

            setChartData(results.data.data || []);
            setRegimeData({
                regime: results.data.regime || "Unknown",
                reason: results.data.regime_reason || "No data",
                volatility: results.data.volatility,
                confidence: results.data.confidence || "Low",
                confluence: results.data.confluence_factor || 0,
                confluence_details: results.data.confluence_details || {},
                macro: results.data.macro_status,
                relative_strength: results.data.relative_strength,
                macro_tides: results.data.macro_tides,
                suggestion: results.data.strategic_suggestion,
                decision: results.data.decision || "NEUTRAL",
                sector_analysis: results.data.sector_analysis
            });
            setSrLevels(results.data.sr_levels || []);
            setElderTactics(results.data.elder_tactics || null);
            setMacdDivergence(results.data.macd_divergence || null);
            setF13Divergence(results.data.f13_divergence || null);
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
                    onSymbolChange={handleSymbolChange}
                    onAddToWatchlist={handleAddToWatchlist}
                    stocks={stocks}
                    currentView={view}
                    setView={setView}
                    onLogTrade={handleLogTrade}
                    onNotes={handleNotes}
                    indicatorConfigs={indicatorConfigs}
                    onUpdateIndicator={updateIndicatorConfig}
                    onAddIndicator={addIndicator}
                    onRemoveIndicator={removeIndicator}
                    templates={templates}
                    activeTemplate={activeTemplate}
                    onSaveTemplate={saveTemplate}
                    onLoadTemplate={loadTemplate}
                    onDeleteTemplate={deleteTemplate}
                    defaultTemplates={defaultTemplates}
                    onSetDefaultTemplate={setDefaultTemplate}
                    chartStyle={chartStyle}
                    onChartStyleChange={handleChartStyleChange}
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
                            ) : view === 'elder' || view === 'weekly' ? (
                                <TechnicalChart
                                    key={view === 'elder' ? "daily-analysis" : "weekly-analysis"}
                                    symbol={selectedSymbol}
                                    data={chartData}
                                    indicatorConfigs={indicatorConfigs}
                                    chartStyle={chartStyle}
                                    macdDivergence={macdDivergence}
                                    f13Divergence={f13Divergence}
                                    srLevels={srLevels}
                                    timeframeLabel={view === 'elder' ? 'Daily' : 'Weekly'}
                                    regimeData={regimeData}
                                    setInitError={setInitError}
                                    onLogTrade={handleLogTrade}
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
