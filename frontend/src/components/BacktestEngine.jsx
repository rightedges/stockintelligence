import React, { useState, useEffect } from 'react';
import {
    Play,
    StopCircle,
    Save,
    Download,
    BarChart3,
    TrendingUp,
    Target,
    Users,
    DollarSign,
    AlertTriangle,
    Clock,
    Settings,
    Database,
    RefreshCw,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Copy,
    Share2,
    FileText,
    FileSpreadsheet,
    FileCode,
    Gauge,
    Shield,
    Zap,
    Activity,
    LineChart as LineChartIcon,
    PieChart as PieChartIcon,
    TrendingDown,
    Award,
    Star,
    Calendar,
    Map,
    GitBranch,
    Layers,
    Search,
    Filter,
    Sliders,
    Edit,
    X
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend, Area, AreaChart } from 'recharts';
import * as LW from 'lightweight-charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import {
    runBacktest as runBacktestApi,
    getStrategyScript,
    getCustomScripts,
    saveCustomScript,
    updateCustomScript,
    deleteCustomScript
} from '../services/api';

const StrategyTypes = {
    ELDER_TRIPLE_SCREEN: { id: 'elder_triple_screen', name: 'Elder Triple Screen', description: 'Weekly tide + Daily wave + Execution' },
    DIVERGENCE: { id: 'divergence', name: 'Divergence Strategy', description: 'MACD and Force Index divergence detection' },
    FORCE_INDEX: { id: 'force_index', name: 'Force Index Strategy', description: 'Volume-based momentum strategy' },
    MACD_CROSSOVER: { id: 'macd_crossover', name: 'MACD Crossover', description: 'Classic MACD signal line crossovers' },
    CONFLUENCE_EXPERT: { id: 'confluence_expert', name: 'Confluence Expert', description: 'High-conviction "Perfect Storm" signals' }
};

// --- Helper Components ---

