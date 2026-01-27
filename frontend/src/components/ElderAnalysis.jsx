import React, { useState, useEffect, useRef } from 'react';
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    HistogramSeries,
    CrosshairMode
} from 'lightweight-charts';
import { Zap, Info, Notebook, Camera, Calendar, Trash2, Search, AlertTriangle, Edit } from 'lucide-react';
import { saveJournalEntry, getJournalEntries, updateJournalEntry, deleteJournalEntry } from '../services/api';
import { X } from 'lucide-react';

const ElderAnalysis = ({ data, symbol, srLevels = [], tacticalAdvice, macdDivergence, f13Divergence, timeframeLabel = 'Daily' }) => {
    const chartContainerRef = useRef();
    const [persistenceKey, setPersistenceKey] = useState(null);
    const [journalEntries, setJournalEntries] = useState([]);
    const [note, setNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showJournal, setShowJournal] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingNote, setEditingNote] = useState('');
    const lastData = data && data.length > 0 ? data[data.length - 1] : null;
    const currentImpulse = lastData?.impulse || 'blue';
    const isWeekly = timeframeLabel === 'Weekly';

    useEffect(() => {
        if (!symbol) return;
        const key = `analysis_${symbol}_${timeframeLabel}`;
        setPersistenceKey(key);
    }, [symbol, timeframeLabel]);

    const chartRef = useRef(null);
    const seriesRef = useRef({});
    const legendRef = useRef(null);
    const srLineRefs = useRef([]);

    // Load Journal Entries (All Timeframes)
    useEffect(() => {
        if (!symbol) return;
        const fetchEntries = async () => {
            try {
                // Pass undefined/null for timeframe to fetch ALL entries
                const res = await getJournalEntries(symbol);
                setJournalEntries(res.data || []);
            } catch (err) {
                console.error("Failed to fetch journal entries", err);
            }
        };
        fetchEntries();
    }, [symbol]); // Removed timeframeLabel to prevent filtering

    // Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const background = { type: 'solid', color: '#111827' }; // gray-900
        const textColor = 'rgba(255, 255, 255, 0.9)';
        const gridColor = 'rgba(197, 203, 206, 0.1)';

        const chart = createChart(chartContainerRef.current, {
            layout: { background, textColor },
            grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
            width: chartContainerRef.current.clientWidth,
            height: 900,
            timeScale: { timeVisible: true, borderColor: gridColor },
            rightPriceScale: { borderColor: gridColor, visible: true },
            leftPriceScale: { visible: false },
            crosshair: { mode: CrosshairMode.Normal },
        });

        chartRef.current = chart;

        // Initialize Series
        const isWeekly = timeframeLabel === 'Weekly';
        const s = {};

        s.candles = chart.addSeries(CandlestickSeries, { priceScaleId: 'right' });
        s.ema13 = chart.addSeries(LineSeries, {
            color: '#60a5fa',
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        if (!isWeekly) {
            s.ema26 = chart.addSeries(LineSeries, {
                color: '#f59e0b',
                lineWidth: 2,
                lastValueVisible: false,
                priceLineVisible: false,
            });
            s.upper = chart.addSeries(LineSeries, {
                color: 'rgba(255, 255, 255, 0.2)',
                lineWidth: 1,
                lineStyle: 2,
                lastValueVisible: false,
                priceLineVisible: false,
            });
            s.lower = chart.addSeries(LineSeries, {
                color: 'rgba(255, 255, 255, 0.2)',
                lineWidth: 1,
                lineStyle: 2,
                lastValueVisible: false,
                priceLineVisible: false,
            });
        }

        s.volume = chart.addSeries(HistogramSeries, {
            priceScaleId: 'volume',
            priceFormat: { type: 'volume' },
            lastValueVisible: false,
            priceLineVisible: false,
        });

        s.volumeSMA = chart.addSeries(LineSeries, {
            priceScaleId: 'volume',
            color: '#f59e0b', // Amber line for SMA
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        s.macdHist = chart.addSeries(HistogramSeries, {
            priceScaleId: 'macd',
            lastValueVisible: false,
            priceLineVisible: false,
        });

        if (!isWeekly) {
            s.macdSignal = chart.addSeries(LineSeries, {
                priceScaleId: 'macd',
                color: '#ef4444',
                lineWidth: 1,
                lastValueVisible: false,
                priceLineVisible: false,
            });
            s.force2 = chart.addSeries(HistogramSeries, {
                priceScaleId: 'force2',
                lastValueVisible: false,
                priceLineVisible: false,
            });
            s.force13 = chart.addSeries(HistogramSeries, {
                priceScaleId: 'force13',
                lastValueVisible: false,
                priceLineVisible: false,
            });
        }

        seriesRef.current = s;

        // Pane Layout (4-Pane Stack)
        chart.priceScale('right').applyOptions({
            scaleMargins: isWeekly ? { top: 0.05, bottom: 0.30 } : { top: 0.02, bottom: 0.45 }
        });

        chart.priceScale('macd').applyOptions({
            position: 'left',
            scaleMargins: isWeekly ? { top: 0.75, bottom: 0 } : { top: 0.58, bottom: 0.28 },
            visible: true
        });

        if (!isWeekly) {
            chart.priceScale('force13').applyOptions({
                position: 'left',
                scaleMargins: { top: 0.74, bottom: 0.14 },
                visible: true
            });
            chart.priceScale('force2').applyOptions({
                position: 'left',
                scaleMargins: { top: 0.88, bottom: 0 },
                visible: true
            });
        }

        // Volume Scale (Overlay at bottom of price pane)
        // Price pane bottom is 0.30 (Weekly) or 0.45 (Daily).
        // We want volume to sit at the bottom of that pane.
        chart.priceScale('volume').applyOptions({
            scaleMargins: isWeekly ? { top: 0.55, bottom: 0.30 } : { top: 0.35, bottom: 0.45 },
            visible: false, // Hide axis labels
        });

        // Legends
        const legend = document.createElement('div');
        legend.style = `
            position: absolute; left: 12px; top: 12px; z-index: 10;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.9);
            pointer-events: none;
            display: flex; flex-direction: column; gap: 2px;
        `;
        chartContainerRef.current.appendChild(legend);
        legendRef.current = legend;

        // Resizer
        const observer = new ResizeObserver(entries => {
            if (entries[0] && chartRef.current) {
                chartRef.current.applyOptions({ width: entries[0].contentRect.width });
            }
        });
        observer.observe(chartContainerRef.current);

        return () => {
            if (legend) legend.remove();
            observer.disconnect();
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
            seriesRef.current = {};
        };
    }, [symbol, timeframeLabel]);

    const handleSaveJournal = async () => {
        if (!note.trim() || !chartRef.current) return;

        setIsSaving(true);
        try {
            const canvas = chartRef.current.takeScreenshot();
            const snapshot = canvas.toDataURL();

            const entry = {
                symbol,
                timestamp: new Date().toISOString(),
                note: note.trim(),
                snapshot,
                timeframe: timeframeLabel
            };

            await saveJournalEntry(entry);
            setJournalEntries([entry, ...journalEntries]);
            setNote('');
            setShowJournal(true);
        } catch (err) {
            console.error("Failed to save journal entry", err);
        } finally {
            setIsSaving(false);
        }
    };

    const applyElderTemplate = () => {
        let template = '';
        if (timeframeLabel === 'Weekly') {
            template = `### WEEKLY MACRO TIDE\n\n**1. TIDE ANALYSIS (EMA 13)**\n- Direction: \n- Slope Quality: \n\n**2. IMPULSE SYSTEM**\n- State: (Red/Green/Blue)\n- Restriction: \n\n**3. BIG PICTURE CONTEXT**\n- Sector Rank: \n- Major S/R Levels: \n\n**4. STRATEGIC BIAS**\n- Next Week's Goal: `;
        } else {
            template = `### DAILY TACTICAL SETUP\n\n**1. TRIPLE SCREEN CHECK**\n- S1 (Weekly Tide): \n- S2 (Daily Wave/Force): \n- S3 (Entry Trigger): \n\n**2. EMOTIONAL SATE**\n- Current Feeling: \n- Discipline Check: \n\n**3. TRADE PLAN**\n- Entry Order (Stop/Limit): \n- Protective Stop: \n- Profit Target: \n- Risk/Reward Ratio: `;
        }
        setNote(template);
    };

    const handleUpdateJournal = async (id) => {
        if (!editingNote.trim()) return;
        try {
            await updateJournalEntry(id, editingNote.trim());
            setJournalEntries(journalEntries.map(e => e.id === id ? { ...e, note: editingNote.trim() } : e));
            setEditingId(null);
            setEditingNote('');
        } catch (err) {
            console.error("Failed to update journal entry", err);
        }
    };

    const handleDeleteJournal = async (id) => {
        if (!id || !window.confirm("Delete this journal entry?")) return;
        try {
            await deleteJournalEntry(id);
            setJournalEntries(journalEntries.filter(e => e.id !== id));
        } catch (err) {
            console.error("Failed to delete entry", err);
        }
    };

    // Update Series Data
    useEffect(() => {
        if (!chartRef.current || !data || data.length === 0) return;
        const s = seriesRef.current;
        const isWeekly = timeframeLabel === 'Weekly';

        const candleData = [], ema13Data = [], ema26Data = [], upperData = [], lowerData = [], macdHistData = [], macdSignalData = [], force2Data = [], force13Data = [], volumeData = [], volumeSMAData = [];

        data.forEach(d => {
            const time = d.Date.split('T')[0];
            const candleColor = d.impulse === 'green' ? '#22c55e' : d.impulse === 'red' ? '#ef4444' : '#60a5fa';

            candleData.push({ time, open: d.Open, high: d.High, low: d.Low, close: d.Close, color: candleColor, wickColor: candleColor, borderColor: candleColor });
            if (d.ema_13) ema13Data.push({ time, value: d.ema_13 });

            if (!isWeekly) {
                if (d.ema_26) ema26Data.push({ time, value: d.ema_26 });
                if (d.envelope_upper) upperData.push({ time, value: d.envelope_upper });
                if (d.envelope_lower) lowerData.push({ time, value: d.envelope_lower });
            }

            if (d.macd_diff !== undefined && d.macd_diff !== null) {
                macdHistData.push({ time, value: d.macd_diff, color: d.macd_diff >= 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)' });
            }

            if (!isWeekly && d.macd_signal) {
                macdSignalData.push({ time, value: d.macd_signal });
            }

            if (!isWeekly && d.force_index_2 !== undefined && d.force_index_2 !== null) {
                force2Data.push({
                    time,
                    value: d.force_index_2,
                    color: d.force_index_2 >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                });
            }

            if (!isWeekly && d.force_index_13 !== undefined && d.force_index_13 !== null) {
                force13Data.push({ time, value: d.force_index_13, color: d.force_index_13 >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)' });
            }

            if (d.Volume) {
                volumeData.push({
                    time,
                    value: d.Volume,
                    color: d.Close >= d.Open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                });
            }
            if (d.volume_sma_20) {
                volumeSMAData.push({ time, value: d.volume_sma_20 });
            }
        });

        s.candles.setData(candleData);
        s.ema13.setData(ema13Data);
        if (!isWeekly) {
            s.ema26.setData(ema26Data);
            s.upper.setData(upperData);
            s.lower.setData(lowerData);
        }
        s.macdHist.setData(macdHistData);
        if (!isWeekly) {
            s.macdSignal.setData(macdSignalData);
            s.force2.setData(force2Data);
            s.force13.setData(force13Data);
        }
        s.volume.setData(volumeData);
        s.volumeSMA.setData(volumeSMAData);

        // Support & Resistance Lines Cleanup
        if (s.candles) {
            srLineRefs.current.forEach(line => {
                try { s.candles.removePriceLine(line); } catch (e) { }
            });
            srLineRefs.current = [];
        }

        srLevels.forEach(level => {
            const line = s.candles.createPriceLine({
                price: level.price,
                color: level.type === 'resistance' ? '#ef4444' : '#22c55e',
                lineWidth: 1.5,
                lineStyle: 1,
                axisLabelVisible: false,
                title: level.type.toUpperCase(),
            });
            srLineRefs.current.push(line);
        });

        chartRef.current.timeScale().fitContent();
    }, [data, symbol, srLevels]);

    // Legend interaction Logic
    useEffect(() => {
        if (!chartRef.current || !data || data.length === 0) return;

        const chart = chartRef.current;
        const s = seriesRef.current;

        const updateLegend = (d) => {
            if (!d || !legendRef.current) return;
            const isWeekly = timeframeLabel === 'Weekly';
            legendRef.current.innerHTML = `
                <div style="font-size: 14px; font-weight: 600; color: #e5e7eb; margin-bottom: 2px;">
                    ${symbol} <span style="font-size: 11px; color: #9ca3af; font-weight: 400;">${timeframeLabel}</span>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="display: flex; gap: 4px;">
                        <span style="color: #9ca3af;">O</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Open?.toFixed(2)}</span>
                        <span style="color: #9ca3af;">H</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.High?.toFixed(2)}</span>
                        <span style="color: #9ca3af;">L</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Low?.toFixed(2)}</span>
                        <span style="color: #9ca3af;">C</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Close?.toFixed(2)}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 2px;">
                    <span style="color: #60a5fa">EMA13 ${d.ema_13 !== undefined && d.ema_13 !== null ? d.ema_13.toFixed(2) : ''}</span>
                    ${!isWeekly ? `<span style="color: #f59e0b">EMA26 ${d.ema_26 !== undefined && d.ema_26 !== null ? d.ema_26.toFixed(2) : ''}</span>` : ''}
                    <span style="color: #9ca3af">Vol ${(d.Volume / 1000000).toFixed(2)}M</span>
                    <span style="color: #f59e0b">SMA(20) ${d.volume_sma_20 ? (d.volume_sma_20 / 1000000).toFixed(2) + 'M' : ''}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <span style="color: #34d399">MACD ${d.macd_diff !== undefined && d.macd_diff !== null ? d.macd_diff.toFixed(2) : ''}</span>
                    ${!isWeekly ? `<span style="color: #ef4444">Signal ${d.macd_signal !== undefined && d.macd_signal !== null ? d.macd_signal.toFixed(2) : ''}</span>` : ''}
                    ${!isWeekly ? `
                        <span style="color: #a78bfa">F(2) ${d.force_index_2 ? (d.force_index_2 / 1000).toFixed(1) + 'K' : '-'}</span>
                        <span style="color: #8b5cf6">F(13) ${d.force_index_13 ? (d.force_index_13 / 1000000).toFixed(1) + 'M' : '-'}</span>
                    ` : ''}
                </div>
            `;
        };

        const handleCrosshairMove = param => {
            if (!s || !s.candles) return;
            const last = data[data.length - 1];

            if (!param.time || param.point.x < 0 || param.point.y < 0) {
                updateLegend(last);
            } else {
                const e13 = s.ema13 ? param.seriesData.get(s.ema13) : null;
                const e26 = s.ema26 ? param.seriesData.get(s.ema26) : null;
                const mh = s.macdHist ? param.seriesData.get(s.macdHist) : null;
                const ms = s.macdSignal ? param.seriesData.get(s.macdSignal) : null;
                const f2 = s.force2 ? param.seriesData.get(s.force2) : null;
                const f13 = s.force13 ? param.seriesData.get(s.force13) : null;
                const priceData = param.seriesData.get(s.candles);

                updateLegend({
                    Open: priceData?.open || last?.Open,
                    High: priceData?.high || last?.High,
                    Low: priceData?.low || last?.Low,
                    Close: priceData?.close || priceData?.value || last?.Close,
                    ema_13: e13?.value,
                    ema_26: e26?.value,
                    macd_diff: mh?.value,
                    macd_signal: ms?.value,
                    force_index_2: f2?.value,
                    force_index_13: f13?.value,
                    Volume: s.volume ? param.seriesData.get(s.volume)?.value : last?.Volume,
                    volume_sma_20: s.volumeSMA ? param.seriesData.get(s.volumeSMA)?.value : last?.volume_sma_20
                });
            }
        };

        chart.subscribeCrosshairMove(handleCrosshairMove);
        updateLegend(data[data.length - 1]);

        return () => {
            chart.unsubscribeCrosshairMove(handleCrosshairMove);
        };
    }, [data, symbol, timeframeLabel]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Main Content Area (Left) */}
            <div className="flex-1 flex flex-col gap-6 w-full min-w-0">

                <div className="bg-blue-600/10 border border-blue-500/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -mr-20 -mt-20" />
                    <h3 className="font-black flex items-center gap-2 mb-6 text-white text-xl italic tracking-tighter">
                        <Info className="text-blue-400" />
                        TRIPLE SCREEN STRATEGY
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                        {/* MACD DIVERGENCE ALERT (Restored) */}
                        {macdDivergence && (
                            <div className={`col-span-1 lg:col-span-3 p-4 rounded-xl border-l-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-500 ${macdDivergence.type === 'bearish'
                                ? 'bg-red-500/10 border-red-500'
                                : 'bg-green-500/10 border-green-500'
                                }`}>
                                <div className={`p-2 rounded-full ${macdDivergence.type === 'bearish' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h4 className={`font-black uppercase tracking-widest text-sm mb-1 ${macdDivergence.type === 'bearish' ? 'text-red-400' : 'text-green-400'}`}>
                                        CRITICAL {macdDivergence.type} DIVERGENCE DETECTED
                                    </h4>
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        {macdDivergence.type === 'bearish'
                                            ? "Price is making a higher high while momentum (MACD) is weakening. A sharp reversal may be imminent. Tighten stops immediately."
                                            : "Price is making a lower low while momentum (MACD) is strengthening. A bottom may be forming. Watch for entry triggers."}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* COL 1: TIDE */}
                        <div className={`p-5 rounded-2xl border transition-all duration-300 ${tacticalAdvice?.type === 'LONG' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <div className="text-[10px] text-gray-500 uppercase font-black mb-3 tracking-widest flex items-center justify-between">
                                SCREEN 1: THE TIDE (WEEKLY EMA 13)
                                <span className={`px-2 py-0.5 rounded text-[8px] ${tacticalAdvice?.type === 'LONG' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                    {tacticalAdvice?.type === 'LONG' ? 'RISING' : 'FALLING'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-200 leading-relaxed font-medium mb-4">
                                {tacticalAdvice?.type === 'LONG'
                                    ? "The Tide is rising. Only long positions are permitted. Look for value entries."
                                    : "The Tide is falling. Only short positions or cash are permitted."}
                            </p>
                            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Logic Binding</div>
                                {tacticalAdvice?.type === 'LONG'
                                    ? <span className="text-xs text-green-400 font-mono">Allowed: LONG / CASH</span>
                                    : <span className="text-xs text-red-400 font-mono">Allowed: SHORT / CASH</span>
                                }
                            </div>
                        </div>

                        {/* COL 2: WAVE */}
                        <div className={`p-5 rounded-2xl border transition-all duration-300 ${lastData?.force_index_2 < 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                            <div className="text-[10px] text-gray-500 uppercase font-black mb-3 tracking-widest flex items-center justify-between">
                                SCREEN 2: THE WAVE (Daily F2)
                                <span className={`px-2 py-0.5 rounded text-[8px] ${lastData?.force_index_2 < 0 ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}>
                                    {lastData?.force_index_2 < 0 ? 'NEGATIVE' : 'POSITIVE'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-200 leading-relaxed font-medium mb-4">
                                {lastData?.force_index_2 < 0
                                    ? "A short-term pullback is in progress. Bulls should look for a buy stop entry."
                                    : "State of short-term strength. Bears should look for a sell stop entry if trend is down."}
                            </p>
                            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">State Analysis</div>
                                <span className="text-xs text-blue-300 font-mono">
                                    {lastData?.force_index_2 < 0 ? "Oversold (Value Zone)" : "Overbought (Premium Zone)"}
                                </span>
                            </div>
                        </div>

                        {/* COL 3: TACTICAL SYNTHESIS */}
                        <div className={`p-5 rounded-2xl border transition-all duration-300 ${tacticalAdvice?.style === 'success' ? 'bg-green-900/20 border-green-500/50' :
                            tacticalAdvice?.style === 'danger' ? 'bg-red-900/20 border-red-500/50' :
                                'bg-amber-900/20 border-amber-500/50'
                            }`}>
                            <div className="text-[10px] text-gray-500 uppercase font-black mb-3 tracking-widest flex items-center justify-between">
                                SCREEN 3: EXECUTION
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${tacticalAdvice?.style === 'success' ? 'bg-green-500 text-white' :
                                    tacticalAdvice?.style === 'danger' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>
                                    {tacticalAdvice?.recommendation}
                                </span>
                            </div>

                            {/* Main Decision */}
                            <div className="mb-6">
                                <p className="text-sm text-gray-200 leading-relaxed font-bold">
                                    "{tacticalAdvice?.reason}"
                                </p>
                            </div>

                            {/* Execution Grid */}
                            {timeframeLabel !== 'Weekly' && tacticalAdvice && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-black/40 rounded border border-white/5">
                                        <div className="text-[8px] text-gray-500 uppercase font-bold">Entry Trigger</div>
                                        <div className="text-sm font-mono font-bold text-blue-400">${tacticalAdvice.entry || 'N/A'}</div>
                                    </div>
                                    <div className="p-2 bg-black/40 rounded border border-white/5">
                                        <div className="text-[8px] text-gray-500 uppercase font-bold">Stop Loss</div>
                                        <div className="text-sm font-mono font-bold text-red-400">${tacticalAdvice.stop || 'N/A'}</div>
                                    </div>
                                    <div className="p-2 bg-black/40 rounded border border-white/5">
                                        <div className="text-[8px] text-gray-500 uppercase font-bold">Profit Target</div>
                                        <div className="text-sm font-mono font-bold text-green-400">${tacticalAdvice.target || 'N/A'}</div>
                                    </div>
                                    <div className="p-2 bg-black/40 rounded border border-white/5">
                                        <div className="text-[8px] text-gray-500 uppercase font-bold">Risk/Reward</div>
                                        <div className={`text-sm font-mono font-bold italic ${(Math.abs(tacticalAdvice.target - tacticalAdvice.entry) / Math.abs(tacticalAdvice.entry - tacticalAdvice.stop)) >= 2 ? 'text-green-400' : 'text-amber-400'}`}>
                                            {tacticalAdvice.entry && tacticalAdvice.stop && tacticalAdvice.target
                                                ? `${(Math.abs(tacticalAdvice.target - tacticalAdvice.entry) / Math.abs(tacticalAdvice.entry - tacticalAdvice.stop)).toFixed(2)}:1`
                                                : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden relative">
                    <div ref={chartContainerRef} className="w-full h-[900px] relative">
                        {/* Pane Labels */}
                        {!isWeekly && (
                            <>
                                <div className="absolute left-[65px] top-[58%] z-10 text-[9px] font-black text-gray-500 uppercase tracking-tighter pointer-events-none bg-gray-900/40 px-1 rounded">MACD</div>
                                <div className="absolute left-[65px] top-[74%] z-10 text-[9px] font-black text-gray-500 uppercase tracking-tighter pointer-events-none bg-gray-900/40 px-1 rounded">Force (13)</div>
                                <div className="absolute left-[65px] top-[88%] z-10 text-[9px] font-black text-gray-500 uppercase tracking-tighter pointer-events-none bg-gray-900/40 px-1 rounded">Force (2)</div>
                            </>
                        )}
                        {isWeekly && (
                            <div className="absolute left-[65px] top-[75%] z-10 text-[9px] font-black text-gray-500 uppercase tracking-tighter pointer-events-none bg-gray-900/40 px-1 rounded">MACD</div>
                        )}
                    </div>

                    {/* F13 Divergence Alert */}
                    {f13Divergence && (
                        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-4 shadow-lg ${f13Divergence.type === 'bearish'
                            ? 'bg-purple-900/30 border-purple-500/50 shadow-purple-900/10'
                            : 'bg-indigo-900/30 border-indigo-500/50 shadow-indigo-900/10'
                            }`}>
                            <div className={`p-2 rounded-lg ${f13Divergence.type === 'bearish' ? 'bg-purple-500/20' : 'bg-indigo-500/20'}`}>
                                <Zap size={24} className={f13Divergence.type === 'bearish' ? 'text-purple-400' : 'text-indigo-400'} />
                            </div>
                            <div>
                                <h4 className={`text-sm font-black uppercase tracking-wider mb-1 ${f13Divergence.type === 'bearish' ? 'text-purple-400' : 'text-indigo-400'}`}>
                                    Critical F13 {f13Divergence.type} Divergence
                                </h4>
                                <p className="text-sm text-gray-300 leading-relaxed">
                                    Force Index (13) is diverging from Price action.
                                    {f13Divergence.type === 'bearish'
                                        ? " Price is making higher highs while Force Index marks lower highs. Smart money volume is fading."
                                        : " Price is making lower lows while Force Index marks higher lows. Selling pressure is exhausting."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Area (Right) */}
            <div className="w-full lg:w-[450px] flex-shrink-0 flex flex-col gap-6 lg:sticky lg:top-6">
                {/* Quick Journal Input */}
                <div className="bg-gray-800 border-2 border-blue-500/20 p-6 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Notebook className="text-blue-400" size={20} />
                            <h3 className="text-lg font-bold text-white">Trading Journal</h3>
                        </div>
                        <button
                            onClick={() => setShowJournal(!showJournal)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest"
                        >
                            {showJournal ? "Hide History" : `Show History (${journalEntries.length})`}
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search your notes..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={`Record your ${timeframeLabel} observations, emotions, or logic here...`}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition h-32 resize-none"
                        />
                        <div className="flex justify-between gap-2">
                            <button
                                onClick={applyElderTemplate}
                                className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
                            >
                                Elder Template
                            </button>
                            <button
                                onClick={handleSaveJournal}
                                disabled={isSaving || !note.trim()}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all transform active:scale-95"
                            >
                                {isSaving ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                                ) : (
                                    <Camera size={18} />
                                )}
                                Record Snapshot & Note
                            </button>
                        </div>
                    </div>

                    {showJournal && journalEntries.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-gray-700/50 flex flex-col gap-6 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                            {journalEntries
                                .filter(entry =>
                                    entry.note.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((entry, idx) => (
                                    <div key={idx} className="bg-gray-900/80 border border-gray-700/50 rounded-2xl overflow-hidden group flex-shrink-0 shadow-lg">
                                        <div className="p-3 border-b border-gray-700/50 bg-gray-950/40 flex items-center justify-between px-4">
                                            <div className="flex items-center gap-3">
                                                <Calendar size={14} className="text-blue-400/60" />
                                                <span className="text-[11px] font-mono text-gray-400">
                                                    {new Date(entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </span>
                                                <span className="text-[9px] px-1.5 py-0.5 bg-gray-900 text-blue-400 rounded font-black uppercase tracking-widest border border-blue-900/20">
                                                    {entry.timeframe}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {entry.snapshot && (
                                                    <button
                                                        onClick={() => setSelectedImage(entry.snapshot)}
                                                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 transition-all flex items-center gap-1.5"
                                                        title="View Chart Snapshot"
                                                    >
                                                        <Camera size={14} />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Chart</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setEditingId(entry.id);
                                                        setEditingNote(entry.note);
                                                    }}
                                                    className="text-gray-500 hover:text-blue-400 transition-colors p-1.5"
                                                    title="Edit Entry"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteJournal(entry.id)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors p-1.5"
                                                    title="Delete Entry"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-950/20">
                                            {editingId === entry.id ? (
                                                <div className="flex flex-col gap-3">
                                                    <textarea
                                                        value={editingNote}
                                                        onChange={(e) => setEditingNote(e.target.value)}
                                                        className="w-full bg-gray-900 border border-blue-500/50 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition h-32 resize-none"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="text-xs text-gray-400 hover:text-white font-bold uppercase tracking-widest px-2"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateJournal(entry.id)}
                                                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                        >
                                                            Save Changes
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-100 leading-relaxed font-medium whitespace-pre-line">
                                                    {entry.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>

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
                        alt="Full size snapshot"
                        className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-white/10"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default ElderAnalysis;
