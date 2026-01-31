import React, { useState, useEffect } from 'react';
import { getTrades, logTrade, deleteTrade } from '../services/api';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Camera, X, Edit } from 'lucide-react';
import TradeEntryModal from './TradeEntryModal';

const TradeJournal = () => {
    const [trades, setTrades] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedTrade, setSelectedTrade] = useState({});

    useEffect(() => {
        loadTrades();
    }, []);

    const loadTrades = async () => {
        try {
            const res = await getTrades();
            setTrades(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const calculateGrades = (data) => {
        let entryGrade = '';
        if (data.entry_price && data.entry_day_high && data.entry_day_low) {
            const h = parseFloat(data.entry_day_high);
            const l = parseFloat(data.entry_day_low);
            const e = parseFloat(data.entry_price);
            const range = h - l;

            if (range > 0) {
                let score = 0; // 0-100, 100 is best
                if (data.direction === 'Long') {
                    // Buying near Low is best
                    score = ((h - e) / range) * 100;
                } else {
                    // Selling near High is best
                    score = ((e - l) / range) * 100;
                }

                if (score >= 66) entryGrade = 'A'; // Top third of value
                else if (score >= 33) entryGrade = 'B';
                else entryGrade = 'C';
            }
        }
        return { entryGrade };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Auto-calc slippage and comms
        let slipEntry = 0;
        if (formData.entry_order_price && formData.entry_price) {
            const order = parseFloat(formData.entry_order_price);
            const fill = parseFloat(formData.entry_price);

            if (formData.direction === 'Long') {
                slipEntry = order - fill; // 150 - 151 = -1 (Bad)
            } else {
                slipEntry = fill - order; // 151 - 150 = +1 (Bad for short? No, sell higher is good).
                // Short Order 150. Filled 149. Slip = 149 - 150 = -1 (Bad).
            }
        }

        const { entryGrade } = calculateGrades(formData);

        const payload = {
            ...formData,
            slippage_entry: slipEntry,
            grade_entry: entryGrade,
            quantity: parseFloat(formData.quantity),
            entry_price: parseFloat(formData.entry_price),
            // comm_entry: calculated on backend or manual? manual for now.
        };

        try {
            await logTrade(payload);
            setShowModal(false);
            loadTrades();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Delete trade?')) {
            await deleteTrade(id);
            loadTrades();
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="text-blue-500" /> Trade Journal
                </h1>
                <button
                    onClick={() => { setSelectedTrade({}); setShowModal(true); }}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center gap-2"
                >
                    <Plus size={18} /> Log Trade
                </button>
            </div>

            {/* Data Grid */}
            <div className="flex-1 overflow-auto bg-gray-800 rounded-xl border border-gray-700 shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-900 sticky top-0 z-10 text-xs uppercase text-gray-400">
                        <tr>
                            <th className="p-3 border-b border-gray-700">Date</th>
                            <th className="p-3 border-b border-gray-700">Account</th>
                            <th className="p-3 border-b border-gray-700">Source</th>
                            <th className="p-3 border-b border-gray-700">Symbol</th>
                            <th className="p-3 border-b border-gray-700">Dir</th>
                            <th className="p-3 border-b border-gray-700 text-center">Snap</th>
                            <th className="p-3 border-b border-gray-700 text-right">Qty</th>
                            <th className="p-3 border-b border-gray-700 text-right">Entry</th>
                            <th className="p-3 border-b border-gray-700 text-right">Exit</th>
                            <th className="p-3 border-b border-gray-700 text-right">Net P/L</th>
                            <th className="p-3 border-b border-gray-700 text-center">Grades</th>
                            <th className="p-3 border-b border-gray-700 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-sm">
                        {trades.map(t => (
                            <tr key={t.id} className="hover:bg-gray-750 transition">
                                <td className="p-3">{t.entry_date}</td>
                                <td className="p-3">{t.account}</td>
                                <td className="p-3">{t.source}</td>
                                <td className="p-3 font-bold text-blue-400">{t.symbol}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.direction === 'Long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {t.direction.toUpperCase()}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    {t.snapshot && (
                                        <button onClick={() => setSelectedImage(t.snapshot)} className="p-1.5 hover:bg-gray-700 rounded text-blue-400 hover:text-white transition">
                                            <Camera size={16} />
                                        </button>
                                    )}
                                </td>
                                <td className="p-3 text-right">{t.quantity}</td>
                                <td className="p-3 text-right text-gray-300">{t.entry_price?.toFixed(2)}</td>
                                <td className="p-3 text-right text-gray-300">{t.exit_price?.toFixed(2) || '-'}</td>
                                <td className={`p-3 text-right font-mono font-bold ${t.net_pl > 0 ? 'text-green-400' : t.net_pl < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                    {t.net_pl ? `$${t.net_pl.toFixed(2)}` : '-'}
                                </td>
                                <td className="p-3 text-center flex justify-center gap-1">
                                    {t.grade_entry && <span className="bg-gray-700 px-1.5 rounded text-xs border border-gray-600" title="Entry Grade">{t.grade_entry}</span>}
                                    {t.grade_trade && <span className={`px-1.5 rounded text-xs border ${t.grade_trade === 'A' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-gray-700 border-gray-600'}`}>{t.grade_trade}</span>}
                                </td>
                                <td className="p-3 text-center">
                                    <button onClick={() => { setSelectedTrade(t); setShowModal(true); }} className="text-gray-500 hover:text-blue-400 transition">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(t.id)} className="text-gray-500 hover:text-red-500 transition">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {trades.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        <DollarSign size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No trades logged yet. Start your journey!</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <TradeEntryModal
                    onClose={() => setShowModal(false)}
                    initialData={selectedTrade}
                    onSave={loadTrades}
                />
            )}

            {/* Image Preview Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Trade Snapshot"
                        className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-white/10"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default TradeJournal;
