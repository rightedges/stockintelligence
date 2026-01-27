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
    Link,
    HelpCircle,
    X,
    Play,
    Navigation
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

const DashboardTour = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);

    if (!isOpen) return null;

    const steps = [
        {
            title: "Welcome to Market Intelligence",
            desc: "This dashboard aligns individual technicals with broad macro tides. Never fight the tape, but never ignore the tide.",
            target: "header"
        },
        {
            title: "01. Market Context",
            desc: "First, we check the ocean conditions. Are we in a 'Risk-On' expansion or a 'Risk-Off' contraction? This dictates our exposure.",
            target: "tour-context"
        },
        {
            title: "02. Macro Strategy",
            desc: "Based on the Macro Regime, this is your high-level strategy. Should you be buying Tech, shorting Energy, or sitting in Cash?",
            target: "tour-strategy"
        },
        {
            title: "03. Sector Leadership",
            desc: "We verify if the stock is in a leading sector. Strength in the sector provides a powerful tailwind for individual stocks.",
            target: "tour-leadership"
        },
        {
            title: "04. Phase Identification",
            desc: "Next, we locate the stock's phase. Is it Accumulating (Buying), Marking Up (Holding), or Distributing (Selling)? Use 'Confluence Logic' to verify.",
            target: "tour-phase"
        },
        {
            title: "05. Automated Routine",
            desc: "An automated checklist comparing your stock against the S&P 500. All green lights? You're clear for takeoff.",
            target: "tour-routine"
        },
        {
            title: "06. Final Decision",
            desc: "The final verdict. We combine all data into a single 'Go/No-Go' recommendation with a confidence reliability score.",
            target: "tour-decision"
        }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            const el = document.getElementById(steps[nextStep].target);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            onClose();
            setCurrentStep(0);
        }
    };

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500" />

            <div className="bg-gray-900 border border-blue-500/50 p-8 rounded-3xl shadow-2xl relative z-10 max-w-lg w-full pointer-events-auto animate-in fade-in slide-in-from-bottom-8 duration-300">
                <div className="flex items-center gap-4 mb-6">
                    <div className="bg-blue-600/20 p-3 rounded-2xl">
                        <Navigation className="text-blue-400" size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white italic tracking-tight">{step.title}</h3>
                        <div className="flex gap-1 mt-2">
                            {steps.map((_, i) => (
                                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-gray-700'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed mb-8 min-h-[60px]">
                    {step.desc}
                </p>

                <div className="flex justify-between items-center">
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                    >
                        Skip Tour
                    </button>
                    <button
                        onClick={handleNext}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
                    >
                        {currentStep === steps.length - 1 ? 'Finish Exploration' : 'Next Step'}
                        <ArrowUpRight size={16} />
                    </button>
                </div>
            </div>
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

const SectorPerformance = ({ sectorAnalysis }) => {
    if (!sectorAnalysis?.sector_performance) return null;

    const performanceData = Object.entries(sectorAnalysis.sector_performance)
        .sort(([, a], [, b]) => b - a);

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full shadow-inner">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="text-green-400" />
                Sector Leadership (1M)
            </h3>
            <div className="space-y-3">
                {performanceData.map(([sector, performance]) => {
                    const isStockSector = sector === sectorAnalysis.stock_sector;
                    const perfPercent = (performance * 100).toFixed(2);
                    const isPositive = performance >= 0;

                    return (
                        <div key={sector} className={`relative flex flex-col gap-1 ${isStockSector ? 'z-10' : ''}`}>
                            <div className="flex justify-between items-center text-[10px] mb-1">
                                <span className={`font-bold ${isStockSector ? 'text-blue-400 flex items-center gap-1' : 'text-gray-400'}`}>
                                    {isStockSector && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />}
                                    {sector}
                                </span>
                                <span className={`font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                    {isPositive ? '+' : ''}{perfPercent}%
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden flex">
                                {isPositive ? (
                                    <>
                                        <div className="w-1/2" />
                                        <div
                                            className={`h-full ${isStockSector ? 'bg-blue-500' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(Math.abs(performance) * 100, 50)}%` }}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <div className="w-1/2 flex justify-end">
                                            <div
                                                className={`h-full ${isStockSector ? 'bg-blue-500' : 'bg-red-500'}`}
                                                style={{ width: `${Math.min(Math.abs(performance) * 100, 50)}%` }}
                                            />
                                        </div>
                                        <div className="w-1/2" />
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const MacroLogicGuide = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const regimes = [
        { title: "Goldilocks Zone", conditions: "Growth Up + Liquidity Up", focus: "Tech, Growth, Discretionary", color: "text-green-400" },
        { title: "Early Cycle Recovery", conditions: "Growth Down + Liquidity Up", focus: "Small Caps, Financials", color: "text-blue-400" },
        { title: "Late Cycle Expansion", conditions: "Growth Up + Liquidity Down", focus: "Financials, Energy, Industrials", color: "text-yellow-400" },
        { title: "Stagflation Risk", conditions: "Growth Down + Inflation Up", focus: "Energy, Staples, Gold", color: "text-red-400" },
        { title: "Deflationary Pressure", conditions: "Growth Down + Liquidity Down", focus: "Cash, Healthcare, Quality", color: "text-gray-400" },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                    <X size={24} />
                </button>

                <div className="p-8 md:p-12">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="bg-purple-600/20 p-3 rounded-2xl">
                            <Zap className="text-purple-400" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Macro Strategy Logic</h2>
                            <p className="text-gray-400 text-sm italic">How the "Strategic Playbook" calculates its recommendations.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {[
                            { title: "Growth (XLI)", logic: "Price > EMA 50", desc: "Monitors economic expansion through Industrial activity.", color: "blue-400" },
                            { title: "Inflation (TIP)", logic: "Price < EMA 50", desc: "Falling TIP bonds indicate rising inflation expectations.", color: "yellow-400" },
                            { title: "Liquidity (TNX)", logic: "Price < EMA 50", desc: "Falling Treasury Yields indicate easing policy.", color: "purple-400" }
                        ].map(pillar => {
                            const colorClass = pillar.color === 'blue-400' ? 'text-blue-400' :
                                pillar.color === 'yellow-400' ? 'text-yellow-400' :
                                    'text-purple-400';
                            return (
                                <div key={pillar.title} className="bg-gray-800/50 border border-gray-700 p-5 rounded-2xl">
                                    <h4 className={`text-sm font-bold ${colorClass} mb-1`}>{pillar.title}</h4>
                                    <div className="text-[10px] font-mono text-gray-400 mb-3 uppercase tracking-tighter">Logic: {pillar.logic}</div>
                                    <p className="text-xs text-gray-300 leading-relaxed">{pillar.desc}</p>
                                </div>
                            );
                        })}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Layers size={20} className="text-blue-400" />
                        The Macro Regime Matrix
                    </h3>
                    <div className="overflow-hidden rounded-2xl border border-gray-800">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-800/80">
                                    <th className="p-4 font-bold text-gray-300">Regime</th>
                                    <th className="p-4 font-bold text-gray-300">Conditions</th>
                                    <th className="p-4 font-bold text-gray-300">Market Focus</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {regimes.map(r => (
                                    <tr key={r.title} className="hover:bg-gray-800/30 transition-colors">
                                        <td className={`p-4 font-bold ${r.color}`}>{r.title}</td>
                                        <td className="p-4 text-gray-400 font-mono text-xs">{r.conditions}</td>
                                        <td className="p-4 text-gray-300 italic text-xs">{r.focus}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-12 p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
                        <p className="text-sm text-gray-300 leading-relaxed italic">
                            "Techno-Fundamental analysis is about finding where individual technical trends align with broad macro tides. Never fight the tape, but never ignore the tide."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ConfluenceGuide = ({ isOpen, onClose, regimeData }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                    <X size={24} />
                </button>

                <div className="p-8 md:p-12">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600/20 p-3 rounded-2xl">
                                <Layers className="text-blue-400" size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Confluence Logic</h2>
                                <p className="text-gray-400 text-sm italic">Why is the market in a <span className="text-white font-bold">{regimeData?.regime}</span> regime?</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                            <span className="text-xs font-bold text-gray-500 uppercase">Score</span>
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`w-3 h-1.5 rounded-full ${i <= (regimeData?.confluence || 0) ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-700'}`} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className={`p-6 bg-gray-800/40 rounded-2xl border ${regimeData?.confluence_details?.trend ? 'border-blue-500/30' : 'border-gray-700'} transition-all`}>
                            <h4 className={`text-sm font-black mb-4 uppercase flex items-center gap-2 ${regimeData?.confluence_details?.trend ? 'text-blue-400' : 'text-gray-500'}`}>
                                <BarChart3 size={18} />
                                1. Trend (The Gear)
                                {regimeData?.confluence_details?.trend && <CheckCircle2 size={16} className="ml-auto" />}
                            </h4>
                            <p className="text-sm text-gray-300 leading-relaxed mb-4">
                                Base identification using <strong className="text-white">EMA 50 & 200</strong>. Tells us if the machine is moving up or down.
                            </p>
                            <div className="text-[10px] uppercase font-mono text-gray-500">{regimeData?.confluence_details?.trend ? "Condition Met" : "Condition Failed"}</div>
                        </div>

                        <div className={`p-6 bg-gray-800/40 rounded-2xl border ${regimeData?.confluence_details?.momentum ? 'border-yellow-500/30' : 'border-gray-700'} transition-all`}>
                            <h4 className={`text-sm font-black mb-4 uppercase flex items-center gap-2 ${regimeData?.confluence_details?.momentum ? 'text-yellow-400' : 'text-gray-500'}`}>
                                <Gauge size={18} />
                                2. Momentum (The Heat)
                                {regimeData?.confluence_details?.momentum && <CheckCircle2 size={16} className="ml-auto" />}
                            </h4>
                            <p className="text-sm text-gray-300 leading-relaxed mb-4">
                                Uses <strong className="text-white">RSI Relative Strength</strong> to distinguish quiet absorption from nervous retail churn.
                            </p>
                            <div className="text-[10px] uppercase font-mono text-gray-500">{regimeData?.confluence_details?.momentum ? "Condition Met" : "Condition Failed"}</div>
                        </div>

                        <div className={`p-6 bg-gray-800/40 rounded-2xl border ${regimeData?.confluence_details?.flow ? 'border-purple-500/30' : 'border-gray-700'} transition-all`}>
                            <h4 className={`text-sm font-black mb-4 uppercase flex items-center gap-2 ${regimeData?.confluence_details?.flow ? 'text-purple-400' : 'text-gray-500'}`}>
                                <Link size={18} />
                                3. Flow (The Fuel)
                                {regimeData?.confluence_details?.flow && <CheckCircle2 size={16} className="ml-auto" />}
                            </h4>
                            <p className="text-sm text-gray-300 leading-relaxed mb-4">
                                Verified via <strong className="text-white">Volume SMAs</strong>. High flow confirms institutional commitment to the current phase.
                            </p>
                            <div className="text-[10px] uppercase font-mono text-gray-500">{regimeData?.confluence_details?.flow ? "Condition Met" : "Condition Failed"}</div>
                        </div>
                    </div>

                    <div className="mt-12 p-6 bg-gray-800/50 border border-gray-700 rounded-2xl">
                        <div className="flex items-start gap-4">
                            <Info className="text-blue-400 flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="text-sm font-bold text-white mb-1">Why Confluence Matters</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    A high reliability score (3/3) indicates that Price, Volume, and Momentum are all telling the same story. This significantly increases the probability of the trend continuing. Low scores (1/3) suggest the move may be a false breakout or a trap.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MarketIntelligence = ({ regimeData }) => {
    const [showGuide, setShowGuide] = useState(false);
    const [showConfluence, setShowConfluence] = useState(false);
    const [showTour, setShowTour] = useState(false);
    const [showLogic, setShowLogic] = useState(true);

    return (
        <div className="animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
            <MacroLogicGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <ConfluenceGuide isOpen={showConfluence} onClose={() => setShowConfluence(false)} regimeData={regimeData} />
            <DashboardTour isOpen={showTour} onClose={() => setShowTour(false)} />

            <div id="header" className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-800 pb-8">
                <div className="flex-1">
                    <h2 className="text-3xl font-black mb-2 text-white italic tracking-tighter">MARKET INTELLIGENCE</h2>
                    <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
                        Fundamentals determine the tide; technicals dictate the swim. We synthesize **Macro Tides, Regime Analysis, and Strategic Routines** to filter noise and isolate high-probability opportunities.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowTour(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20"
                    >
                        <Play size={14} fill="currentColor" /> START TOUR
                    </button>
                </div>
            </div>

            {/* ROW 1: CONTEXT & STRATEGY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* SECTION 1: MARKET CONTEXT */}
                <section id="tour-context">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest text-[10px] font-mono">01. Market Context</h3>
                    </div>
                    <MacroIndicators macroData={regimeData?.macro_tides} />
                </section>

                {/* SECTION 2: MACRO STRATEGY */}
                <section id="tour-strategy">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-purple-500 rounded-full" />
                            <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest text-[10px] font-mono">02. Macro Strategy</h3>
                        </div>
                        <button
                            onClick={() => setShowGuide(true)}
                            className="flex items-center gap-2 px-3 py-1 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-300 text-[10px] font-bold transition-all"
                        >
                            <Zap size={14} /> LOGIC
                        </button>
                    </div>

                    {regimeData?.suggestion && (
                        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-6 rounded-2xl shadow-xl relative overflow-hidden group h-[280px] flex flex-col justify-center">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                <Zap size={80} className="text-purple-400" />
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-purple-500/20 rounded-lg">
                                    <Zap className="text-purple-400" size={20} />
                                </div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Strategic Playbook</h3>
                            </div>
                            <div className="text-xl font-black text-purple-300 mb-1 tracking-tighter italic">{regimeData.suggestion.title}</div>
                            <p className="text-xs text-gray-300 mb-6 pr-8 leading-relaxed line-clamp-3">{regimeData.suggestion.action}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {regimeData.suggestion.focus.split(', ').map(sector => (
                                    <span key={sector} className="px-2 py-1 bg-purple-900/40 border border-purple-700/30 rounded-lg text-[9px] uppercase font-black text-purple-200 tracking-widest">
                                        {sector}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {/* ROW 2: LEADERSHIP & PHASE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* SECTION 3: SECTOR LEADERSHIP */}
                <section id="tour-leadership">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <div className="w-1 h-4 bg-green-500 rounded-full" />
                        <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest text-[10px] font-mono">03. Sector Leadership</h3>
                    </div>
                    <SectorPerformance sectorAnalysis={regimeData?.sector_analysis} />
                </section>

                {/* SECTION 4: PHASE IDENTIFICATION */}
                <section id="tour-phase">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-blue-500 rounded-full" />
                            <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest text-[10px] font-mono">04. Phase</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {regimeData?.confluence !== undefined && (
                                <div className={`px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-widest ${regimeData.confidence === 'High' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                                    regimeData.confidence === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                                        'bg-red-500/10 border-red-500/30 text-red-400'
                                    }`}>
                                    {regimeData.confluence}/3 Score
                                </div>
                            )}
                            <button
                                onClick={() => setShowConfluence(true)}
                                className="flex items-center gap-2 px-2 py-1 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 text-[9px] font-bold transition-all"
                            >
                                <Layers size={10} /> DETAILS
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 h-[280px]">
                        {["Accumulation", "Mark-Up", "Distribution", "Mark-Down"].map(regime => {
                            const r = [
                                { key: "Accumulation", icon: <ShieldCheck size={14} className="text-blue-400" /> },
                                { key: "Mark-Up", icon: <ArrowUpRight size={14} className="text-green-400" /> },
                                { key: "Distribution", icon: <AlertTriangle size={14} className="text-yellow-400" /> },
                                { key: "Mark-Down", icon: <Zap size={14} className="text-red-400" /> }
                            ].find(f => f.key === regime);
                            const isActive = regimeData?.regime?.includes(regime);
                            const info = [
                                { key: "Accumulation", strategy: "Buy at support; use oscillators." },
                                { key: "Mark-Up", strategy: "Trend follow; buy EMA pullbacks." },
                                { key: "Distribution", strategy: "Sell at resistance; use oscillators." },
                                { key: "Mark-Down", strategy: "Risk management; short rallies or cash." }
                            ].find(f => f.key === regime);

                            return (
                                <div key={regime} className={`p-3 rounded-xl border flex flex-col justify-center transition-all ${isActive ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500/20' : 'bg-gray-800 border-gray-700 opacity-50'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        {r.icon}
                                        <span className="text-xs font-bold">{regime}</span>
                                    </div>
                                    {isActive ? (
                                        <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-500">
                                            <div className="text-[9px] text-blue-400 font-bold uppercase mb-1 tracking-tight">Active Strategy</div>
                                            <div className="text-[10px] text-gray-200 leading-tight font-medium italic">{info.strategy}</div>
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-gray-500 truncate">Inactive Phase</div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </section>
            </div>

            {/* ROW 3: ROUTINE (Full Width but compact) */}
            <section id="tour-routine" className="mb-8">
                <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="w-1 h-4 bg-yellow-500 rounded-full" />
                    <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest text-[10px] font-mono">05. Automated Routine</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-800/30 p-4 rounded-2xl border border-gray-700">
                    <TopDownRoutine regimeData={regimeData} />
                    <div className="flex flex-col justify-center p-4 bg-gray-900/40 rounded-xl border border-gray-800 text-[11px] text-gray-400 leading-relaxed italic">
                        "Fundamentals determine the tide; technicals dictate the swim. This routine ensures your individual trades are backed by institutional currents."
                    </div>
                </div>
            </section>

            {/* SECTION 6: FINAL DECISION */}
            <section id="tour-decision" className="mb-12">
                <div className="flex items-center gap-2 mb-6 px-1">
                    <div className="w-1 h-4 bg-red-500 rounded-full" />
                    <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest text-[10px] font-mono">06. Final Synthesis & Decision</h3>
                </div>
                {regimeData && (
                    <div className="bg-gradient-to-br from-blue-900/20 to-gray-900 border border-blue-500/30 rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl -mr-32 -mt-32" />

                        <div className="flex flex-col xl:flex-row gap-10 items-center xl:items-stretch relative z-10">
                            {/* Decision Box */}
                            <div className="w-full xl:w-2/5 bg-gradient-to-br from-blue-600 to-indigo-800 p-10 rounded-[2rem] shadow-2xl flex flex-col justify-center border border-blue-400/30 transform hover:scale-[1.02] transition-transform duration-500">
                                <div className="text-[10px] uppercase font-black text-blue-100 mb-6 tracking-[0.4em] flex items-center gap-2 opacity-80">
                                    <ShieldCheck size={16} /> FINAL RECOMMENDATION
                                </div>
                                <div className="text-4xl font-black text-white mb-6 leading-tight tracking-tighter italic uppercase">
                                    {regimeData.decision}
                                </div>
                                <div className="h-1.5 w-32 bg-white/20 rounded-full" />
                            </div>

                            {/* Details Box */}
                            <div className="flex-1 flex flex-col justify-between py-2">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 bg-gray-900/60 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
                                        <div className="text-[10px] text-gray-500 uppercase font-black mb-2 tracking-widest">Active Regime</div>
                                        <div className="text-xl font-black text-white italic">{regimeData.regime}</div>
                                    </div>
                                    <div className="p-6 bg-gray-900/60 rounded-2xl border border-gray-700/50 text-right backdrop-blur-sm">
                                        <div className="text-[10px] text-gray-500 uppercase font-black mb-2 tracking-widest">Confidence Score</div>
                                        <div className={`text-xl font-black italic ${regimeData.confidence === 'High' ? 'text-green-400' : regimeData.confidence === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {regimeData.confluence}/3 Confluences
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl shadow-inner">
                                    <div className="text-[10px] text-blue-400 uppercase font-black mb-3 tracking-widest">Techno-Fundamental Synthesis</div>
                                    <p className="text-lg text-gray-200 italic leading-relaxed font-serif">
                                        "{regimeData.reason}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default MarketIntelligence;