const getRiskLevel = (sharpe, maxDD) => {
    if (sharpe >= 2 && maxDD <= 10) return { level: 'Low', color: 'text-green-400', bg: 'bg-green-500/10' };
    if (sharpe >= 1 && maxDD <= 20) return { level: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    return { level: 'High', color: 'text-red-400', bg: 'bg-red-500/10' };
};

const PerformanceMetrics = ({ metrics }) => {
    if (!metrics) return null;
    const riskLevel = getRiskLevel(metrics.sharpe_ratio, metrics.max_drawdown_percent);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-blue-500/20 bg-gradient-to-br from-blue-900/20 to-transparent">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
                            <TrendingUp size={16} />
                            Total Return
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{metrics.total_return_percent?.toFixed(2)}%</div>
                        <div className="text-xs text-gray-400">CAGR: {metrics.cagr?.toFixed(2)}%</div>
                    </CardContent>
                </Card>
                <Card className="border-green-500/20 bg-gradient-to-br from-green-900/20 to-transparent">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-400 flex items-center gap-2">
                            <Target size={16} />
                            Win Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{metrics.win_rate?.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">PF: {metrics.profit_factor?.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-transparent">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                            <Shield size={16} />
                            Drawdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-400">{metrics.max_drawdown_percent?.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">Ulcer: {metrics.ulcer_index?.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card className={`${riskLevel.bg} border-2 border-white/10`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Shield size={16} className={riskLevel.color} />
                            <span className={riskLevel.color}>Risk Ratios</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-white">Sharpe: {metrics.sharpe_ratio?.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">Calmar: {metrics.calmar_ratio?.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const DrawdownChart = ({ equityCurve }) => {
    if (!equityCurve || equityCurve.length === 0) return null;

    // Calculate drawdown curve
    let peak = equityCurve[0].equity;
    const drawdownData = equityCurve.map(point => {
        if (point.equity > peak) peak = point.equity;
        const dd = ((peak - point.equity) / peak) * 100;
        return { date: point.date, drawdown: -dd };
    });

    return (
        <Card className="border-red-500/30">
            <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingDown size={16} className="text-red-400" />
                    Underwater Drawdown (% from Peak)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={drawdownData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis dataKey="date" hide />
                            <YAxis stroke="#9ca3af" fontSize={10} unit="%" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }}
                                formatter={(value) => [`${value.toFixed(2)}%`, 'Drawdown']}
                            />
                            <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

const StrategyVisualizer = ({ priceData, trades, symbol, plots = [] }) => {
    const chartContainerRef = React.useRef();
    const chartRef = React.useRef();

    React.useEffect(() => {
        if (!chartContainerRef.current || !priceData || priceData.length === 0) return;

        const chart = LW.createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: '#111827' },
                textColor: 'rgba(255, 255, 255, 0.9)',
            },
            grid: {
                vertLines: { color: 'rgba(197, 203, 206, 0.05)' },
                horzLines: { color: 'rgba(197, 203, 206, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.1)',
                timeVisible: true,
            },
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.1)',
            },
        });

        const candlestickSeries = chart.addSeries(LW.CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        });

        candlestickSeries.setData(priceData);

        // Add trade markers
        const markers = [];
        trades.forEach(trade => {
            if (trade.entry_date) {
                markers.push({
                    time: trade.entry_date,
                    position: trade.direction === 'Long' ? 'belowBar' : 'aboveBar',
                    color: trade.direction === 'Long' ? '#22c55e' : '#ef4444',
                    shape: trade.direction === 'Long' ? 'arrowUp' : 'arrowDown',
                    text: `Entry ${trade.direction}`,
                });
            }
            if (trade.exit_date) {
                markers.push({
                    time: trade.exit_date,
                    position: trade.direction === 'Long' ? 'aboveBar' : 'belowBar',
                    color: '#94a3b8',
                    shape: trade.direction === 'Long' ? 'arrowDown' : 'arrowUp',
                    text: `Exit`,
                });
            }
        });

        // Sort markers by time
        markers.sort((a, b) => new Date(a.time) - new Date(b.time));

        // Create Series Markers
        if (LW.createSeriesMarkers) {
            const seriesMarkers = LW.createSeriesMarkers(candlestickSeries);
            seriesMarkers.setMarkers(markers);
        } else if (candlestickSeries.setMarkers) {
            candlestickSeries.setMarkers(markers);
        }

        // --- NEW: Custom BSL Plots ---
        const plotSeriesList = [];
        plots.forEach(p => {
            const lineSeries = chart.addSeries(LW.LineSeries, {
                color: p.color || '#3b82f6',
                lineWidth: 2,
                title: p.title,
                priceLineVisible: false,
                lastValueVisible: true,
            });

            // Map data from priceData (where plot values are stored as p.column keys)
            const plotData = priceData
                .filter(d => d[p.column] !== undefined && d[p.column] !== null)
                .map(d => ({
                    time: d.time,
                    value: d[p.column]
                }));

            if (plotData.length > 0) {
                lineSeries.setData(plotData);
                plotSeriesList.push(lineSeries);
            }
        });

        chart.timeScale().fitContent();
        chartRef.current = chart;

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [priceData, trades, symbol, JSON.stringify(plots)]);

    if (!priceData || priceData.length === 0) return null;

    return (
        <Card className="border-blue-500/30 overflow-hidden">
            <CardHeader className="py-3 bg-blue-900/10">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity size={16} className="text-blue-400" />
                    Strategy Visualizer: {symbol}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div ref={chartContainerRef} className="w-full" />
            </CardContent>
        </Card>
    );
};

const PerformanceHeatmap = ({ trades }) => {
    if (!trades || trades.length === 0) return null;

    // Group net_pl by year and month
    const performance = {};
    trades.filter(t => t.status === 'closed').forEach(trade => {
        const date = new Date(trade.exit_date);
        const year = date.getFullYear();
        const month = date.getMonth();

        if (!performance[year]) performance[year] = Array(12).fill(0);
        performance[year][month] += trade.net_pl;
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = Object.keys(performance).sort((a, b) => b - a);

    return (
        <Card className="border-gray-800">
            <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Calendar size={16} className="text-blue-400" />
                    Monthly Profit/Loss Heatmap
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse">
                        <thead>
                            <tr>
                                <th className="p-1 border border-gray-800">Year</th>
                                {months.map(m => <th key={m} className="p-1 border border-gray-800 font-mono">{m}</th>)}
                                <th className="p-1 border border-gray-800 bg-gray-900">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {years.map(year => {
                                const row = performance[year];
                                const total = row.reduce((a, b) => a + b, 0);
                                return (
                                    <tr key={year}>
                                        <td className="p-1 border border-gray-800 font-bold text-center bg-gray-900">{year}</td>
                                        {row.map((val, i) => (
                                            <td key={i} className={`p-1 border border-gray-800 text-center font-mono ${val > 0 ? 'bg-green-500/20 text-green-400' : val < 0 ? 'bg-red-500/20 text-red-400' : 'text-gray-600'}`}>
                                                {val !== 0 ? val.toFixed(0) : '-'}
                                            </td>
                                        ))}
                                        <td className={`p-1 border border-gray-800 text-center font-bold font-mono ${total > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {total.toFixed(0)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

const EquityCurveChart = ({ equityCurve }) => {
    console.log("EquityCurveChart rendering with data length:", equityCurve?.length);
    if (!equityCurve || equityCurve.length === 0) {
        return (
            <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-700 rounded-xl">
                <AlertTriangle className="mx-auto mb-4" />
                <p>No equity curve data available</p>
            </div>
        );
    }

    return (
        <Card className="border-blue-500/30">
            <CardHeader>
                <CardTitle>Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-80 w-full" style={{ minHeight: '320px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equityCurve}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} angle={-45} textAnchor="end" height={60} />
                            <YAxis stroke="#9ca3af" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                            <Area type="monotone" dataKey="equity" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

const TradeAnalysis = ({ trades }) => {
    console.log("TradeAnalysis rendering with trades count:", trades?.length);
    if (!trades || trades.length === 0) {
        return (
            <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-700 rounded-xl">
                <AlertTriangle className="mx-auto mb-4" />
                <p>No trades executed during this period</p>
            </div>
        );
    }

    return (
        <Card className="border-purple-500/30">
            <CardHeader>
                <CardTitle>Trade List ({trades.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-gray-400 border-b border-gray-800">
                            <tr>
                                <th className="text-left p-2">Date</th>
                                <th className="text-left p-2">Symbol</th>
                                <th className="text-left p-2">Dir</th>
                                <th className="text-right p-2">Entry</th>
                                <th className="text-right p-2">Exit</th>
                                <th className="text-right p-2">Net P/L</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.slice(0, 100).map((trade, idx) => (
                                <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                    <td className="p-2 font-mono">{trade.entry_date}</td>
                                    <td className="p-2 font-bold">{trade.symbol}</td>
                                    <td className="p-2">
                                        <Badge variant={trade.direction === 'Long' ? 'success' : 'destructive'}>{trade.direction}</Badge>
                                    </td>
                                    <td className="p-2 text-right">${trade.entry_price?.toFixed(2)}</td>
                                    <td className="p-2 text-right">${trade.exit_price?.toFixed(2)}</td>
                                    <td className={`p-2 text-right font-bold ${trade.net_pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${trade.net_pl?.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

const BacktestEngine = () => {
    console.log("BacktestEngine main render");

    // Core State
    const [symbol, setSymbol] = useState('AAPL');
    const [strategy, setStrategy] = useState(StrategyTypes.ELDER_TRIPLE_SCREEN.id);
    const [startDate, setStartDate] = useState('2023-01-01');
    const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA')); // Local YYYY-MM-DD

    // Config State (more granular)
    const [initialCapital, setInitialCapital] = useState(10000);
    const [positionSize, setPositionSize] = useState(10);
    const [commission, setCommission] = useState(1.0);
    const [slippage, setSlippage] = useState(0.01);
    const [maxOpenPositions, setMaxOpenPositions] = useState(5);
    const [stopLossATR, setStopLossATR] = useState(2.0);
    const [takeProfitATR, setTakeProfitATR] = useState(3.0);


    // Custom Strategy State
    const [customScript, setCustomScript] = useState(
        `// Define Strategy Logic
fast_ma = EMA(12)
slow_ma = EMA(26)

// Conditions
trend_up = fast_ma > slow_ma
oversold = RSI(14) < 30

// Execution
ENTRY_LONG = trend_up AND oversold AND CROSSOVER(fast_ma, slow_ma)
EXIT_LONG = RSI(14) > 70`
    );

    const [results, setResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [activeTab, setActiveTab] = useState('config');
    const [savedConfigs, setSavedConfigs] = useState([]);
    const [error, setError] = useState(null); // Added based on runBacktest
    const [loading, setLoading] = useState(false); // Added based on runBacktest

    useEffect(() => {
        const saved = localStorage.getItem('backtest_configs');
        if (saved) setSavedConfigs(JSON.parse(saved));
    }, []);

    // Script Management State
    const [savedScripts, setSavedScripts] = useState([]);
    const [currentScriptId, setCurrentScriptId] = useState(null);
    const [scriptName, setScriptName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Fetch Custom Scripts on Mount
    useEffect(() => {
        const loadScripts = async () => {
            try {
                const res = await getCustomScripts();
                setSavedScripts(res.data);
            } catch (err) {
                console.error("Failed to load custom scripts", err);
            }
        };
        loadScripts();
    }, []);

    // Fetch BSL Script when strategy changes
    useEffect(() => {
        const fetchScript = async () => {
            if (strategy === 'custom') return; // Don't overwrite if custom is selected manually (unless switching FROM another)

            try {
                const response = await getStrategyScript(strategy);
                if (response.data && response.data.script) {
                    setCustomScript(response.data.script);
                    setCurrentScriptId(null); // Clear loaded script ID if switching to built-in
                    setScriptName('');
                }
            } catch (err) {
                console.error("Failed to fetch strategy script:", err);
            }
        };
        fetchScript();
    }, [strategy]);

    const handleSaveScript = async () => {
        if (!scriptName.trim()) {
            toast.error("Please enter a script name");
            return;
        }
        setIsSaving(true);
        try {
            if (currentScriptId) {
                // Update existing
                await updateCustomScript(currentScriptId, { name: scriptName, script: customScript });
                toast.success("Script updated!");
            } else {
                // Create new
                const res = await saveCustomScript({ name: scriptName, script: customScript });
                setCurrentScriptId(res.data.id);
                setSavedScripts([...savedScripts, res.data]);
                toast.success("Script saved!");
            }
            // Refresh list to be sure
            const res = await getCustomScripts();
            setSavedScripts(res.data);
        } catch (err) {
            toast.error("Failed to save script: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteScript = async () => {
        if (!currentScriptId) return;
        if (!window.confirm("Are you sure you want to delete this script?")) return;

        try {
            await deleteCustomScript(currentScriptId);
            setSavedScripts(savedScripts.filter(s => s.id !== currentScriptId));
            setCurrentScriptId(null);
            setScriptName('');
            setCustomScript('// Script deleted. Start new...');
            toast.success("Script deleted");
        } catch (err) {
            toast.error("Failed to delete script");
        }
    };

    const handleLoadScript = (scriptId) => {
        const script = savedScripts.find(s => s.id.toString() === scriptId.toString());
        if (script) {
            setCustomScript(script.script);
            setCurrentScriptId(script.id);
            setScriptName(script.name);
            setStrategy('custom'); // Ensure we are in custom mode
        }
    };

    const runBacktest = async () => {
        console.log("Attempting to run backtest...");
        if (!symbol || !startDate || !endDate) { // Changed from config.symbol etc.
            toast.error('Missing required fields');
            return;
        }

        setLoading(true); // Added
        setError(null); // Added
        setIsRunning(true);
        try {
            console.log("API POST /backtest/run starting...");
            const payload = { // Replaced config with individual states
                symbol,
                strategyType: strategy,
                startDate,
                endDate,
                initialCapital,
                positionSizePercent: positionSize,
                commissionPerTrade: commission,
                slippagePerTrade: slippage,
                stopLossATRMultiplier: stopLossATR,
                takeProfitATRMultiplier: takeProfitATR,
                maxOpenPositions: maxOpenPositions,
            };

            if (strategy === 'custom' || customScript) {
                payload.customStrategyConfig = customScript; // Sending raw script if available
            }

            const response = await runBacktestApi(payload); // Changed from config to payload
            console.log("SERVER RESPONSE RECEIVED", response.data);

            if (response.data.success) {
                setResults([response.data, ...results]);
                setSelectedResult(response.data);
                setActiveTab('results');
                toast.success('Backtest complete!');
            } else {
                throw new Error(response.data.detail || 'Backtest failed');
            }
        } catch (error) {
            console.error("CRITICAL BACKTEST FAILURE", error);
            setError(error.response?.data?.detail || "Backtest failed"); // Added setError
            toast.error('Failed: ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false); // Added
            setIsRunning(false);
        }
    };

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Backtest Hub</h1>
                    <p className="text-gray-400 font-mono text-xs">Diagnostic Mode: ON</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            runBacktest();
                        }}
                        disabled={isRunning}
                        className={`px-8 py-2 rounded-lg font-bold text-white transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center gap-2 ${isRunning ? 'bg-gray-700 animate-pulse' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 cursor-pointer'}`}
                    >
                        {isRunning ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                        {isRunning ? 'Backtesting...' : 'Run Analysis'}
                    </button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(val) => { console.log("Tab change to:", val); setActiveTab(val); }}>
                <TabsList className="grid w-full grid-cols-5 p-1 bg-gray-950 border border-gray-800 rounded-xl">
                    <TabsTrigger value="config" className="rounded-lg">Config</TabsTrigger>
                    <TabsTrigger value="results" className="rounded-lg">Results</TabsTrigger>
                    <TabsTrigger value="charts" className="rounded-lg">Charts</TabsTrigger>
                    <TabsTrigger value="trades" className="rounded-lg">Trades</TabsTrigger>
                    <TabsTrigger value="compare" className="rounded-lg">Compare</TabsTrigger>
                </TabsList>

                <div className="mt-8 border-2 border-gray-800/30 rounded-2xl p-4 min-h-[400px]">
                    <TabsContent value="config">
                        <Card className="border-none bg-transparent">
                            <CardContent className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400">Strategy</label>
                                        <select
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                            value={strategy}
                                            onChange={(e) => setStrategy(e.target.value)}
                                        >
                                            {Object.values(StrategyTypes).map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                            <option value="custom">Custom Strategy (BSL)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400">Symbol</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                                            <input
                                                type="text"
                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-blue-500 outline-none uppercase font-bold"
                                                value={symbol}
                                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400">Start Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-white"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400">End Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-white"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>


                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2">
                                        <div className="p-4 bg-gray-900/50 border border-purple-500/30 rounded-xl h-full flex flex-col">
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                                                    <Settings size={16} /> BSL Strategy: {strategy === 'custom' ? 'Custom' : StrategyTypes[strategy.toUpperCase()]?.name || strategy}
                                                </h3>
                                            </div>

                                            {/* Script Management Toolbar */}
                                            {strategy === 'custom' && (
                                                <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-gray-950/50 rounded-lg border border-gray-800">
                                                    <select
                                                        className="bg-gray-900 border border-gray-700 text-xs rounded px-2 py-1 outline-none text-gray-300 max-w-[150px]"
                                                        onChange={(e) => handleLoadScript(e.target.value)}
                                                        value={currentScriptId || ""}
                                                    >
                                                        <option value="">-- Load Script --</option>
                                                        {savedScripts.map(s => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </select>

                                                    <input
                                                        type="text"
                                                        placeholder="Script Name"
                                                        className="bg-gray-900 border border-gray-700 text-xs rounded px-2 py-1 outline-none text-white w-32"
                                                        value={scriptName}
                                                        onChange={(e) => setScriptName(e.target.value)}
                                                    />

                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-6 text-[10px] px-2"
                                                        onClick={handleSaveScript}
                                                        disabled={isSaving}
                                                    >
                                                        <Save size={12} className="mr-1" /> {currentScriptId ? 'Update' : 'Save'}
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 text-[10px] px-2 text-gray-400 hover:text-white"
                                                        onClick={() => {
                                                            setCurrentScriptId(null);
                                                            setScriptName('');
                                                            setCustomScript('// New Script\n');
                                                        }}
                                                    >
                                                        <FileText size={12} className="mr-1" /> New
                                                    </Button>

                                                    {currentScriptId && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 text-[10px] px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                            onClick={handleDeleteScript}
                                                        >
                                                            <Trash2 size={12} />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-2 flex-grow flex flex-col">
                                                <textarea
                                                    className="w-full bg-black/40 border border-gray-700 rounded-lg p-3 text-xs font-mono text-purple-300 focus:border-purple-500 outline-none h-64 font-medium resize-none"
                                                    spellCheck="false"
                                                    value={customScript}
                                                    onChange={(e) => setCustomScript(e.target.value)}
                                                />
                                                <div className="flex justify-between items-center text-[10px] text-gray-500 italic px-1">
                                                    <span>Supports: Variables, Assignments (=), CROSSOVER, logic (AND/OR).</span>
                                                    <span>Signals: CONFLUENCE_LONG(), CONFLUENCE_SHORT() (EFI + Candlesticks)</span>
                                                    <span>Req: ENTRY_LONG, EXIT_LONG balance.</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Risk & Execution - Takes less space */}
                                    <div className="space-y-6">
                                        <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-xl space-y-4">
                                            <Label className="text-blue-400 font-semibold flex items-center gap-2">
                                                <Shield size={16} />
                                                Risk & Execution
                                            </Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-gray-400">Initial Capital</Label>
                                                    <Input type="number" value={initialCapital} onChange={(e) => setInitialCapital(parseFloat(e.target.value))} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-gray-400">Position Risk %</Label>
                                                    <Input type="number" step="0.1" value={positionSize} onChange={(e) => setPositionSize(parseFloat(e.target.value))} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-gray-400">Max Open Positions</Label>
                                                    <Input type="number" value={maxOpenPositions} onChange={(e) => setMaxOpenPositions(parseInt(e.target.value))} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-gray-400">Slippage ($/share)</Label>
                                                    <Input type="number" step="0.01" value={slippage} onChange={(e) => setSlippage(parseFloat(e.target.value))} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="results">
                        {selectedResult ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                <PerformanceMetrics metrics={selectedResult.metrics} />
                                <PerformanceHeatmap trades={selectedResult.trades} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-20 text-gray-500">
                                <Activity size={48} className="mb-4 opacity-20" />
                                <p>No backtest data loaded. Run a test to see metrics.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="charts">
                        {selectedResult ? (
                            <div className="space-y-6">
                                <StrategyVisualizer
                                    priceData={selectedResult.price_data}
                                    trades={selectedResult.trades}
                                    symbol={selectedResult.symbol}
                                    plots={typeof selectedResult.plots === 'string' ? JSON.parse(selectedResult.plots) : (selectedResult.plots || [])}
                                />
                                <EquityCurveChart equityCurve={selectedResult.equity_curve} />
                                <DrawdownChart equityCurve={selectedResult.equity_curve} />
                            </div>
                        ) : (
                            <div className="p-20 text-center text-gray-500 italic">Please run a backtest first</div>
                        )}
                    </TabsContent>

                    <TabsContent value="trades">
                        {selectedResult ? <TradeAnalysis trades={selectedResult.trades} /> : <div className="p-20 text-center text-gray-500 italic">Please run a backtest first</div>}
                    </TabsContent>

                    <TabsContent value="compare">
                        <div className="p-20 text-center space-y-4">
                            <PieChartIcon size={48} className="mx-auto text-gray-600" />
                            <h2 className="text-xl font-bold text-gray-400">Comparison Engine</h2>
                            <p className="text-gray-500 max-w-md mx-auto">This module is currently being finalized for high-concurrency multi-symbol analysis.</p>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            {/* Diagnostic Data Dump Card */}
            {
                selectedResult && (
                    <Card className="mt-12 bg-black border-yellow-900/30 overflow-hidden">
                        <CardHeader className="bg-yellow-950/20 py-2">
                            <CardTitle className="text-xs uppercase tracking-widest text-yellow-500/50 flex items-center gap-2">
                                <Database size={12} />
                                State Diagnostics (Data Consistency Check)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <pre className="text-[10px] text-green-500/70 font-mono overflow-auto max-h-40">
                                {JSON.stringify({
                                    id: selectedResult.result_id,
                                    symbols: selectedResult.symbol,
                                    curve_points: selectedResult.equity_curve?.length || 0,
                                    trades_count: selectedResult.trades?.length || 0,
                                    has_metrics: !!selectedResult.metrics
                                }, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )
            }
        </div >
    );
};

export default BacktestEngine;