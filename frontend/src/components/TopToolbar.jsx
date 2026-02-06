import React, { useState } from 'react';
import { Search, ChevronDown, Plus, BarChart2, CandlestickChart, Settings, Clock, Camera } from 'lucide-react';

const TopToolbar = ({ symbol, currentView, setView, onSearch, stocks, stockPrice, onLogTrade, onNotes, indicators, onToggleIndicator, templates, onSaveTemplate, onLoadTemplate, onDeleteTemplate }) => {

    // Helper to determine active timeframe based on view
    // 'elder' = Daily, 'weekly' = Weekly
    const isDaily = currentView === 'elder';
    const isWeekly = currentView === 'weekly';

    return (
        <div className="h-[50px] bg-gray-950 border-b border-gray-800 flex items-center px-4 gap-4 select-none">
            {/* 1. Symbol Section */}
            <div className="flex items-center gap-2 border-r border-gray-800 pr-4 h-2/3">
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-900 px-2 py-1 rounded transition-colors group">
                    <span className="font-black text-lg text-white tracking-tight">{symbol || 'SYMBOL'}</span>
                    {/* Placeholder for exchange/provider */}
                    <span className="text-[10px] text-gray-500 font-bold bg-gray-900 border border-gray-800 px-1 rounded group-hover:bg-gray-800">NASDAQ</span>
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
                    </button>

                    {/* Dropdown Content */}
                    <div className="absolute top-full left-0 mt-1 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 z-50">
                        <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Overlays</div>

                        <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={indicators?.showEMA}
                                onChange={() => onToggleIndicator('showEMA')}
                                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-200">EMA (13/26)</span>
                        </label>

                        <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={indicators?.showValueZones}
                                onChange={() => onToggleIndicator('showValueZones')}
                                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-200">Value Zones</span>
                        </label>

                        <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={indicators?.showSafeZones}
                                onChange={() => onToggleIndicator('showSafeZones')}
                                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-200">Safe Zones</span>
                        </label>

                        <div className="my-1 border-t border-gray-800"></div>
                        <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Analysis</div>

                        <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={indicators?.showSRLevels}
                                onChange={() => onToggleIndicator('showSRLevels')}
                                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-200">S/R Levels</span>
                        </label>

                        <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={indicators?.showDivergences}
                                onChange={() => onToggleIndicator('showDivergences')}
                                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-200">Divergences</span>
                        </label>
                        <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={indicators?.showMarkers}
                                onChange={() => onToggleIndicator('showMarkers')}
                                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-200">Signal Markers</span>
                        </label>

                        <div className="h-px bg-gray-700 my-1 mx-2"></div>
                        <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Panes</div>

                        <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={indicators?.showVolume}
                                onChange={() => onToggleIndicator('showVolume')}
                                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-200">Volume</span>
                        </label>

                        <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={indicators?.showMACD}
                                onChange={() => onToggleIndicator('showMACD')}
                                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-200">MACD (12/26/9)</span>
                        </label>

                        <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={indicators?.showForce13}
                                onChange={() => onToggleIndicator('showForce13')}
                                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-200">Force Index (13)</span>
                        </label>

                        <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={indicators?.showForce2}
                                onChange={() => onToggleIndicator('showForce2')}
                                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-200">Force Index (2)</span>
                        </label>
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
                    <div className="p-2 border-b border-gray-800">
                        <button
                            onClick={() => {
                                const name = prompt("Enter template name:");
                                if (name) onSaveTemplate(name);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-gray-800 rounded hover:text-blue-300 font-bold flex items-center gap-2"
                        >
                            <Plus size={14} /> Save Layout As...
                        </button>
                    </div>

                    <div className="py-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {Object.keys(templates || {}).length === 0 && (
                            <div className="px-4 py-2 text-xs text-gray-600 italic">No saved templates</div>
                        )}
                        {Object.keys(templates || {}).map(name => (
                            <div key={name} className="flex items-center justify-between px-2 hover:bg-gray-800 group/item">
                                <button
                                    onClick={() => onLoadTemplate(name)}
                                    className="flex-1 text-left px-2 py-2 text-sm text-gray-300 hover:text-white"
                                >
                                    {name}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Delete template "${name}"?`)) onDeleteTemplate(name);
                                    }}
                                    className="p-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                    title="Delete Template"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                </button>
                            </div>
                        ))}
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
        </div>
    );
};

export default TopToolbar;
