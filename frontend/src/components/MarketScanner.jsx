import React from 'react';
import { Target, Zap, AlertTriangle, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

const MarketScanner = ({ stocks, selectedSymbol, onSelect, isScanning, onScan }) => {
    // Filter stocks with any signal (including candlestick patterns and confluence)
    const scannedStocks = stocks.filter(s => s.divergence_status || s.efi_status || s.setup_signal || s.candle_pattern || s.confluence_alert);

    const getSignalBadge = (stock) => {
        const badges = [];

        // HIGH-CONVICTION CONFLUENCE (Priority 1)
        if (stock.confluence_alert) {
            badges.push(
                <div key="confluence" className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-blue-500 text-white border border-blue-400 shadow-sm animate-pulse">
                    <Zap size={10} fill="currentColor" /> HIGH-CONVICTION
                </div>
            );
        }

        // Divergence signal
        if (stock.divergence_status) {
            const isBullish = stock.divergence_status.includes('bullish');
            const label = isBullish ? 'Div: Bullish' : 'Div: Bearish';
            badges.push(
                <div key="div" className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${isBullish ? 'bg-green-900/40 text-green-400 border border-green-500/30' : 'bg-red-900/40 text-red-400 border border-red-500/30'}`}>
                    <TrendingUp size={10} className={isBullish ? '' : 'rotate-180'} /> {label}
                </div>
            );
        }

        // Elder Force Index signal
        if (stock.efi_status) {
            const isBuy = stock.efi_status === 'buy';
            const label = isBuy ? 'EFI: Buy' : 'EFI: Sell';
            badges.push(
                <div key="efi" className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${isBuy ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30' : 'bg-rose-900/40 text-rose-400 border border-rose-500/30'}`}>
                    <Zap size={10} /> {label}
                </div>
            );
        }

        // Triple Screen setup signal
        if (stock.setup_signal) {
            const isBuy = stock.setup_signal.includes('buy');
            const label = isBuy ? 'Setup: Buy' : 'Setup: Sell';
            badges.push(
                <div key="setup" className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${isBuy ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30' : 'bg-indigo-900/40 text-indigo-400 border border-indigo-500/30'}`}>
                    <Target size={10} /> {label}
                </div>
            );
        }

        // Candlestick pattern (new)
        if (stock.candle_pattern) {
            const isBullish = stock.candle_pattern_type === 'bullish';
            const patternName = stock.candle_pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            badges.push(
                <div key="candle" className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${isBullish ? 'bg-amber-900/40 text-amber-400 border border-amber-500/30' : 'bg-purple-900/40 text-purple-400 border border-purple-500/30'}`}>
                    🕯️ {patternName}
                </div>
            );
        }

        return badges;
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Target className="text-purple-400" size={18} />
                    <h3 className="font-bold text-sm text-gray-200 uppercase tracking-wider">Market Scanner</h3>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full border border-gray-700">
                        {scannedStocks.length} SIGNALS
                    </span>
                    <button
                        onClick={onScan}
                        disabled={isScanning}
                        className={`p-1.5 rounded-lg border transition-all ${isScanning
                            ? 'bg-purple-900/20 border-purple-500/50 text-purple-400 animate-pulse'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-purple-400 hover:border-purple-500/50'
                            }`}
                        title="Run Market Scan"
                    >
                        <Zap size={16} fill={isScanning ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {scannedStocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2 opacity-50">
                        <AlertTriangle size={32} />
                        <span className="text-xs font-medium">No active signals detected</span>
                        <p className="text-[10px] text-center px-8">Run a scan from the Watchlist to update results.</p>
                    </div>
                ) : (
                    scannedStocks.map(stock => (
                        <div
                            key={stock.symbol}
                            onClick={() => onSelect(stock.symbol)}
                            className={`group p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${selectedSymbol === stock.symbol
                                ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-900/20'
                                : 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-black ${selectedSymbol === stock.symbol ? 'text-blue-400' : 'text-white'}`}>
                                            {stock.symbol}
                                        </span>
                                        <span className="text-[10px] text-gray-500 truncate max-w-[120px] font-medium">
                                            {stock.name}
                                        </span>
                                    </div>
                                    <div className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter mt-0.5">
                                        {stock.sector || 'NO SECTOR'}
                                    </div>
                                </div>
                                <ChevronRight size={14} className={`transition-transform group-hover:translate-x-0.5 ${selectedSymbol === stock.symbol ? 'text-blue-400' : 'text-gray-600'}`} />
                            </div>

                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {getSignalBadge(stock)}
                            </div>

                            {/* Momentum Indicator Bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-800 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${stock.impulse === 'green' ? 'bg-green-500 w-full' : stock.impulse === 'red' ? 'bg-red-500 w-full' : 'bg-blue-500 w-1/2'}`}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 border-t border-gray-800 bg-gray-950/50">
                <p className="text-[9px] text-gray-500 text-center leading-relaxed">
                    Scanner shows stocks with active <span className="text-purple-400">Divergence</span>, <span className="text-emerald-400">EFI Signals</span>, <span className="text-blue-400">Triple Screen Setups</span>, and <span className="text-amber-400">Candlestick Patterns</span>.
                </p>
            </div>
        </div>
    );
};

export default MarketScanner;
