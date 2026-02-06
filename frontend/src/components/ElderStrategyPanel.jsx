import React from 'react';
import { Zap } from 'lucide-react';

const ElderStrategyPanel = ({ data, tacticalAdvice, isWeekly, f13Divergence }) => {
    const lastData = data && data.length > 0 ? data[data.length - 1] : null;

    if (!tacticalAdvice) {
        return (
            <div className="p-4 text-gray-500 text-sm text-center">
                No strategy data available.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full custom-scrollbar">

            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <Zap size={18} className="text-blue-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                    Triple Screen Strategy
                </h3>
            </div>

            {/* FORCE INDEX DIVERGENCE ALERT */}
            {(() => {
                if (f13Divergence && (!f13Divergence.expires || new Date(f13Divergence.expires) > new Date())) {
                    return (
                        <div className={`p-3 rounded-xl border flex flex-col gap-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-300 ${f13Divergence.type === 'bearish'
                            ? 'bg-orange-900/20 border-orange-500/30'
                            : 'bg-teal-900/20 border-teal-500/30'
                            }`}>
                            <div className="flex items-center gap-2">
                                <Zap size={16} className={f13Divergence.type === 'bearish' ? 'text-orange-400' : 'text-teal-400'} />
                                <h4 className={`font-black uppercase tracking-widest text-[10px] ${f13Divergence.type === 'bearish' ? 'text-orange-400' : 'text-teal-400'}`}>
                                    FORCE 13 {f13Divergence.type} DIV
                                </h4>
                            </div>
                            <p className="text-gray-300 text-xs leading-relaxed">
                                {f13Divergence.type === 'bearish'
                                    ? "Price higher, Force lower. Smart money withdrawing."
                                    : "Price lower, Force higher. Selling pressure drying."}
                            </p>
                        </div>
                    );
                }
                return null;
            })()}

            {/* SCREEN 1: THE TIDE */}
            <div className={`p-3 rounded-xl border transition-all duration-300 ${tacticalAdvice?.type === 'LONG' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="text-[9px] text-gray-500 uppercase font-black mb-1 tracking-widest flex items-center justify-between">
                    SCREEN 1: WEEKLY TIDE
                    <span className={`px-1.5 py-0.5 rounded text-[8px] ${tacticalAdvice?.type === 'LONG' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {tacticalAdvice?.type === 'LONG' ? 'RISING' : 'FALLING'}
                    </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-medium mb-2">
                    {tacticalAdvice?.type === 'LONG'
                        ? "Longs only. Look for value."
                        : "Shorts or Cash only."}
                </p>
                <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                    <div className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">Permitted</div>
                    {tacticalAdvice?.type === 'LONG'
                        ? <span className="text-xs text-green-400 font-mono">LONG / CASH</span>
                        : <span className="text-xs text-red-400 font-mono">SHORT / CASH</span>
                    }
                </div>
            </div>

            {!isWeekly && (
                <>
                    {/* SCREEN 2: THE WAVE */}
                    <div className={`p-3 rounded-xl border transition-all duration-300 ${tacticalAdvice?.screen2?.force_index_2 < 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                        <div className="text-[9px] text-gray-500 uppercase font-black mb-1 tracking-widest flex items-center justify-between">
                            SCREEN 2: DAILY WAVE
                            <span className={`px-1.5 py-0.5 rounded text-[8px] ${tacticalAdvice?.screen2?.force_index_2 < 0 ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}>
                                {tacticalAdvice?.screen2?.force_index_2 < 0 ? 'BEARS' : 'BULLS'}
                            </span>
                        </div>

                        <div className="flex flex-col gap-1 mb-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400 italic">Force (2)</span>
                                <span className={tacticalAdvice?.screen2?.force_index_2 < 0 ? 'text-blue-400 font-bold' : 'text-amber-400 font-bold'}>
                                    {tacticalAdvice?.screen2?.force_index_2?.toFixed(0) || '0'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400 italic">Will %R</span>
                                <span className={tacticalAdvice?.screen2?.williams_r < -80 ? 'text-green-400 font-bold' : tacticalAdvice?.screen2?.williams_r > -20 ? 'text-red-400 font-bold' : 'text-gray-200'}>
                                    {tacticalAdvice?.screen2?.williams_r?.toFixed(1) || '-0.0'}%
                                </span>
                            </div>
                        </div>

                        <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                            <div className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">State</div>
                            <span className={`text-xs font-mono ${tacticalAdvice?.screen2?.status === 'Oversold' ? 'text-green-400' : tacticalAdvice?.screen2?.status === 'Overbought' ? 'text-red-400' : 'text-blue-300'}`}>
                                {tacticalAdvice?.screen2?.status}
                            </span>
                        </div>
                    </div>

                    {/* SCREEN 3: EXECUTION */}
                    <div className={`p-3 rounded-xl border transition-all duration-300 ${tacticalAdvice?.style === 'success' ? 'bg-green-900/20 border-green-500/50' :
                        tacticalAdvice?.style === 'danger' ? 'bg-red-900/20 border-red-500/50' :
                            'bg-amber-900/20 border-amber-500/50'
                        }`}>
                        <div className="text-[9px] text-gray-500 uppercase font-black mb-1 tracking-widest flex items-center justify-between">
                            SCREEN 3: ACTION
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${tacticalAdvice?.style === 'success' ? 'bg-green-500 text-white' :
                                tacticalAdvice?.style === 'danger' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>
                                {tacticalAdvice?.recommendation}
                            </span>
                        </div>

                        <div className="mb-2">
                            <p className="text-xs text-gray-200 leading-normal font-bold italic mb-2 mt-1">
                                "{tacticalAdvice?.reason}"
                            </p>
                            <div className="p-2 bg-black/30 rounded-lg border border-white/5">
                                <div className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">Ripple</div>
                                <p className="text-[10px] text-blue-100 leading-snug">
                                    {tacticalAdvice?.ripple_msg}
                                </p>
                            </div>
                        </div>

                        {/* EFI Trigger */}
                        {lastData && (lastData.efi_buy_signal || lastData.efi_sell_signal) && (
                            <div className={`mt-2 p-2 rounded-lg border flex items-center gap-2 ${lastData.efi_buy_signal ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'}`}>
                                <Zap size={14} className={lastData.efi_buy_signal ? 'text-green-400' : 'text-red-400'} fill="currentColor" />
                                <div>
                                    <div className={`text-[9px] font-black uppercase tracking-widest ${lastData.efi_buy_signal ? 'text-green-400' : 'text-red-400'}`}>
                                        EFI {lastData.efi_buy_signal ? 'BUY' : 'SELL'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Execution Levels */}
                        {tacticalAdvice && (
                            <div className="grid grid-cols-2 gap-1.5 mt-2">
                                <div className="p-1.5 bg-black/40 rounded border border-white/5">
                                    <div className="text-[8px] text-gray-500 uppercase font-bold">Entry</div>
                                    <div className="text-xs font-mono font-bold text-blue-400">${tacticalAdvice.entry || 'N/A'}</div>
                                </div>
                                <div className="p-1.5 bg-black/40 rounded border border-white/5">
                                    <div className="text-[8px] text-gray-500 uppercase font-bold">Stop</div>
                                    <div className="text-xs font-mono font-bold text-red-400">${tacticalAdvice.stop || 'N/A'}</div>
                                </div>
                                <div className="p-1.5 bg-black/40 rounded border border-white/5">
                                    <div className="text-[8px] text-gray-500 uppercase font-bold">Target</div>
                                    <div className="text-xs font-mono font-bold text-green-400">${tacticalAdvice.target || 'N/A'}</div>
                                </div>
                                <div className="p-1.5 bg-black/40 rounded border border-white/5">
                                    <div className="text-[8px] text-gray-500 uppercase font-bold">R:R</div>
                                    <div className={`text-xs font-mono font-bold italic`}>
                                        {tacticalAdvice.entry && tacticalAdvice.stop && tacticalAdvice.target
                                            ? `${(Math.abs(tacticalAdvice.target - tacticalAdvice.entry) / Math.abs(tacticalAdvice.entry - tacticalAdvice.stop)).toFixed(2)}`
                                            : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ElderStrategyPanel;
