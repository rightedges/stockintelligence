import React, { useState } from 'react';
import {
    ShieldCheck,
    ArrowUpRight,
    Zap,
    AlertTriangle,
    CheckCircle2,
    Circle,
    Globe,
    BarChart3,
    Layers,
    Info,
    ChevronDown,
    ChevronUp,
    Gauge,
    Link
} from 'lucide-react';

const MarketRegime = ({ activeRegime }) => {
    const regimes = [
        {
            title: "Accumulation",
            key: "Accumulation",
            icon: <ShieldCheck className="text-blue-400" />,
            desc: "Low volatility, sideways movement. Smart money absorption.",
            strategy: "Switch to oscillators (RSI, Stochastic). Buy at support.",
            criteria: "EMA Convergence + Low ATR + Volume < SMA20"
        },
        {
            title: "Mark-Up",
            key: "Mark-Up",
            icon: <ArrowUpRight className="text-green-400" />,
            desc: "High volatility, directional trend. Public participation.",
            strategy: "Trend following. Buy pullbacks to EMAs (50/200).",
            criteria: "Price > EMA 50 > EMA 200 + Volume Support + RSI > 50"
        },
        {
            title: "Distribution",
            key: "Distribution",
            icon: <AlertTriangle className="text-yellow-400" />,
            desc: "High volatility, choppy sideways. Smart money selling.",
            strategy: "Switch to oscillators. Sell at resistance.",
            criteria: "EMA Convergence + High ATR + High Volume Churn"
        },
        {
            title: "Mark-Down",
            key: "Mark-Down",
            icon: <Zap className="text-red-400" />,
            desc: "High volatility, breakdown. Panic selling dominates.",
            strategy: "Risk management is priority. Short rallies or cash.",
            criteria: "Price < EMA 50 < EMA 200 + RSI < 50"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {regimes.map((r) => {
                const isActive = activeRegime?.includes(r.key);
                return (
                    <div
                        key={r.title}
                        className={`p-4 rounded-xl border transition-all duration-500 ${isActive ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/20 scale-105 z-10' : 'bg-gray-800 border-gray-700 hover:border-gray-500 opacity-60'}`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            {r.icon}
                            <h3 className="font-bold text-lg">{r.title}</h3>
                            {isActive && <div className="ml-auto bg-green-500 h-2 w-2 rounded-full animate-pulse" />}
                        </div>
                        <p className="text-sm text-gray-400 mb-2 truncate-2-lines h-10">{r.desc}</p>

                        <div className="flex flex-col gap-2 mt-4">
                            <div className="p-2 bg-gray-900/50 rounded border border-gray-800 text-[10px]">
                                <span className="text-gray-500 font-bold uppercase block mb-1">Confluence Criteria</span>
                                <code className="text-blue-300">{r.criteria}</code>
                            </div>
                            <div className="p-2 bg-gray-900 rounded border border-gray-800 text-xs">
                                <span className="text-blue-400 font-semibold">Strategy:</span> {r.strategy}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const LogicExplainer = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="mb-10 bg-gray-800/40 border border-gray-700 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Info size={18} className="text-blue-400" />
                    <span className="font-semibold text-gray-200 uppercase tracking-widest text-xs font-mono">Reliability Guide: How Confluence Works</span>
                </div>
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {isOpen && (
                <div className="p-6 border-t border-gray-700 animate-in slide-in-from-top-1 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h4 className="text-sm font-bold text-blue-400 mb-3 uppercase flex items-center gap-2">
                                <BarChart3 size={16} />
                                1. Trend (The Gear)
                            </h4>
                            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                                Base identification using <strong>EMA 50 & 200</strong>. Tells us if the machine is moving up or down.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-yellow-400 mb-3 uppercase flex items-center gap-2">
                                <Gauge size={16} />
                                2. Volatility (The Heat)
                            </h4>
                            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                                Uses <strong>ATR</strong> relative to the 30-day average. Distinguishes quiet buying from nervous distribution.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-purple-400 mb-3 uppercase flex items-center gap-2">
                                <Link size={16} />
                                3. Flow (The Fuel)
                            </h4>
                            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                                Confluences with <strong>Volume SMA</strong> and <strong>RSI Momentum</strong> to score the reliability of the trend.
                            </p>
                        </div>
                    </div>
                    <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-800 text-sm text-gray-400">
                        <span className="text-white font-bold">Reliability Score:</span>
                        <span className="ml-2 font-mono italic">High = All 3 systems align | Medium = 2 align | Low = Trend only.</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const TopDownRoutine = ({ regimeData }) => {
    const steps = [
        {
            id: 1,
            text: "Macro: Are we Risk-On or Risk-Off? (SPY Trend)",
            completed: regimeData?.macro === "Risk-On",
            details: regimeData?.macro === "Risk-On" ? "S&P 500 is trending positive (Risk-On)." : "Market overall is defensive (Risk-Off)."
        },
        {
            id: 2,
            text: `Sector: Is this stock in the leading sector? (${regimeData?.sector_analysis?.stock_sector || '...'})`,
            completed: regimeData?.sector_analysis?.is_leading,
            details: regimeData?.sector_analysis?.is_leading
                ? `Leading Sector: ${regimeData?.sector_analysis?.leading_sector}`
                : `Leading Sector is ${regimeData?.sector_analysis?.leading_sector}. Your stock is in ${regimeData?.sector_analysis?.stock_sector}.`
        },
        {
            id: 3,
            text: "Chart: Is the stock in a Mark-Up regime?",
            completed: regimeData?.regime === "Mark-Up",
            details: regimeData?.regime === "Mark-Up" ? "Technical trend is strong." : "Technical setup is not yet ideal."
        },
        {
            id: 4,
            text: "Execution: High-Confluence Entry Trigger.",
            completed: regimeData?.confidence === "High",
            details: `Confidence is ${regimeData?.confidence || 'Low'}.`
        }
    ];

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full shadow-inner">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Layers className="text-purple-400" />
                Automated Routine
            </h3>
            <div className="space-y-4">
                {steps.map((step) => (
                    <div
                        key={step.id}
                        className={`p-3 rounded-lg border transition-all duration-300 ${step.completed ? 'bg-green-900/10 border-green-800/40' : 'bg-gray-900 border border-gray-800'}`}
                    >
                        <div className="flex items-center gap-3">
                            {step.completed ? <CheckCircle2 className="text-green-500 flex-shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-700 flex-shrink-0" />}
                            <span className={`text-sm font-semibold ${step.completed ? 'text-white' : 'text-gray-400'}`}>{step.text}</span>
                        </div>
                        <div className="mt-2 ml-8 text-[10px] text-gray-500 font-mono italic">
                            {step.details}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-6 p-2 bg-purple-900/10 border border-purple-800/20 rounded text-[10px] text-purple-300/80 italic">
                Note: Steps are auto-analyzed by comparing your stock against the S&P 500 (SPY).
            </div>
        </div>
    );
};

const MacroIndicators = ({ macroData }) => {
    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full shadow-inner">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Globe className="text-blue-400" />
                The "Why" (Macro Tides)
            </h3>
            <div className="space-y-6">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="text-blue-400 font-semibold uppercase text-[10px] tracking-widest">Growth</h4>
                        {macroData?.growth && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${macroData.growth.status === 'Expanding' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {macroData.growth.status}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500 italic mb-1">"Is the economy expanding?"</p>
                    <p className="text-xs text-gray-300">{macroData?.growth?.details || "Analyze if capital is flowing into risk assets."}</p>
                </div>

                <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="text-yellow-400 font-semibold uppercase text-[10px] tracking-widest">Inflation</h4>
                        {macroData?.inflation && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${macroData.inflation.status === 'Cooling/Stable' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {macroData.inflation.status}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500 italic mb-1">"Is money losing value?"</p>
                    <p className="text-xs text-gray-300">{macroData?.inflation?.details || "Commodity prices and CPI impact sector performance."}</p>
                </div>

                <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="text-purple-400 font-semibold uppercase text-[10px] tracking-widest">Liquidity</h4>
                        {macroData?.liquidity && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${macroData.liquidity.status === 'Easing' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {macroData.liquidity.status}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500 italic mb-1">"Is the Fed printing or burning?"</p>
                    <p className="text-xs text-gray-300">{macroData?.liquidity?.details || "Interest rates are the ultimate driver of long-term bulls."}</p>
                </div>
            </div>
        </div>
    );
};

const MarketIntelligence = ({ regimeData }) => {
    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2 text-white">Market Intelligence</h2>
                    <p className="text-gray-400 text-sm max-w-2xl">
                        Fundamentals tell you the direction of the tide. Technicals tell you when to swim.
                        Multi-confluence scoring reduces the risk of indicator noise.
                    </p>
                </div>

                {regimeData && (
                    <div className="flex flex-col gap-4 max-w-sm w-full md:w-auto">
                        {regimeData.decision && (
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-xl border border-blue-400/30 animate-in slide-in-from-right-4 duration-700">
                                <div className="text-[10px] uppercase font-black text-blue-100 mb-1 tracking-[0.2em]">Final Decision</div>
                                <div className="text-lg font-bold text-white leading-tight">
                                    {regimeData.decision}
                                </div>
                            </div>
                        )}

                        <div className="bg-blue-600/20 border border-blue-500 p-5 rounded-2xl shadow-lg shadow-blue-500/10">
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-xs uppercase font-bold text-blue-400">Current Phase</div>
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${regimeData.confidence === 'High' ? 'bg-green-500 text-white' :
                                    regimeData.confidence === 'Medium' ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
                                    }`}>
                                    {regimeData.confidence} Reliability
                                </div>
                            </div>
                            <div className="text-xl font-bold text-white mb-1 leading-none">{regimeData.regime}</div>
                            <p className="text-xs text-gray-300 mb-3">{regimeData.reason}</p>

                            <div className="flex gap-2 items-center">
                                <div className="px-2 py-1 rounded bg-gray-900 border border-gray-800 text-[10px] font-mono text-gray-400">
                                    Vol: {regimeData.volatility}
                                </div>
                                <div className="px-2 py-1 rounded bg-gray-900 border border-gray-800 text-[10px] font-mono text-gray-400">
                                    Confluence: {regimeData.confluence}/3
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <section className="mb-10">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-lg font-semibold text-gray-300 uppercase tracking-widest text-xs font-mono">1. Phase Identification</h3>
                </div>
                <MarketRegime activeRegime={regimeData?.regime} />
            </section>

            <LogicExplainer />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                <section className="flex flex-col gap-8">
                    <h3 className="text-lg font-semibold mb-4 text-gray-300 uppercase tracking-widest text-xs font-mono">2. Strategy & Decision</h3>

                    {regimeData?.decision && (
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-6 rounded-2xl shadow-xl border border-blue-400/30 animate-in zoom-in-95 duration-700">
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldCheck className="text-blue-200" size={24} />
                                <div className="text-xs uppercase font-black text-blue-100 tracking-[0.2em]">High-Conviction Decision</div>
                            </div>
                            <div className="text-2xl font-bold text-white leading-tight mb-2">
                                {regimeData.decision}
                            </div>
                            <div className="h-1 w-20 bg-blue-400/50 rounded-full" />
                        </div>
                    )}

                    {regimeData?.suggestion && (
                        <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap size={80} className="text-purple-400" />
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <Zap className="text-purple-400" size={20} />
                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Macro Strategic Playbook</h3>
                            </div>
                            <div className="text-xl font-bold text-purple-300 mb-1">{regimeData.suggestion.title}</div>
                            <p className="text-sm text-gray-300 mb-4 pr-12">{regimeData.suggestion.action}</p>
                            <div className="flex flex-wrap gap-2">
                                {regimeData.suggestion.focus.split(', ').map(sector => (
                                    <span key={sector} className="px-2 py-1 bg-purple-900/40 border border-purple-700/30 rounded-md text-[10px] uppercase font-bold text-purple-200">
                                        {sector}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <section className="flex flex-col gap-8">
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-300 uppercase tracking-widest text-xs font-mono">3. Automated Routine</h3>
                        <TopDownRoutine regimeData={regimeData} />
                    </div>
                </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                <section>
                    <h3 className="text-lg font-semibold mb-4 text-gray-300 uppercase tracking-widest text-xs font-mono">4. Macro Tides</h3>
                    <MacroIndicators macroData={regimeData?.macro_tides} />
                </section>

                <section className="flex flex-col justify-end">
                    <div className="bg-blue-600/10 border border-blue-500/30 p-6 rounded-2xl h-full flex flex-col justify-center">
                        <h3 className="font-bold flex items-center gap-2 mb-4 text-white text-lg">
                            <BarChart3 className="text-blue-400" />
                            Market Logic Pivot
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">Technician Approach</div>
                                <p className="text-xs border-l-2 border-red-500 pl-4 py-2 bg-red-900/5 rounded-r text-gray-400 italic">
                                    "I'm buying the breakout because the RSI is oversold and the MACD crossed." (Ignoring the macro distribution and sector rotation).
                                </p>
                            </div>
                            <div>
                                <div className="text-[10px] text-blue-400 uppercase font-bold mb-2 tracking-widest">Market Logic Approach</div>
                                <p className="text-xs border-l-2 border-blue-500 pl-4 py-2 bg-blue-900/5 rounded-r text-gray-200 italic">
                                    "I'm buying because Macro identifies a Goldilocks zone, the Sector is leading the S&P 500, and a Mark-Up regime provides the entry trigger."
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default MarketIntelligence;
