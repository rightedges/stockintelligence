import React, { useState } from 'react';
import { Search, ChevronDown, Plus, BarChart2, CandlestickChart, Settings, Clock, Camera, Star } from 'lucide-react';

const TopToolbar = ({
    symbol,
    currentView,
    setView,
    onSearch,
    stocks,
    stockPrice,
    onLogTrade,
    onNotes,
    indicatorConfigs,
    onUpdateIndicator,
    onAddIndicator,
    onRemoveIndicator,
    templates,
    activeTemplate,
    onSaveTemplate,
    onLoadTemplate,
    onDeleteTemplate,
    onSymbolChange,
    onAddToWatchlist,
    defaultTemplates,
    onSetDefaultTemplate
}) => {
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [inputSymbol, setInputSymbol] = useState(symbol || '');
    const [isInvalid, setIsInvalid] = useState(false);

    // Check if current symbol is already in watchlist
    const isInWatchlist = stocks?.some(s => s.symbol.toUpperCase() === (symbol || '').toUpperCase());

    // Sync input with symbol prop
    React.useEffect(() => {
        setInputSymbol(symbol || '');
    }, [symbol]);

    const handleSymbolSubmit = async () => {
        const normalized = inputSymbol.trim().toUpperCase();
        if (!normalized || normalized === symbol) {
            setInputSymbol(symbol || '');
            return;
        }

        try {
            // Dashboard now handles "add if missing"
            await onSymbolChange(normalized);
            setIsInvalid(false);
        } catch (err) {
            console.error("Symbol change failed:", err);
            setIsInvalid(true);
            setTimeout(() => setIsInvalid(false), 1000);
            setInputSymbol(symbol || ''); // Revert
        }
    };

    // Helper to determine active timeframe based on view
    // 'elder' = Daily, 'weekly' = Weekly
    const isDaily = currentView === 'elder';
    const isWeekly = currentView === 'weekly';

    return (
        <div className="h-[50px] bg-gray-950 border-b border-gray-800 flex items-center px-4 gap-4 select-none">
            {/* 1. Symbol Section */}
            <div className="flex items-center gap-2 border-r border-gray-800 pr-4 h-2/3">
                <div className={`flex items-center gap-2 bg-gray-900 border ${isInvalid ? 'border-red-500/50 bg-red-500/5' : 'border-gray-800'} px-2 py-1 rounded transition-all group focus-within:border-blue-500/50`}>
                    <input
                        type="text"
                        value={inputSymbol}
                        onChange={(e) => setInputSymbol(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.currentTarget.blur();
                            }
                        }}
                        onBlur={handleSymbolSubmit}
                        className="bg-transparent border-none outline-none font-black text-lg text-white tracking-tight w-20 uppercase placeholder:text-gray-700"
                        placeholder="SEARCH"
                    />
                    {!isInWatchlist && (
                        <button
                            onClick={() => onAddToWatchlist(symbol)}
                            className="text-blue-400 hover:text-white transition-colors"
                            title="Add to Watchlist"
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>

                {/* Price Placeholder (if available passed down) */}
                {stockPrice && (
                    <div className={`flex items-center gap-1 text-sm font-bold ${stockPrice.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stockPrice.current?.toFixed(2)}
                        <span className="text-[10px] opacity-80">{stockPrice.percentChange}%</span>
                    </div>
                )}
            </div>

            {/* 2. Timeframe Selector (TradingView Style) */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setView('elder')}
                    className={`px-3 py-1.5 rounded text-sm font-bold transition-all ${isDaily ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}`}
                >
                    1D
                </button>
                <button
                    onClick={() => setView('weekly')}
                    className={`px-3 py-1.5 rounded text-sm font-bold transition-all ${isWeekly ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}`}
                >
                    1W
                </button>
            </div>

            {/* Separator */}
            <div className="w-px h-1/2 bg-gray-800 mx-1" />

            {/* 3. Chart Tools (Placeholders usually) */}
            <div className="flex items-center gap-1">
                <button className="flex items-center gap-1 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-900 rounded transition-colors text-sm font-medium">
                    <CandlestickChart size={18} />
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-900 rounded transition-colors text-sm font-medium">
                    <CandlestickChart size={18} />
                </button>

                {/* Indicators Dropdown */}
                <div className="relative group z-50">
                    <button className="flex items-center gap-1 px-3 py-1.5 text-blue-400 hover:text-white hover:bg-gray-900 rounded transition-colors text-sm font-medium">
                        <span className="italic font-serif font-black">fx</span>
                        <span className="hidden sm:inline">Indicators</span>
                        <ChevronDown size={14} className="opacity-50" />
                    </button>

                    {/* Dropdown Content */}
                    <div className="absolute top-full left-0 mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 flex flex-col max-h-[80vh]">

                        {/* Scrollable Indicator List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">

                            {/* 1. Price Overlays */}
                            <div className="mb-4">
                                <div className="px-2 mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Price Overlays</div>
                                {indicatorConfigs?.overlays?.map(cfg => {
                                    const displayLabel = cfg.label.includes(`(${cfg.params?.window})`)
                                        ? cfg.label.replace(`(${cfg.params?.window})`, '').trim()
                                        : cfg.label;

                                    return (
                                        <div key={cfg.id} className="group/item px-2 py-0.5">
                                            <div className="flex items-center justify-between hover:bg-gray-800/50 rounded px-1 group/row">
                                                <label className="flex items-center gap-2 flex-1 py-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={cfg.visible}
                                                        onChange={() => onUpdateIndicator('overlays', cfg.id, { visible: !cfg.visible })}
                                                        className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0 scale-90"
                                                    />
                                                    <span className="text-xs text-gray-200 font-medium">
                                                        {displayLabel} {cfg.params?.window && `(${cfg.params.window})`}
                                                    </span>
                                                </label>
                                                <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                    {['ema', 'sma'].includes(cfg.type) && (
                                                        <div className="relative group/color">
                                                            <div
                                                                className="w-3 h-3 rounded-full cursor-pointer border border-gray-600 hover:scale-110 transition-transform"
                                                                style={{ backgroundColor: cfg.color || '#60a5fa' }}
                                                                onClick={(e) => {
                                                                    const input = e.currentTarget.nextElementSibling;
                                                                    input.click();
                                                                }}
                                                            />
                                                            <input
                                                                type="color"
                                                                className="absolute opacity-0 pointer-events-none w-0 h-0"
                                                                value={cfg.color || '#60a5fa'}
                                                                onChange={(e) => onUpdateIndicator('overlays', cfg.id, { color: e.target.value })}
                                                            />
                                                        </div>
                                                    )}
                                                    {['ema', 'sma'].includes(cfg.type) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                const val = prompt(`Enter ${cfg.type} window:`, cfg.params.window);
                                                                if (val && !isNaN(val)) onUpdateIndicator('overlays', cfg.id, { params: { ...cfg.params, window: parseInt(val) } });
                                                            }}
                                                            className="p-1 hover:text-blue-400 text-gray-500 transition-colors"
                                                        >
                                                            <Settings size={12} />
                                                        </button>
                                                    )}
                                                    {['ema', 'sma'].includes(cfg.type) && (
                                                        <button
                                                            onClick={() => onRemoveIndicator('overlays', cfg.id)}
                                                            className="p-1 hover:text-red-400 text-gray-500 transition-colors"
                                                        >
                                                            <Plus size={12} className="rotate-45" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Nested Signals for Overlays */}
                                            {cfg.type === 'guppy' && (
                                                <div className="ml-6 border-l border-gray-800 pl-2 flex flex-col gap-0.5 mt-0.5 mb-1">
                                                    {indicatorConfigs?.signals?.filter(s => s.type === 'guppySignals').map(s => (
                                                        <label key={s.id} className="flex items-center gap-2 px-1 py-1 hover:bg-gray-800/30 cursor-pointer rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={s.visible}
                                                                onChange={() => onUpdateIndicator('signals', s.id, { visible: !s.visible })}
                                                                className="rounded bg-gray-700 border-gray-600 text-blue-500 scale-75"
                                                            />
                                                            <span className="text-[10px] text-gray-400">{s.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {/* Add Custom Button */}
                                <div className="px-2 mt-1 grid grid-cols-2 gap-1">
                                    <button
                                        onClick={() => onAddIndicator('overlays', { id: `ema_${Date.now()}`, type: 'ema', params: { window: 20 }, visible: true, label: 'EMA', color: '#10b981' })}
                                        className="flex items-center gap-2 px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-800 rounded transition-colors"
                                    >
                                        <Plus size={10} /> EMA
                                    </button>
                                    <button
                                        onClick={() => onAddIndicator('overlays', { id: `sma_${Date.now()}`, type: 'sma', params: { window: 50 }, visible: true, label: 'SMA', color: '#8b5cf6' })}
                                        className="flex items-center gap-2 px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-800 rounded transition-colors"
                                    >
                                        <Plus size={10} /> SMA
                                    </button>
                                </div>
                            </div>

                            {/* 2. Technical Panes */}
                            <div className="mb-4">
                                <div className="px-2 mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Indicators</div>
                                {indicatorConfigs?.panes?.map(cfg => {
                                    const isMACD = cfg.type === 'macd';
                                    const isForce = cfg.type === 'force13';

                                    // Find relevant signals
                                    const signals = indicatorConfigs.signals.filter(s => {
                                        if (isMACD) return s.type === 'macdDivergence';
                                        if (isForce) return ['forceDivergence', 'forceMarkers', 'forceZones'].includes(s.type);
                                        return false;
                                    });

                                    return (
                                        <div key={cfg.id} className="mb-1">
                                            <div className="group/item px-2 py-0.5">
                                                <div className="flex items-center justify-between hover:bg-gray-800/50 rounded px-1 group/row">
                                                    <label className="flex items-center gap-2 flex-1 py-1 cursor-pointer font-semibold">
                                                        <input
                                                            type="checkbox"
                                                            checked={cfg.visible}
                                                            onChange={() => onUpdateIndicator('panes', cfg.id, { visible: !cfg.visible })}
                                                            className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0 scale-90"
                                                        />
                                                        <span className="text-xs text-gray-200">{cfg.label}</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Nested Signals */}
                                            {(isMACD || isForce) && signals.length > 0 && (
                                                <div className="ml-6 border-l border-gray-800 pl-2 flex flex-col gap-0.5 mt-0.5 mb-1">
                                                    {signals.map(s => (
                                                        <label key={s.id} className="flex items-center gap-2 px-1 py-1 hover:bg-gray-800/30 cursor-pointer rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={s.visible}
                                                                onChange={() => onUpdateIndicator('signals', s.id, { visible: !s.visible })}
                                                                className="rounded bg-gray-700 border-gray-600 text-blue-500 scale-75"
                                                            />
                                                            <span className="text-[10px] text-gray-400">{s.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 3. Miscellaneous Signals */}
                            <div>
                                <div className="px-2 mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Other Signals</div>
                                {indicatorConfigs?.signals?.filter(s => !['macdDivergence', 'forceDivergence', 'forceMarkers', 'forceZones', 'guppySignals'].includes(s.type)).map(cfg => (
                                    <div key={cfg.id} className="group/item px-2 py-0.5">
                                        <div className="flex items-center justify-between hover:bg-gray-800/50 rounded px-1 group/row">
                                            <label className="flex items-center gap-2 flex-1 py-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={cfg.visible}
                                                    onChange={() => onUpdateIndicator('signals', cfg.id, { visible: !cfg.visible })}
                                                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0 scale-90"
                                                />
                                                <span className="text-xs text-gray-200">{cfg.label}</span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>

                    </div>
                </div>
            </div>

            {/* Templates Dropdown */}
            <div className="relative group z-50">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                    <BarChart2 size={16} />
                    <span>Templates</span>
                    <ChevronDown size={14} className="opacity-50" />
                </button>

                <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="p-2 border-b border-gray-800 flex flex-col gap-1">
                        {activeTemplate && (
                            <button
                                onClick={() => {
                                    if (window.confirm(`Save current layout to "${activeTemplate}"?`)) onSaveTemplate(activeTemplate);
                                }}
                                className="w-full text-left px-4 py-2 text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded font-bold flex items-center justify-between group/save"
                            >
                                <div className="flex items-center gap-2">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                                    <span>Save "{activeTemplate}"</span>
                                </div>
                                <span className="text-[10px] opacity-0 group-hover/save:opacity-100 transition-opacity bg-blue-500 text-white px-1.5 py-0.5 rounded">OVERWRITE</span>
                            </button>
                        )}
                        <button
                            onClick={() => {
                                const name = prompt("Enter template name:");
                                if (name) onSaveTemplate(name);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 rounded hover:text-white flex items-center gap-2"
                        >
                            <Plus size={14} /> Save As...
                        </button>
                    </div>

                    <div className="py-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {Object.keys(templates || {}).length === 0 && (
                            <div className="px-4 py-2 text-xs text-gray-600 italic">No saved templates</div>
                        )}
                        {Object.keys(templates || {}).map(name => {
                            const isDefault = defaultTemplates?.[currentView] === name;
                            return (
                                <div key={name} className={`flex items-center justify-between px-2 hover:bg-gray-800 group/item ${activeTemplate === name ? 'bg-blue-900/10 border-l-2 border-blue-500' : ''}`}>
                                    <button
                                        onClick={() => onLoadTemplate(name)}
                                        className={`flex-1 text-left px-2 py-2 text-sm transition-colors flex items-center gap-2 ${activeTemplate === name ? 'text-blue-400 font-medium' : 'text-gray-300 hover:text-white'}`}
                                    >
                                        {name}
                                        {isDefault && <Star size={10} className="fill-yellow-500 text-yellow-500" />}
                                    </button>
                                    <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        {!isDefault && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSetDefaultTemplate(name);
                                                }}
                                                className="p-1.5 text-gray-600 hover:text-yellow-500"
                                                title={`Set as ${currentView === 'elder' ? 'Daily' : 'Weekly'} Default`}
                                            >
                                                <Star size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Overwrite template "${name}" with current layout?`)) onSaveTemplate(name);
                                            }}
                                            className="p-1.5 text-gray-600 hover:text-blue-400"
                                            title="Overwrite Template"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Delete template "${name}"?`)) onDeleteTemplate(name);
                                            }}
                                            className="p-1.5 text-gray-600 hover:text-red-400"
                                            title="Delete Template"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="w-px h-1/2 bg-gray-800 mx-1" />

            {/* 4. Right Controls */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onLogTrade}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-all shadow-lg shadow-blue-900/20"
                >
                    <Plus size={14} /> LOG TRADE
                </button>
                <button
                    onClick={onNotes}
                    className={`flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs font-bold transition-all border border-gray-700 ${currentView === 'journal' ? 'bg-gray-700 text-white' : ''}`}
                >
                    <Clock size={14} /> NOTES
                </button>
                <div className="w-px h-1/2 bg-gray-800 mx-1" />
                <button className="p-2 text-gray-500 hover:text-white hover:bg-gray-900 rounded transition-colors">
                    <Settings size={18} />
                </button>
                <button className="p-2 text-gray-500 hover:text-white hover:bg-gray-900 rounded transition-colors">
                    <Camera size={18} />
                </button>
            </div>
        </div >
    );
};

export default TopToolbar;
