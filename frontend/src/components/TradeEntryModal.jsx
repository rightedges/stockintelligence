import React, { useState } from 'react';
import { logTrade } from '../services/api';

const TradeEntryModal = ({ onClose, onSave, snapshot, initialData = {} }) => {
    const [formData, setFormData] = useState({
        account: 'Main', source: 'Homework', symbol: '', quantity: '', direction: 'Long',
        entry_date: new Date().toISOString().split('T')[0], entry_price: '', entry_order_type: 'Market', entry_order_price: '',
        entry_day_high: '', entry_day_low: '',
        upper_channel: '', lower_channel: '',
        ...initialData
    });

    const calculateGrades = (data) => {
        let entryGrade = '';
        if (data.entry_price && data.entry_day_high && data.entry_day_low) {
            const h = parseFloat(data.entry_day_high);
            const l = parseFloat(data.entry_day_low);
            const e = parseFloat(data.entry_price);
            const range = h - l;

            if (range > 0) {
                let score = 0;
                if (data.direction === 'Long') {
                    score = ((h - e) / range) * 100;
                } else {
                    score = ((e - l) / range) * 100;
                }

                if (score >= 66) entryGrade = 'A';
                else if (score >= 33) entryGrade = 'B';
                else entryGrade = 'C';
            }
        }
        return { entryGrade };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

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

        const { entryGrade } = calculateGrades(formData);

        // Helper to safe parse float or return null
        const safeFloat = (val) => {
            if (val === '' || val === null || val === undefined) return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        };

        const payload = {
            ...formData,
            slippage_entry: slipEntry,
            grade_entry: entryGrade,
            quantity: safeFloat(formData.quantity) || 0, // Required
            entry_price: safeFloat(formData.entry_price) || 0, // Required
            entry_order_price: safeFloat(formData.entry_order_price),
            entry_day_high: safeFloat(formData.entry_day_high),
            entry_day_low: safeFloat(formData.entry_day_low),
            upper_channel: safeFloat(formData.upper_channel),
            lower_channel: safeFloat(formData.lower_channel),
            snapshot: snapshot || null,
        };

        try {
            await logTrade(payload);
            if (onSave) onSave();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to save trade");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        Log New Trade
                        {snapshot && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">Snapshot Attached</span>}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="flex">
                    {snapshot && (
                        <div className="w-1/3 border-r border-gray-700 p-4 bg-black/20">
                            <p className="text-xs text-gray-500 mb-2 uppercase font-bold">Chart Context</p>
                            <img src={snapshot} className="w-full rounded border border-gray-700" alt="Chart Snapshot" />
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={`p-6 grid grid-cols-2 gap-4 ${snapshot ? 'w-2/3' : 'w-full'}`}>
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
                                <span className="text-xs text-gray-400 uppercase">Date</span>
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
