import React, { useState, useEffect } from 'react';
import { getTrades, logTrade, deleteTrade } from '../services/api';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Camera, X, Edit } from 'lucide-react';
import TradeEntryModal from './TradeEntryModal';

const TradeJournal = () => {
    const [trades, setTrades] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [analyticsView, setAnalyticsView] = useState('strategy'); // 'strategy' or 'exit'

    const analyticsData = React.useMemo(() => {
        const stats = {};

        trades.forEach(t => {
            let key = '';
            if (analyticsView === 'strategy') {
                key = t.strategy_name || 'Manual';
            } else {
                // Parse "Type:Details" or just use Type
                key = t.exit_reason ? t.exit_reason.split(':')[0] : 'Open/Unknown';
            }

            if (!stats[key]) {
                stats[key] = { count: 0, wins: 0, totalGradePoints: 0, gradedCount: 0 };
            }

            stats[key].count++;
            if (t.net_pl > 0) stats[key].wins++;

            const grade = t.grade_trade;
            if (grade) {
                stats[key].gradedCount++;
                if (grade === 'A') stats[key].totalGradePoints += 4;
                else if (grade === 'B') stats[key].totalGradePoints += 3;
                else if (grade === 'C') stats[key].totalGradePoints += 2;
                else if (grade === 'D') stats[key].totalGradePoints += 1;
            }
        });

        return Object.entries(stats).map(([name, data]) => ({
            name,
            count: data.count,
            winRate: Math.round((data.wins / data.count) * 100),
            avgGrade: data.gradedCount > 0 ? (data.totalGradePoints / data.gradedCount).toFixed(1) : '-'
        })).sort((a, b) => b.winRate - a.winRate);
    }, [trades, analyticsView]);

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

            {/* Strategy/Exit Analytics */}
            <div className="mb-6">
                <div className="flex items-center gap-4 mb-3">
                    <button
                        onClick={() => setAnalyticsView('strategy')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${analyticsView === 'strategy' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                    >
                        Strategy Performance
                    </button>
                    <button
                        onClick={() => setAnalyticsView('exit')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${analyticsView === 'exit' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                    >
                        Exit Performance
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {analyticsData.map(stat => (
                        <div key={stat.name} className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
                            <div className={`absolute top-0 right-0 p-2 opacity-10 ${analyticsView === 'strategy' ? 'text-blue-500' : 'text-purple-500'}`}>
                                {analyticsView === 'strategy' ? <TrendingUp size={64} /> : <X size={64} />}
                            </div>
                            <div className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-2 truncate" title={stat.name}>
                                {stat.name}
                            </div>
                            <div className="flex justify-between items-end relative z-10">
                                <div>
                                    <div className="text-2xl font-black text-white">{stat.winRate}%</div>
                                    <div className="text-xs text-green-400 font-bold">Win Rate</div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-bold ${stat.avgGrade >= 3.5 ? 'text-green-400' : stat.avgGrade >= 2.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {stat.avgGrade}
                                    </div>
                                    <div className="text-xs text-gray-500">Avg Grade ({stat.count})</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Data Grid */}
            <div className="flex-1 overflow-auto bg-gray-800 rounded-xl border border-gray-700 shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-900 sticky top-0 z-10 text-xs uppercase text-gray-400">
                        <tr>
                            <th className="p-3 border-b border-gray-700">Date/Strat</th>
                            <th className="p-3 border-b border-gray-700">Symbol</th>
                            <th className="p-3 border-b border-gray-700">Dir</th>
                            <th className="p-3 border-b border-gray-700 text-center">Snaps</th>
                            <th className="p-3 border-b border-gray-700 text-right">Net P/L</th>
                            <th className="p-3 border-b border-gray-700 text-center">Grades</th>
                            <th className="p-3 border-b border-gray-700 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-sm">
                        {trades.map(t => (
                            <tr key={t.id} className="hover:bg-gray-750 transition">
                                <td className="p-3">
                                    <div className="font-mono text-white">{t.entry_date}</div>
                                    <div className="text-xs text-gray-500 font-bold">{t.strategy_name || 'Manual'}</div>
                                </td>
                                <td className="p-3 font-bold text-blue-400">{t.symbol}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.direction === 'Long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {t.direction.toUpperCase()}
                                    </span>
                                </td>
                                <td className="p-3 text-center flex justify-center gap-1">
                                    {t.snapshot && (
                                        <button onClick={() => setSelectedImage(t.snapshot)} className="p-1.5 hover:bg-gray-700 rounded text-blue-400 hover:text-white transition" title="Entry Snapshot">
                                            <Camera size={14} />
                                        </button>
                                    )}
                                    {t.exit_snapshot && (
                                        <button onClick={() => setSelectedImage(t.exit_snapshot)} className="p-1.5 hover:bg-gray-700 rounded text-purple-400 hover:text-white transition" title="Exit Snapshot">
                                            <Camera size={14} />
                                        </button>
                                    )}
                                </td>
                                <td className={`p-3 text-right font-mono font-bold ${t.net_pl > 0 ? 'text-green-400' : t.net_pl < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                    {t.net_pl ? `$${t.net_pl.toFixed(2)}` : '-'}
                                </td>
                                <td className="p-3 text-center">
                                    {t.grade_trade ? (
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${t.grade_trade === 'A' ? 'bg-green-500/20 border-green-500/50 text-green-400' :
                                            t.grade_trade === 'D' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-gray-700 border-gray-600 text-gray-300'}`} title="Trade Grade">
                                            {t.grade_trade}
                                        </span>
                                    ) : '-'}
                                </td>
                                <td className="p-3 text-center">
                                    <button onClick={() => { setSelectedTrade(t); setShowModal(true); }} className="text-gray-500 hover:text-blue-400 transition mx-1">
                                        <Edit size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(t.id)} className="text-gray-500 hover:text-red-500 transition mx-1">
                                        <Trash2 size={14} />
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
