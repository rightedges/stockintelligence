import React, { useState } from 'react';
import { logTrade, updateTrade } from '../services/api';
import { ShieldCheck } from 'lucide-react'; // Fixed import

const TradeEntryModal = ({ onClose, onSave, snapshot, initialData = {} }) => {
    const [formData, setFormData] = useState({
        account: 'Main', source: 'Homework', symbol: '', quantity: '', direction: 'Long',
        strategy_name: 'Elder Impulse', entry_reason: '',
        entry_date: new Date().toISOString().split('T')[0], entry_price: '', entry_order_type: 'Market', entry_order_price: '',
        entry_day_high: '', entry_day_low: '',
        upper_channel: '', lower_channel: '',
        exit_date: '', exit_price: '',
        stop_loss: '', // Added Stop Loss field
        ...initialData
    });

    const [riskParams, setRiskParams] = useState({
        equity: 100000,
        riskPercent: 2
    });

    // Auto-Calculate Quantity based on Risk
    React.useEffect(() => {
        if (!formData.entry_price || !formData.stop_loss || !riskParams.equity) return;

        const entry = parseFloat(formData.entry_price);
        const stop = parseFloat(formData.stop_loss);
        const riskPerShare = Math.abs(entry - stop);

        if (riskPerShare <= 0) return;

        const maxRiskDollars = riskParams.equity * (riskParams.riskPercent / 100);
        const maxQty = Math.floor(maxRiskDollars / riskPerShare);

        // Update quantity if it hasn't been manually overriden recently?
        // For now, let's just allow the user to click a "Apply" button or auto-suggest next to the input.
        // Or cleaner: Just show the suggestion and let them click it.
    }, [formData.entry_price, formData.stop_loss, riskParams]);

    // If modal opened with a snapshot prop (from "Close Trade"), and we are editing an existing trade (initialData.id),
    // then this snapshot is an EXIT snapshot. Otherwise, it's an ENTRY snapshot.
    // If we already have an entry snapshot in initialData, preserve it.
    const currentEntrySnapshot = initialData.snapshot || (!initialData.id ? snapshot : null);
    const currentExitSnapshot = initialData.exit_snapshot || (initialData.id ? snapshot : null);

    const calculateGrades = (data) => {
        let entryGrade = '';
        const h = parseFloat(data.entry_day_high);
        const l = parseFloat(data.entry_day_low);
        const e = parseFloat(data.entry_price);

        // Entry Grade (Position in Daily Range)
        if (!isNaN(h) && !isNaN(l) && !isNaN(e)) {
            const range = h - l;
            if (range > 0) {
                let score = 0;
                if (data.direction === 'Long') {
                    score = ((h - e) / range) * 100; // Closer to Low = Higher Score
                } else {
                    score = ((e - l) / range) * 100; // Closer to High = Higher Score
                }

                if (score >= 66) entryGrade = 'A';
                else if (score >= 33) entryGrade = 'B';
                else entryGrade = 'C';
            }
        }

        // Trade Grade (Percentage of Channel Captured)
        let tradeGrade = '';
        const exit = parseFloat(data.exit_price);
        const top = parseFloat(data.upper_channel);
        const bot = parseFloat(data.lower_channel);

        if (!isNaN(exit) && !isNaN(e) && !isNaN(top) && !isNaN(bot)) {
            const channelWidth = top - bot;
            if (channelWidth > 0) {
                let realizedCapture = 0;
                if (data.direction === 'Long') {
                    realizedCapture = exit - e;
                } else {
                    realizedCapture = e - exit;
                }

                if (realizedCapture <= 0) {
                    tradeGrade = 'D'; // Loss
                } else {
                    const percentCaptured = (realizedCapture / channelWidth) * 100;
                    // Elder's Logic: Capture >30% of channel is A
                    if (percentCaptured >= 30) tradeGrade = 'A';
                    else if (percentCaptured >= 20) tradeGrade = 'B';
                    else if (percentCaptured >= 10) tradeGrade = 'C';
                    else tradeGrade = 'D';
                }
            }
        }

        return { entryGrade, tradeGrade };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Auto-calc slippage
        let slipEntry = 0;
        if (formData.entry_order_price && formData.entry_price) {
            const order = parseFloat(formData.entry_order_price);
            const fill = parseFloat(formData.entry_price);
            if (formData.direction === 'Long') {
                slipEntry = order - fill;
            } else {
                slipEntry = fill - order;
            }
        }

        const { entryGrade, tradeGrade } = calculateGrades(formData);

        // Auto-Calc Net P/L
        let netPL = null;
        if (formData.exit_price && formData.entry_price && formData.quantity) {
            const entry = parseFloat(formData.entry_price);
            const exit = parseFloat(formData.exit_price);
            const qty = parseFloat(formData.quantity);
            if (formData.direction === 'Long') {
                netPL = (exit - entry) * qty;
            } else {
                netPL = (entry - exit) * qty;
            }
        }

        // Helper to safe parse float or return null
        const safeFloat = (val) => {
            if (val === '' || val === null || val === undefined) return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        };

        const payload = {
            ...formData,
            trade_id: initialData.id, // Use updateTrade if ID exists.
            slippage_entry: slipEntry,
            slippage_exit: 0, // Placeholder for future calculation
            grade_entry: entryGrade,
            grade_exit: null, // Calc later if needed
            grade_trade: tradeGrade,
            net_pl: netPL,
            quantity: safeFloat(formData.quantity) || 0, // Required
            entry_price: safeFloat(formData.entry_price) || 0, // Required
            entry_order_price: safeFloat(formData.entry_order_price),
            entry_day_high: safeFloat(formData.entry_day_high),
            entry_day_low: safeFloat(formData.entry_day_low),
            upper_channel: safeFloat(formData.upper_channel),
            lower_channel: safeFloat(formData.lower_channel),
            exit_price: safeFloat(formData.exit_price),
            exit_date: formData.exit_date || null,
            snapshot: currentEntrySnapshot, // Explicitly set correct entry snapshot
            exit_snapshot: currentExitSnapshot, // Explicitly set correct exit snapshot
        };

        try {
            if (initialData.id) {
                await updateTrade(initialData.id, payload);
            } else {
                await logTrade(payload);
            }
            if (onSave) onSave();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to save trade");
        }
    };

    const displaySnapshot = snapshot || formData.snapshot;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`bg-gray-800 rounded-2xl border border-gray-700 w-full ${displaySnapshot ? 'max-w-6xl' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up transition-all duration-300`}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {initialData.id ? 'Edit Trade' : 'Log New Trade'}
                        {displaySnapshot && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">Snapshot Attached</span>}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="flex">
                    {displaySnapshot && (
                        <div className="w-1/2 border-r border-gray-700 p-4 bg-black/20 flex flex-col">
                            <p className="text-xs text-gray-500 mb-2 uppercase font-bold">Chart Context</p>
                            <img
                                src={displaySnapshot}
                                className="w-full h-auto object-contain rounded border border-gray-700 shadow-lg"
                                alt="Chart Snapshot"
                            />
                        </div>
                    )}

                    {displaySnapshot && (
                        <div className="w-1/2 border-r border-gray-700 p-4 bg-black/20 flex flex-col">
                            <p className="text-xs text-gray-500 mb-2 uppercase font-bold">Chart Context</p>
                            <img
                                src={displaySnapshot}
                                className="w-full h-auto object-contain rounded border border-gray-700 shadow-lg"
                                alt="Chart Snapshot"
                            />
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={`p-6 grid grid-cols-2 gap-4 ${displaySnapshot ? 'w-1/2' : 'w-full'}`}>
                        {/* Risk Management / Money Management */}
                        <div className="col-span-2 bg-blue-900/10 border border-blue-500/20 rounded-lg p-3 mb-2">
                            <h3 className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck size={14} /> Risk Management (2% Rule)
                            </h3>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                                <label className="col-span-1">
                                    <span className="text-gray-500 block mb-1">Account Equity</span>
                                    <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded p-1"
                                        value={riskParams.equity} onChange={e => setRiskParams({ ...riskParams, equity: e.target.value })} />
                                </label>
                                <label className="col-span-1">
                                    <span className="text-gray-500 block mb-1">Risk %</span>
                                    <input type="number" step="0.1" className="w-full bg-gray-900 border border-gray-700 rounded p-1"
                                        value={riskParams.riskPercent} onChange={e => setRiskParams({ ...riskParams, riskPercent: e.target.value })} />
                                </label>
                                <label className="col-span-1">
                                    <span className="text-gray-500 block mb-1">Stop Price</span>
                                    <input type="number" step="0.01" className="w-full bg-gray-900 border border-red-900/50 rounded p-1 text-red-300 font-bold"
                                        placeholder="Stop Loss"
                                        value={formData.stop_loss || ''} onChange={e => setFormData({ ...formData, stop_loss: e.target.value })} />

                                    {/* Smart Stop Helpers */}
                                    <div className="flex gap-1 mt-1 justify-end">
                                        {formData.direction === 'Long' ? (
                                            <>
                                                {formData.entry_day_low && (
                                                    <button type="button" onClick={() => setFormData({ ...formData, stop_loss: formData.entry_day_low.toFixed(2) })}
                                                        className="text-[9px] px-1 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded border border-gray-600"
                                                        title={`Recent Low: ${formData.entry_day_low}`}>
                                                        Low
                                                    </button>
                                                )}
                                                {formData.safezone_long && (
                                                    <button type="button" onClick={() => setFormData({ ...formData, stop_loss: formData.safezone_long.toFixed(2) })}
                                                        className="text-[9px] px-1 py-0.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded border border-red-900/50"
                                                        title={`SafeZone Long: ${formData.safezone_long}`}>
                                                        SZ
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {formData.entry_day_high && (
                                                    <button type="button" onClick={() => setFormData({ ...formData, stop_loss: formData.entry_day_high.toFixed(2) })}
                                                        className="text-[9px] px-1 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded border border-gray-600"
                                                        title={`Recent High: ${formData.entry_day_high}`}>
                                                        High
                                                    </button>
                                                )}
                                                {formData.safezone_short && (
                                                    <button type="button" onClick={() => setFormData({ ...formData, stop_loss: formData.safezone_short.toFixed(2) })}
                                                        className="text-[9px] px-1 py-0.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded border border-green-900/50"
                                                        title={`SafeZone Short: ${formData.safezone_short}`}>
                                                        SZ
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </label>
                                <div className="col-span-1 flex flex-col justify-end">
                                    {(() => {
                                        const entry = parseFloat(formData.entry_price);
                                        const stop = parseFloat(formData.stop_loss);
                                        if (entry && stop) {
                                            const riskPerShare = Math.abs(entry - stop);
                                            const maxRiskDollars = riskParams.equity * (riskParams.riskPercent / 100);
                                            const suggQty = Math.floor(maxRiskDollars / riskPerShare);
                                            return (
                                                <button type="button"
                                                    onClick={() => setFormData({ ...formData, quantity: suggQty })}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-center transition h-[30px] flex items-center justify-center gap-1"
                                                    title={`Risk $${maxRiskDollars.toFixed(0)} / Risk Per Share $${riskPerShare.toFixed(2)}`}
                                                >
                                                    Set Qty: {suggQty}
                                                </button>
                                            )
                                        }
                                        return <div className="text-gray-600 italic py-1">Enter Stop & Entry</div>;
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Basics */}
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <label>
                                <span className="text-xs text-gray-400 uppercase">Symbol</span>
                                <input required className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1 focus:border-blue-500 outline-none font-bold"
                                    value={formData.symbol} onChange={e => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })} />
                            </label>
                            <label>
                                <span className="text-xs text-gray-400 uppercase">Qty</span>
                                <input required type="number" className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1 focus:border-blue-500 outline-none"
                                    value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                            </label>
                        </div>

                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <label>
                                <span className="text-xs text-gray-400 uppercase">Direction</span>
                                <select className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1 focus:border-blue-500 outline-none"
                                    value={formData.direction} onChange={e => setFormData({ ...formData, direction: e.target.value })}>
                                    <option value="Long">Long</option>
                                    <option value="Short">Short</option>
                                </select>
                            </label>
                            <label>
                                <span className="text-xs text-gray-400 uppercase">Entry Date</span>
                                <input required type="date" className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1 focus:border-blue-500 outline-none"
                                    value={formData.entry_date} onChange={e => setFormData({ ...formData, entry_date: e.target.value })} />
                            </label>
                        </div>

                        {/* Execution */}
                        <div className="col-span-2 border-t border-gray-700 pt-4 mt-2">
                            <h3 className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider">Execution</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <label>
                                    <span className="text-xs text-gray-400">Fill Price</span>
                                    <input required type="number" step="0.01" className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1"
                                        value={formData.entry_price} onChange={e => setFormData({ ...formData, entry_price: e.target.value })} />
                                </label>
                                <label>
                                    <span className="text-xs text-gray-400">Limit (Optional)</span>
                                    <input type="number" step="0.01" className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1"
                                        value={formData.entry_order_price} onChange={e => setFormData({ ...formData, entry_order_price: e.target.value })} />
                                </label>
                            </div>
                        </div>

                        {/* Exit Section (Optional) */}
                        <div className="col-span-2 border-t border-gray-700 pt-4 mt-2">
                            <h3 className="text-xs font-bold text-green-400 mb-2 uppercase tracking-wider">Exit (Optional)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <label>
                                    <span className="text-xs text-gray-400">Exit Price</span>
                                    <input type="number" step="0.01" className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1"
                                        value={formData.exit_price} onChange={e => setFormData({ ...formData, exit_price: e.target.value })} />
                                </label>
                                <label>
                                    <span className="text-xs text-gray-400">Exit Date</span>
                                    <input type="date" className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1"
                                        value={formData.exit_date} onChange={e => setFormData({ ...formData, exit_date: e.target.value })} />
                                </label>
                            </div>
                        </div>

                        {/* Strategy and Reason */}
                        <div className="col-span-2 border-t border-gray-700 pt-4 mt-2">
                            <h3 className="text-xs font-bold text-yellow-400 mb-2 uppercase tracking-wider">Strategy & Reason</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-400 mb-1">Strategy</label>
                                    <select
                                        value={formData.strategy_name || 'Elder Impulse'}
                                        onChange={e => setFormData({ ...formData, strategy_name: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1 focus:border-blue-500 outline-none"
                                    >
                                        <option value="Elder Impulse">Elder Impulse</option>
                                        <option value="MACD Divergence">MACD Divergence</option>
                                        <option value="EFI Pullback">EFI Pullback</option>
                                        <option value="Channel Breakout">Channel Breakout</option>
                                        <option value="Support Bounce">Support Bounce</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-400 mb-1">Source</label>
                                    <input
                                        type="text"
                                        value={formData.source}
                                        onChange={e => setFormData({ ...formData, source: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-xs uppercase text-gray-400 mb-1">Entry Context / Reason</label>
                                <textarea
                                    value={formData.entry_reason || ''}
                                    onChange={e => setFormData({ ...formData, entry_reason: e.target.value })}
                                    placeholder="Why this trade? e.g. 'Bullish divergence at lower channel with EFI buy signal'"
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1 focus:border-blue-500 outline-none h-20 resize-none"
                                />
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <label className="block text-xs uppercase text-gray-400 mb-1">Exit Reason / Context</label>
                                <div className="grid grid-cols-2 gap-4 mb-2">
                                    <select
                                        value={formData.exit_reason?.split(':')[0] || 'Target Hit'}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const curr = formData.exit_reason || '';
                                            const detail = curr.includes(':') ? curr.split(':')[1] : '';
                                            setFormData({ ...formData, exit_reason: `${val}:${detail}` });
                                        }}
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-purple-500 outline-none"
                                    >
                                        <option value="Target Hit">Target Hit</option>
                                        <option value="Stop Loss">Stop Loss</option>
                                        <option value="Trailing Stop">Trailing Stop</option>
                                        <option value="Time Stop">Time Stop</option>
                                        <option value="Market Structure">Market Change</option>
                                        <option value="Manual Close">Manual Close</option>
                                    </select>
                                </div>
                                <textarea
                                    value={formData.exit_reason?.includes(':') ? formData.exit_reason.split(':')[1] : (formData.exit_reason || '')}
                                    onChange={e => {
                                        const type = formData.exit_reason?.split(':')[0] || 'Target Hit';
                                        setFormData({ ...formData, exit_reason: `${type}:${e.target.value}` });
                                    }}
                                    placeholder="Details on exit..."
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-purple-500 outline-none h-16 resize-none"
                                />
                            </div>
                        </div>

                        {/* Grading Context */}
                        <div className="col-span-2 border-t border-gray-700 pt-4 mt-2">
                            <h3 className="text-xs font-bold text-purple-400 mb-2 uppercase tracking-wider">Daily Context</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <label>
                                    <span className="text-xs text-gray-400">High / Low</span>
                                    <div className="flex gap-2">
                                        <input type="number" step="0.01" placeholder="H" className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1"
                                            value={formData.entry_day_high} onChange={e => setFormData({ ...formData, entry_day_high: e.target.value })} />
                                        <input type="number" step="0.01" placeholder="L" className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1"
                                            value={formData.entry_day_low} onChange={e => setFormData({ ...formData, entry_day_low: e.target.value })} />
                                    </div>
                                </label>
                                <label>
                                    <span className="text-xs text-gray-400">Channel (Top/Bot)</span>
                                    <div className="flex gap-2">
                                        <input type="number" step="0.01" placeholder="T" className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1"
                                            value={formData.upper_channel} onChange={e => setFormData({ ...formData, upper_channel: e.target.value })} />
                                        <input type="number" step="0.01" placeholder="B" className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1"
                                            value={formData.lower_channel} onChange={e => setFormData({ ...formData, lower_channel: e.target.value })} />
                                    </div>
                                </label>
                            </div>
                        </div>

                        <button type="submit" className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-4 transition shadow-lg shadow-blue-900/40">
                            Save Trade
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TradeEntryModal;
