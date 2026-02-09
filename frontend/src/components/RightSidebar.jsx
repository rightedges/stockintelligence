import React, { useState, useCallback, useEffect } from 'react';
import { List, Zap, BookOpen, Settings, Globe, Target } from 'lucide-react';
import Watchlist from './Watchlist';
import ElderStrategyPanel from './ElderStrategyPanel';
import MarketIntelligence from './MarketIntelligence';
import MarketScanner from './MarketScanner';

const RightSidebar = ({
    // Watchlist Props
    stocks, selectedSymbol, onSelect, onAdd, onDelete, onToggleWatch, isScanning, onScan,
    // Strategy Props
    data, tacticalAdvice, timeframeLabel, f13Divergence,
    regimeData,
    isWeekly // computed in Dashboard or passed? Dashboard passes 'view'
}) => {
    const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist', 'strategy', null (closed)
    const [width, setWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);

    // Resize Logic (Similar to ResizableSidebar but adapted for Left-side resize handle)
    const startResizing = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e) => {
        if (isResizing) {
            // New Width = Window Width - Mouse X - Toolbar Width (50px approx)
            // Actually simplier: The handle is on the left of the sidebar.
            // Width = RightEdge - MouseX.
            // RightEdge is WindowWidth.
            const newWidth = window.innerWidth - e.clientX - 50; // Allow 50px for toolbar
            if (newWidth > 200 && newWidth < 800) {
                setWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    const toggleTab = (tab) => {
        if (activeTab === tab) {
            setActiveTab(null); // Close
        } else {
            setActiveTab(tab);
        }
    };

    return (
        <div className="flex h-full bg-gray-950 border-l border-gray-800">
            {/* 1. Resizable Content Panel (Conditionally Visible) */}
            <div
                style={{ width: activeTab ? width : 0, transition: isResizing ? 'none' : 'width 0.2s ease' }}
                className={`relative flex flex-col bg-gray-900 border-r border-gray-800 overflow-hidden ${activeTab ? 'opacity-100' : 'opacity-0'}`}
            >
                {/* Drag Handle (Left side of content) */}
                {activeTab && (
                    <div
                        className={`absolute top-0 bottom-0 left-0 w-1 cursor-col-resize z-50 hover:bg-blue-500/50 transition-colors ${isResizing ? 'bg-blue-500' : 'bg-transparent'}`}
                        onMouseDown={startResizing}
                    />
                )}

                {/* Content Render */}
                <div className="flex-1 overflow-hidden h-full">
                    {activeTab === 'watchlist' && (
                        <Watchlist
                            stocks={stocks}
                            selectedSymbol={selectedSymbol}
                            onSelect={onSelect}
                            onAdd={onAdd}
                            onDelete={onDelete}
                            onToggleWatch={onToggleWatch}
                            isScanning={isScanning}
                            onScan={onScan}
                        />
                    )}
                    {activeTab === 'scanning' && (
                        <MarketScanner
                            stocks={stocks}
                            selectedSymbol={selectedSymbol}
                            onSelect={onSelect}
                            isScanning={isScanning}
                            onScan={onScan}
                        />
                    )}
                    {activeTab === 'strategy' && (
                        <ElderStrategyPanel
                            data={data}
                            tacticalAdvice={tacticalAdvice}
                            isWeekly={isWeekly}
                            f13Divergence={f13Divergence}
                        />
                    )}
                    {activeTab === 'intelligence' && (
                        <div className="h-full overflow-y-auto custom-scrollbar">
                            <MarketIntelligence regimeData={regimeData} isSidebar={true} />
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Icon Toolbar (Fixed Right) */}
            <div className="w-[50px] flex flex-col items-center py-4 gap-4 bg-gray-950 z-20">
                <button
                    onClick={() => toggleTab('watchlist')}
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'watchlist' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-blue-400 hover:bg-gray-900'}`}
                    title="Watchlist"
                >
                    <List size={22} strokeWidth={activeTab === 'watchlist' ? 2.5 : 2} />
                </button>

                <button
                    onClick={() => toggleTab('scanning')}
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'scanning' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-gray-500 hover:text-purple-400 hover:bg-gray-900'}`}
                    title="Market Scanner"
                >
                    <Target size={22} strokeWidth={activeTab === 'scanning' ? 2.5 : 2} />
                </button>

                <button
                    onClick={() => toggleTab('strategy')}
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'strategy' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'text-gray-500 hover:text-amber-400 hover:bg-gray-900'}`}
                    title="Triple Screen Strategy"
                >
                    <Zap size={22} strokeWidth={activeTab === 'strategy' ? 2.5 : 2} fill={activeTab === 'strategy' ? "currentColor" : "none"} />
                </button>

                <button
                    onClick={() => toggleTab('intelligence')}
                    className={`p-2.5 rounded-xl transition-all ${activeTab === 'intelligence' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-500 hover:text-indigo-400 hover:bg-gray-900'}`}
                    title="Market Intelligence"
                >
                    <Globe size={22} strokeWidth={activeTab === 'intelligence' ? 2.5 : 2} />
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                <button className="p-2 text-gray-600 hover:text-gray-400">
                    <Settings size={20} />
                </button>
            </div>
        </div>
    );
};

export default RightSidebar;
