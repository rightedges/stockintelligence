import React, { useState } from 'react';
import { Plus, Trash2, Zap, Star, TrendingUp, Search } from 'lucide-react';

const Watchlist = ({
    stocks,
    selectedSymbol,
    onSelect,
    onAdd,
    onDelete,
    onToggleWatch,
    isScanning,
    onScan
}) => {
    const [newItem, setNewItem] = useState('');
    const [filter, setFilter] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newItem) {
            onAdd(newItem);
            setNewItem('');
        }
    };

    const filteredStocks = stocks.filter(s =>
        s.symbol.includes(filter.toUpperCase()) ||
        (s.name && s.name.toLowerCase().includes(filter.toLowerCase()))
    );

    return (
        <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
            {/* Header */}
            <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                <span className="font-bold text-sm text-gray-400 uppercase tracking-wider">Watchlist</span>
                <button
                    onClick={onScan}
                    disabled={isScanning}
                    className={`p-1.5 rounded transition-all ${isScanning ? 'text-purple-400 animate-pulse' : 'text-gray-500 hover:text-purple-400 hover:bg-gray-800'}`}
                    title="Scan Market"
                >
                    <Zap size={16} />
                </button>
            </div>

            {/* Add & Filter */}
            <div className="p-2 space-y-2 border-b border-gray-800">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        className="bg-gray-800 text-white px-2 py-1.5 rounded w-full border border-gray-700 focus:border-blue-500 outline-none text-xs uppercase placeholder-gray-600"
                        placeholder="ADD SYMBOL"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                    />
                    <button type="submit" className="bg-gray-800 hover:bg-blue-600 border border-gray-700 text-gray-300 hover:text-white p-1.5 rounded transition-colors">
                        <Plus size={14} />
                    </button>
                </form>
                {stocks.length > 5 && (
                    <div className="relative">
                        <Search className="absolute left-2 top-1.5 text-gray-600" size={12} />
                        <input
                            type="text"
                            className="w-full bg-transparent border-none text-xs text-gray-400 focus:outline-none pl-6 py-1"
                            placeholder="Filter..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {filteredStocks.map((stock) => (
                    <div
                        key={stock.symbol}
                        className={`group px-3 py-2 flex justify-between items-center cursor-pointer border-b border-gray-800/50 hover:bg-gray-800 transition-colors ${selectedSymbol === stock.symbol ? 'bg-gray-800 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'}`}
                        onClick={() => onSelect(stock.symbol)}
                    >
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${selectedSymbol === stock.symbol ? 'text-blue-400' : 'text-gray-200'}`}>{stock.symbol}</span>
                                {/* Mini Status Dots */}
                                <div className="flex gap-0.5">
                                    {stock.impulse === 'green' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]"></div>}
                                    {stock.impulse === 'red' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div>}
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-500 truncate w-24">{stock.name || 'Stock'}</span>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Badges */}
                            {stock.divergence_status && (
                                <span className={`text-[9px] px-1 rounded ${stock.divergence_status.includes('bear') ? 'text-red-400 bg-red-900/30' : 'text-green-400 bg-green-900/30'}`}>D</span>
                            )}

                            <button
                                onClick={(e) => onToggleWatch(stock.symbol, e)}
                                className={`p-1 hover:text-yellow-400 transition-colors ${stock.is_watched ? 'text-yellow-500' : 'text-gray-700'}`}
                            >
                                <Star size={12} fill={stock.is_watched ? "currentColor" : "none"} />
                            </button>
                            <button
                                onClick={(e) => onDelete(stock.symbol, e)}
                                className="text-gray-700 hover:text-red-500 p-1"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Watchlist;
