import React, { useState, useEffect } from 'react';
import {
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
    X,
    Download,
    Upload,
    Play,
    StopCircle,
    Save,
    SaveAll
} from 'lucide-react';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend, Area, AreaChart } from 'recharts';

const StrategyTypes = {
    ELDER_TRIPLE_SCREEN: { id: 'elder_triple_screen', name: 'Elder Triple Screen', description: 'Weekly tide + Daily wave + Execution' },
    DIVERGENCE: { id: 'divergence', name: 'Divergence Strategy', description: 'MACD and Force Index divergence detection' },
    FORCE_INDEX: { id: 'force_index', name: 'Force Index Strategy', description: 'Volume-based momentum strategy' },
    MACD_CROSSOVER: { id: 'macd_crossover', name: 'MACD Crossover', description: 'Classic MACD signal line crossovers' }
};

const BacktestSummary = ({ symbol, onRunBacktest }) => {
    const [results, setResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (symbol) {
            loadResults();
        }
    }, [symbol]);

    const loadResults = async () => {
        setIsLoading(true);
        try {
            // Load from localStorage first
            const saved = localStorage.getItem(`backtest_results_${symbol}`);
            if (saved) {
                setResults(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Failed to load backtest results:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveResults = (newResults) => {
        setResults(newResults);
        localStorage.setItem(`backtest_results_${symbol}`, JSON.stringify(newResults));
    };

    const addResult = (result) => {
        const newResults = [result, ...results];
        saveResults(newResults);
        setSelectedResult(result);
    };

    const deleteResult = (resultId) => {
        const newResults = results.filter(r => r.result_id !== resultId);
        saveResults(newResults);
        if (selectedResult?.result_id === resultId) {
            setSelectedResult(newResults[0] || null);
        }
        toast.success('Backtest result deleted');
    };

    const exportResults = (format) => {
        if (!selectedResult) return;

        const data = {
            ...selectedResult,
            timestamp: new Date().toISOString(),
            symbol: symbol
        };

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${symbol}_${selectedResult.strategy}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'csv') {
            const trades = selectedResult.trades || [];
            const headers = ['Entry Date', 'Exit Date', 'Symbol', 'Direction', 'Entry Price', 'Exit Price', 'Quantity', 'Gross P/L', 'Net P/L', 'Return %'];
            const csv = [
                headers.join(','),
                ...trades.map(t => [
                    t.entry_date || '',
                    t.exit_date || '',
                    t.symbol || '',
                    t.direction || '',
                    t.entry_price || '',
                    t.exit_price || '',
                    t.quantity || '',
                    t.gross_pl || '',
                    t.net_pl || '',
                    t.trade_return_percent || ''
                ].join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${symbol}_${selectedResult.strategy}_${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
        toast.success(`Results exported as ${format.toUpperCase()}`);
    };

    const getRiskLevel = (sharpe, maxDD) => {
        if (sharpe >= 2 && maxDD <= 10) return { level: 'Low', color: 'text-green-400', bg: 'bg-green-500/10', icon: '🟢' };
        if (sharpe >= 1 && maxDD <= 20) return { level: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: '🟡' };
        return { level: 'High', color: 'text-red-400', bg: 'bg-red-500/10', icon: '🔴' };
    };

    const PerformanceMetrics = ({ metrics }) => {
        if (!metrics) return null;

        const riskLevel = getRiskLevel(metrics.sharpe_ratio, metrics.max_drawdown_percent);

        return (
            <div className="space-y-6">
                {/* Key Performance Indicators */}
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
                            <div className="text-xs text-gray-400">Net profit over period</div>
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
                            <div className="text-xs text-gray-400">{metrics.winning_trades}/{metrics.total_trades} trades</div>
                        </CardContent>
                    </Card>

                    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-transparent">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                                <Users size={16} />
                                Profit Factor
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{metrics.profit_factor?.toFixed(2)}</div>
                            <div className="text-xs text-gray-400">Gross profit / Gross loss</div>
                        </CardContent>
                    </Card>

                    <Card className={`${riskLevel.bg} border-2 border-white/10`}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Shield size={16} className={riskLevel.color} />
                                <span className={riskLevel.color}>Risk Level</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${riskLevel.color}`}>{riskLevel.icon} {riskLevel.level}</div>
                            <div className="text-xs text-gray-400">Sharpe: {metrics.sharpe_ratio?.toFixed(2)}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Advanced Metrics */}
                <Card>
                    <CardHeader>
                        <CardTitle>Advanced Metrics</CardTitle>
                        <CardDescription>Detailed performance analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-400">{metrics.cagr?.toFixed(2)}%</div>
                                <div className="text-xs text-gray-400">CAGR</div>
                            </div>
                            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                                <div className="text-2xl font-bold text-green-400">{metrics.sortino_ratio?.toFixed(2)}</div>
                                <div className="text-xs text-gray-400">Sortino</div>
                            </div>
                            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-400">{metrics.max_drawdown_percent?.toFixed(1)}%</div>
                                <div className="text-xs text-gray-400">Max Drawdown</div>
                            </div>
                            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                                <div className="text-2xl font-bold text-cyan-400">{metrics.avg_risk_reward?.toFixed(2)}:1</div>
                                <div className="text-xs text-gray-400">Avg R/R</div>
                            </div>
                            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                                <div className="text-2xl font-bold text-orange-400">{metrics.best_trade?.toFixed(2)}%</div>
                                <div className="text-xs text-gray-400">Best Trade</div>
                            </div>
                            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                                <div className="text-2xl font-bold text-red-400">{metrics.worst_trade?.toFixed(2)}%</div>
                                <div className="text-xs text-gray-400">Worst Trade</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const EquityCurveChart = ({ equityCurve }) => {
        if (!equityCurve || equityCurve.length === 0) return null;

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Equity Curve</CardTitle>
                    <CardDescription>Portfolio value over time</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={equityCurve}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#9ca3af"
                                    fontSize={12}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px'
                                    }}
                                    labelStyle={{ color: '#9ca3af' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="equity"
                                    stroke="#60a5fa"
                                    fill="#60a5fa"
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const TradeAnalysis = ({ trades }) => {
        if (!trades || trades.length === 0) return null;

        const winTrades = trades.filter(t => t.net_pl > 0);
        const lossTrades = trades.filter(t => t.net_pl < 0);

        const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
        const avgWin = winTrades.length > 0 ? winTrades.reduce((sum, t) => sum + t.net_pl, 0) / winTrades.length : 0;
        const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((sum, t) => sum + t.net_pl, 0) / lossTrades.length : 0;

        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Trade Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Winning Trades', value: winTrades.length, color: '#10b981' },
                                            { name: 'Losing Trades', value: lossTrades.length, color: '#ef4444' }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {[
                                            { name: 'Winning Trades', value: winTrades.length, color: '#10b981' },
                                            { name: 'Losing Trades', value: lossTrades.length, color: '#ef4444' }
                                        ].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Trade Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="text-left p-2">Entry Date</th>
                                        <th className="text-left p-2">Exit Date</th>
                                        <th className="text-left p-2">Symbol</th>
                                        <th className="text-left p-2">Direction</th>
                                        <th className="text-right p-2">Entry Price</th>
                                        <th className="text-right p-2">Exit Price</th>
                                        <th className="text-right p-2">Net P/L</th>
                                        <th className="text-right p-2">Return %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trades.map((trade, index) => (
                                        <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                                            <td className="p-2">{trade.entry_date}</td>
                                            <td className="p-2">{trade.exit_date || 'Open'}</td>
                                            <td className="p-2">{trade.symbol}</td>
                                            <td className="p-2">
                                                <Badge variant={trade.direction === 'Long' ? 'success' : 'destructive'}>
                                                    {trade.direction}
                                                </Badge>
                                            </td>
                                            <td className="p-2 text-right">${trade.entry_price?.toFixed(2)}</td>
                                            <td className="p-2 text-right">${trade.exit_price?.toFixed(2)}</td>
                                            <td className={`p-2 text-right font-medium ${trade.net_pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                ${trade.net_pl?.toFixed(2)}
                                            </td>
                                            <td className={`p-2 text-right ${trade.trade_return_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {trade.trade_return_percent?.toFixed(2)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const ResultsList = () => {
        if (isLoading) {
            return (
                <Card>
                    <CardContent className="text-center py-12">
                        <RefreshCw className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin" />
                        <p className="text-gray-400">Loading backtest results...</p>
                    </CardContent>
                </Card>
            );
        }

        if (results.length === 0) {
            return (
                <Card>
                    <CardContent className="text-center py-12">
                        <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No Backtest Results</h3>
                        <p className="text-gray-400 mb-4">Run a backtest to see performance metrics and analysis</p>
                        <Button onClick={() => onRunBacktest && onRunBacktest(symbol)}>
                            <Play className="mr-2 h-4 w-4" />
                            Run First Backtest
                        </Button>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="space-y-4">
                {results.map((result) => (
                    <Card key={result.result_id} className={`hover:bg-gray-800/50 transition-colors ${selectedResult?.result_id === result.result_id ? 'ring-2 ring-blue-500/50' : ''}`}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h4 className="font-semibold text-white">{result.symbol} - {result.strategy}</h4>
                                        <div className="text-sm text-gray-400">{result.period}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="outline">{result.metrics?.total_trades || 0} trades</Badge>
                                        <Badge variant="outline">{result.metrics?.win_rate?.toFixed(1) || 0}% win rate</Badge>
                                        <Badge variant="outline">{result.metrics?.total_return_percent?.toFixed(2) || 0}% return</Badge>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedResult(result)}
                                        className="text-blue-400 hover:text-blue-300"
                                    >
                                        <Eye size={16} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => exportResults('json')}
                                        className="text-green-400 hover:text-green-300"
                                    >
                                        <Download size={16} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteResult(result.result_id)}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                <div className="p-2 bg-gray-800/50 rounded">
                                    <div className="text-gray-400">Total Return</div>
                                    <div className="font-bold text-green-400">{result.metrics?.total_return_percent?.toFixed(2)}%</div>
                                </div>
                                <div className="p-2 bg-gray-800/50 rounded">
                                    <div className="text-gray-400">Sharpe Ratio</div>
                                    <div className="font-bold text-blue-400">{result.metrics?.sharpe_ratio?.toFixed(2)}</div>
                                </div>
                                <div className="p-2 bg-gray-800/50 rounded">
                                    <div className="text-gray-400">Max Drawdown</div>
                                    <div className="font-bold text-red-400">{result.metrics?.max_drawdown_percent?.toFixed(1)}%</div>
                                </div>
                                <div className="p-2 bg-gray-800/50 rounded">
                                    <div className="text-gray-400">Profit Factor</div>
                                    <div className="font-bold text-purple-400">{result.metrics?.profit_factor?.toFixed(2)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Backtest Summary</h1>
                    <p className="text-gray-400">Historical strategy performance analysis for {symbol}</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => onRunBacktest && onRunBacktest(symbol)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                    >
                        <Play className="mr-2 h-4 w-4" />
                        Run New Backtest
                    </Button>
                    <Button variant="outline" onClick={() => loadResults()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Results
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="results" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="results">Results</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="charts">Charts</TabsTrigger>
                    <TabsTrigger value="trades">Trades</TabsTrigger>
                </TabsList>

                {/* Results Tab */}
                <TabsContent value="results">
                    <ResultsList />
                </TabsContent>

                {/* Metrics Tab */}
                <TabsContent value="metrics">
                    {selectedResult ? (
                        <PerformanceMetrics metrics={selectedResult.metrics} />
                    ) : (
                        <Card>
                            <CardContent className="text-center py-12">
                                <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-lg font-semibold text-white mb-2">No Metrics Available</h3>
                                <p className="text-gray-400">Select a backtest result to view detailed metrics</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Charts Tab */}
                <TabsContent value="charts">
                    {selectedResult ? (
                        <EquityCurveChart equityCurve={selectedResult.equity_curve} />
                    ) : (
                        <Card>
                            <CardContent className="text-center py-12">
                                <LineChartIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-lg font-semibold text-white mb-2">No Charts Available</h3>
                                <p className="text-gray-400">Select a backtest result to view performance charts</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Trades Tab */}
                <TabsContent value="trades">
                    {selectedResult ? (
                        <TradeAnalysis trades={selectedResult.trades} />
                    ) : (
                        <Card>
                            <CardContent className="text-center py-12">
                                <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-lg font-semibold text-white mb-2">No Trade Data</h3>
                                <p className="text-gray-400">Select a backtest result to view detailed trade analysis</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default BacktestSummary;