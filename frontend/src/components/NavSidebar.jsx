import React from 'react';
import { Notebook, Zap, Settings, Layers } from 'lucide-react';

const NavItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full p-3 flex justify-center items-center relative group transition-all duration-200 ${active ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
        title={label}
    >
        <Icon size={22} strokeWidth={active ? 2.5 : 2} />
        {active && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-r shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
        )}

        {/* Tooltip */}
        <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded border border-gray-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-xl">
            {label}
        </div>
    </button>
);

const NavSidebar = ({ currentView, setView }) => {
    return (
        <div className="w-14 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-4 h-full z-40">
            <div className="mb-6 text-blue-500">
                <Layers size={24} />
            </div>

            <div className="flex-1 space-y-2 w-full">
                <NavItem
                    icon={Zap}
                    label="Backtest"
                    active={currentView === 'backtest'}
                    onClick={() => setView('backtest')}
                />
                <NavItem
                    icon={Notebook}
                    label="Trade Journal"
                    active={currentView === 'journal'}
                    onClick={() => setView('journal')}
                />
            </div>

            <div className="space-y-2 w-full pt-4 border-t border-gray-800">
                <NavItem icon={Settings} label="Settings" onClick={() => { }} />
            </div>
        </div>
    );
};

export default NavSidebar;
