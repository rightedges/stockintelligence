import React, { useState, useEffect, useRef } from 'react';
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    HistogramSeries,
    CrosshairMode,
    createSeriesMarkers
} from 'lightweight-charts';
import { Zap, Info, Notebook, Camera, Calendar, Trash2, Search, AlertTriangle, Edit, ShieldCheck, ArrowUpRight, Globe, Layers, Plus } from 'lucide-react';
import { saveJournalEntry, getJournalEntries, updateJournalEntry, deleteJournalEntry } from '../services/api';
import { X } from 'lucide-react';
import TradeEntryModal from './TradeEntryModal';

const ElderAnalysis = ({ data, symbol, srLevels = [], tacticalAdvice, macdDivergence, timeframeLabel = 'Daily', regimeData }) => {
    console.log('ElderAnalysis Init', { symbol, dataLength: data?.length, timeframeLabel });
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
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [tradeModalInitialData, setTradeModalInitialData] = useState({});
    const [snapshot, setSnapshot] = useState(null);
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
            rightPriceScale: {
                borderColor: gridColor,
                visible: true,
                autoScale: true,
                minimumWidth: 80
            },
            leftPriceScale: {
                borderColor: gridColor,
                visible: true,
                autoScale: true,
                minimumWidth: 80
            },
            crosshair: { mode: CrosshairMode.Normal },
            localization: {
                priceFormatter: (price) => (price || 0).toFixed(2),
            },
        });
        console.log('Chart Created', chart);

        chartRef.current = chart;

        // Initialize Series
        const isWeekly = timeframeLabel === 'Weekly';
        const s = {};

        // 2. Add Series
        s.candles = chart.addSeries(CandlestickSeries, { priceScaleId: 'right' });
        s.ema13 = chart.addSeries(LineSeries, { color: '#60a5fa', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });

        if (!isWeekly) {
            s.ema26 = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
            s.ema22 = chart.addSeries(LineSeries, { color: 'rgba(255, 255, 255, 0.5)', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });

            // Price ATR Channels
            const priceBandOptions = (style) => ({
                color: 'rgba(255, 255, 255, 0.15)',
                lineWidth: 1,
                lineStyle: style,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
            });
            s.priceH1 = chart.addSeries(LineSeries, priceBandOptions(2)); // Dotted
            s.priceL1 = chart.addSeries(LineSeries, priceBandOptions(2));
            s.priceH2 = chart.addSeries(LineSeries, priceBandOptions(3)); // Dashed
            s.priceL2 = chart.addSeries(LineSeries, priceBandOptions(3));
            s.priceH3 = chart.addSeries(LineSeries, { ...priceBandOptions(0), color: 'rgba(255, 255, 255, 0.3)' }); // Solid gray
            s.priceL3 = chart.addSeries(LineSeries, { ...priceBandOptions(0), color: 'rgba(255, 255, 255, 0.3)' });
        }

        s.volume = chart.addSeries(HistogramSeries, { priceScaleId: 'volume', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false });
        s.volumeSMA = chart.addSeries(LineSeries, { priceScaleId: 'volume', color: '#f59e0b', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });

        s.macdHist = chart.addSeries(HistogramSeries, {
            priceScaleId: 'macd',
            lastValueVisible: true,
            priceLineVisible: false,
            priceFormat: { precision: 2, minMove: 0.01 }
        });

        if (!isWeekly) {
            s.macdSignal = chart.addSeries(LineSeries, { priceScaleId: 'macd', color: '#ef4444', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
            s.force2 = chart.addSeries(HistogramSeries, {
                priceScaleId: 'force2',
                lastValueVisible: true,
                priceLineVisible: false,
                priceFormat: { precision: 1, minMove: 0.1 }
            });
            s.force13 = chart.addSeries(LineSeries, {
                priceScaleId: 'force13',
                color: '#60a5fa', // Blue
                lineWidth: 3,
                lastValueVisible: true,
                priceLineVisible: false,
            });
            s.force13Sig = chart.addSeries(LineSeries, {
                priceScaleId: 'force13',
                color: '#ef4444', // Red
                lineWidth: 1,
                lastValueVisible: false,
                priceLineVisible: false,
            });
            // ATR Bands
            const bandOptions = (style) => ({
                priceScaleId: 'force13',
                color: 'rgba(156, 163, 175, 0.4)', // Gray-400
                lineWidth: 1,
                lineStyle: style,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
            });
            s.efiH1 = chart.addSeries(LineSeries, bandOptions(2)); // Dotted
            s.efiL1 = chart.addSeries(LineSeries, bandOptions(2));
            s.efiH2 = chart.addSeries(LineSeries, bandOptions(3)); // Dashed
            s.efiL2 = chart.addSeries(LineSeries, bandOptions(3));
            s.efiH3 = chart.addSeries(LineSeries, { ...bandOptions(0), color: 'rgba(156, 163, 175, 0.8)' }); // Solid gray
            s.efiL3 = chart.addSeries(LineSeries, { ...bandOptions(0), color: 'rgba(156, 163, 175, 0.8)' });

            // Signal Dots
            s.efiDotsHigh = chart.addSeries(LineSeries, {
                priceScaleId: 'force13',
                color: '#ef4444',
                lineWidth: 0,
                pointShape: 'circle',
                pointSize: 4,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
            });
            s.efiDotsLow = chart.addSeries(LineSeries, {
                priceScaleId: 'force13',
                color: '#22c55e',
                lineWidth: 0,
                pointShape: 'circle',
                pointSize: 4,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
            });
        }

        // Divergence Lines (Bind to correct scales)
        s.divMacdPrice = chart.addSeries(LineSeries, { color: 'rgba(255, 165, 0, 0.8)', lineWidth: 2, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
        s.divMacdInd = chart.addSeries(LineSeries, { priceScaleId: 'macd', color: 'rgba(255, 165, 0, 0.8)', lineWidth: 2, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });

        seriesRef.current = s;

        // 3. Configure Scales (Decoupled Layout)
        // Main Pane (OHLC): 0% - 50%
        chart.priceScale('right').applyOptions({
            scaleMargins: isWeekly ? { top: 0.1, bottom: 0.3 } : { top: 0.05, bottom: 0.5 },
        });

        // Volume Overlay (Bottom of OHLC Pane): 38% - 50%
        chart.priceScale('volume').applyOptions({
            scaleMargins: isWeekly ? { top: 0.55, bottom: 0.3 } : { top: 0.38, bottom: 0.5 },
            visible: false
        });

        // MACD Pane: 54% - 68% (4% Gap)
        chart.priceScale('macd').applyOptions({
            position: 'left',
            visible: true,
            borderColor: gridColor,
            scaleMargins: isWeekly ? { top: 0.75, bottom: 0 } : { top: 0.54, bottom: 0.32 },
            autoScale: true,
        });

        if (!isWeekly) {
            // Force 13 Pane: 71% - 84% (3% Gap)
            chart.priceScale('force13').applyOptions({
                position: 'left',
                visible: true,
                borderColor: gridColor,
                scaleMargins: { top: 0.71, bottom: 0.16 },
                autoScale: true,
            });
            // Force 2 Pane: 87% - 100% (3% Gap)
            chart.priceScale('force2').applyOptions({
                position: 'left',
                visible: true,
                borderColor: gridColor,
                scaleMargins: { top: 0.87, bottom: 0 },
                autoScale: true,
            });
        }

        if (!chartContainerRef.current) return;
        const container = chartContainerRef.current;

        // Legends Container (one for each pane, using px for stability)
        const createLegend = (topPx, side = 'left') => {
            if (!container) return null;
            const leg = document.createElement('div');
            leg.style = `
                position: absolute; ${side}: 12px; top: ${topPx}px; z-index: 100;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.9);
                pointer-events: none;
                display: flex; flex-direction: column; gap: 2px;
                background: rgba(17, 24, 39, 0.85);
                padding: 6px 10px;
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            `;
            container.appendChild(leg);
            return leg;
        };

        const priceLegend = createLegend(80);
        const macdLegend = createLegend(isWeekly ? 675 : 522); // All on Left
        const force13Legend = !isWeekly ? createLegend(666) : null;
        const force2Legend = !isWeekly ? createLegend(792) : null;

        legendRef.current = { price: priceLegend, macd: macdLegend, f13: force13Legend, f2: force2Legend };

        // Resizer
        const observer = new ResizeObserver(entries => {
            if (entries[0] && chartRef.current) {
                chartRef.current.applyOptions({ width: entries[0].contentRect.width });
            }
        });
        observer.observe(container);

        return () => {
            if (legendRef.current) {
                Object.values(legendRef.current).forEach(l => {
                    try { if (l && container.contains(l)) container.removeChild(l); } catch (e) { }
                });
            }
            legendRef.current = null;
            srLineRefs.current = [];
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
        console.log('Updating Series Data Effect', { hasChart: !!chartRef.current, hasData: !!data });
        if (!chartRef.current || !data || data.length === 0) return;
        const s = seriesRef.current;
        const isWeekly = timeframeLabel === 'Weekly';

        const safeSetData = (series, seriesData, label) => {
            if (!series) return;
            try {
                series.setData(seriesData);
            } catch (err) {
                console.error(`FAILED to set ${label}:`, err);
            }
        };

        const candleData = [], ema13Data = [], ema22Data = [], ema26Data = [], priceH1Data = [], priceL1Data = [], priceH2Data = [], priceL2Data = [], priceH3Data = [], priceL3Data = [], macdHistData = [], macdSignalData = [], force2Data = [], force13Data = [], ema13DataForce = [], efiH1Data = [], efiL1Data = [], efiH2Data = [], efiL2Data = [], efiH3Data = [], efiL3Data = [], efiDotsHighData = [], efiDotsLowData = [], volumeData = [], volumeSMAData = [];

        const processedTimes = new Set();
        data.forEach(d => {
            if (!d || !d.Date) return;
            const time = d.Date.split('T')[0];
            if (processedTimes.has(time)) return;
            processedTimes.add(time);

            const candleColor = d.impulse === 'green' ? '#22c55e' : d.impulse === 'red' ? '#ef4444' : '#60a5fa';

            candleData.push({ time, open: d.Open, high: d.High, low: d.Low, close: d.Close, color: candleColor, wickColor: candleColor, borderColor: candleColor });
            if (d.ema_13) ema13Data.push({ time, value: d.ema_13 });

            if (!isWeekly) {
                if (d.ema_22) ema22Data.push({ time, value: d.ema_22 });
                if (d.ema_26) ema26Data.push({ time, value: d.ema_26 });

                if (d.price_atr_h1) priceH1Data.push({ time, value: d.price_atr_h1 });
                if (d.price_atr_l1) priceL1Data.push({ time, value: d.price_atr_l1 });
                if (d.price_atr_h2) priceH2Data.push({ time, value: d.price_atr_h2 });
                if (d.price_atr_l2) priceL2Data.push({ time, value: d.price_atr_l2 });
                if (d.price_atr_h3) priceH3Data.push({ time, value: d.price_atr_h3 });
                if (d.price_atr_l3) priceL3Data.push({ time, value: d.price_atr_l3 });
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

            if (!isWeekly && d.efi_truncated !== undefined && d.efi_truncated !== null) {
                force13Data.push({ time, value: d.efi_truncated });
                if (d.efi_signal) ema13DataForce.push({ time, value: d.efi_signal });
                if (d.efi_atr_h1) efiH1Data.push({ time, value: d.efi_atr_h1 });
                if (d.efi_atr_l1) efiL1Data.push({ time, value: d.efi_atr_l1 });
                if (d.efi_atr_h2) efiH2Data.push({ time, value: d.efi_atr_h2 });
                if (d.efi_atr_l2) efiL2Data.push({ time, value: d.efi_atr_l2 });
                if (d.efi_atr_h3) efiH3Data.push({ time, value: d.efi_atr_h3 });
                if (d.efi_atr_l3) efiL3Data.push({ time, value: d.efi_atr_l3 });

                if (d.efi_extreme_high) efiDotsHighData.push({ time, value: d.efi_truncated });
                if (d.efi_extreme_low) efiDotsLowData.push({ time, value: d.efi_truncated });
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

        safeSetData(s.candles, candleData, 'Candles');
        safeSetData(s.ema13, ema13Data, 'EMA13');
        safeSetData(s.ema26, ema26Data, 'EMA26');
        safeSetData(s.ema22, ema22Data, 'EMA22');
        safeSetData(s.priceH1, priceH1Data, 'PriceH1');
        safeSetData(s.priceL1, priceL1Data, 'PriceL1');
        safeSetData(s.priceH2, priceH2Data, 'PriceH2');
        safeSetData(s.priceL2, priceL2Data, 'PriceL2');
        safeSetData(s.priceH3, priceH3Data, 'PriceH3');
        safeSetData(s.priceL3, priceL3Data, 'PriceL3');

        safeSetData(s.macdHist, macdHistData, 'MACD Hist');
        safeSetData(s.macdSignal, macdSignalData, 'MACD Signal');

        safeSetData(s.force2, force2Data, 'Force2');
        safeSetData(s.force13, force13Data, 'Force13');
        safeSetData(s.force13Sig, ema13DataForce, 'Force13 Signal');

        safeSetData(s.efiH1, efiH1Data, 'EFI H1');
        safeSetData(s.efiL1, efiL1Data, 'EFI L1');
        safeSetData(s.efiH2, efiH2Data, 'EFI H2');
        safeSetData(s.efiL2, efiL2Data, 'EFI L2');
        safeSetData(s.efiH3, efiH3Data, 'EFI H3');
        safeSetData(s.efiL3, efiL3Data, 'EFI L3');

        safeSetData(s.efiDotsHigh, efiDotsHighData, 'EFI High');
        safeSetData(s.efiDotsLow, efiDotsLowData, 'EFI Low');

        safeSetData(s.volume, volumeData, 'Volume');
        safeSetData(s.volumeSMA, volumeSMAData, 'Volume SMA');

        // Render Divergence Trendlines
        if (macdDivergence && data[macdDivergence.idx1] && data[macdDivergence.idx2]) {
            const p1 = data[macdDivergence.idx1];
            const p2 = data[macdDivergence.idx2];
            if (p1?.Date && p2?.Date) {
                const time1 = p1.Date.split('T')[0];
                const time2 = p2.Date.split('T')[0];
                const color = macdDivergence.type === 'bearish' ? '#ef4444' : '#22c55e';

                s.divMacdPrice.applyOptions({ color });
                s.divMacdInd.applyOptions({ color });

                // Price Line: Connect Highs (Bearish) or Lows (Bullish)
                const priceVal1 = macdDivergence.type === 'bearish' ? p1.High : p1.Low;
                const priceVal2 = macdDivergence.type === 'bearish' ? p2.High : p2.Low;
                if (s.divMacdPrice) safeSetData(s.divMacdPrice, [{ time: time1, value: priceVal1 }, { time: time2, value: priceVal2 }], 'DivPrice');

                // Indicator Line
                if (s.divMacdInd) safeSetData(s.divMacdInd, [{ time: time1, value: p1.macd_diff || 0 }, { time: time2, value: p2.macd_diff || 0 }], 'DivInd');
            }
        } else {
            if (s.divMacdPrice) safeSetData(s.divMacdPrice, [], 'DivPrice');
            if (s.divMacdInd) safeSetData(s.divMacdInd, [], 'DivInd');
        }

        if (!data || data.length === 0) return;

        // Render Signal Markers on Candles
        const markers = [];
        const seenTimes = new Set();

        data.forEach((d, idx) => {
            if (!d || !d.Date) return;
            const time = d.Date.split('T')[0];
            if (seenTimes.has(time)) return;

            if (d.efi_buy_signal) {
                markers.push({ time, position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'EFI BUY' });
                seenTimes.add(time);
            } else if (d.efi_sell_signal) {
                markers.push({ time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'EFI SELL' });
                seenTimes.add(time);
            }
        });
        try {
            if (s.candles) {
                if (!s.markersPlugin) {
                    s.markersPlugin = createSeriesMarkers(s.candles, []);
                }
                s.markersPlugin.setMarkers(markers);
            }
        } catch (e) {
            console.error('Error setting markers plugin', e);
        }

        // Support & Resistance Lines Cleanup
        if (s.candles) {
            srLineRefs.current.forEach(line => {
                try { s.candles.removePriceLine(line); } catch (e) { }
            });
            srLineRefs.current = [];
        }

        srLevels.forEach(level => {
            if (!level || typeof level.price !== 'number' || !level.type) return;
            const line = s.candles.createPriceLine({
                price: level.price,
                color: level.type === 'resistance' ? '#ef4444' : '#22c55e',
                lineWidth: 1.5,
                lineStyle: 1,
                axisLabelVisible: false,
                title: (level.type || 'SR').toUpperCase(),
            });
            srLineRefs.current.push(line);
        });

        chartRef.current.timeScale().fitContent();
    }, [data, symbol, srLevels]);

    // Legend interaction Logic
    useEffect(() => {
        console.log('Legend Interaction Effect', { hasChart: !!chartRef.current, hasData: !!data });
        if (!chartRef.current || !data || data.length === 0) return;

        const chart = chartRef.current;
        const s = seriesRef.current;

        const updateLegend = (d) => {
            if (!d || !legendRef.current) return;
            const isWeekly = timeframeLabel === 'Weekly';
            const { price, macd, f13, f2 } = legendRef.current;

            if (price) {
                price.innerHTML = `
                    <div style="font-size: 13px; font-weight: 700; color: #e5e7eb; margin-bottom: 2px;">
                        ${symbol} <span style="font-size: 10px; color: #9ca3af; font-weight: 400;">${timeframeLabel}</span>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span style="color: #9ca3af;">O</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Open?.toFixed(2) || '0.00'}</span>
                        <span style="color: #9ca3af;">H</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.High?.toFixed(2) || '0.00'}</span>
                        <span style="color: #9ca3af;">L</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Low?.toFixed(2) || '0.00'}</span>
                        <span style="color: #9ca3af;">C</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Close?.toFixed(2) || '0.00'}</span>
                        <span style="color: #60a5fa">EMA13 ${d.ema_13?.toFixed(2) || ''}</span>
                        ${!isWeekly ? `<span style="color: #f59e0b">EMA26 ${d.ema_26?.toFixed(2) || ''}</span>` : ''}
                        ${!isWeekly ? `<span style="color: rgba(255, 255, 255, 0.7)">EMA22 ${d.ema_22?.toFixed(2) || ''} (Channels)</span>` : ''}
                        <span style="color: #94a3b8">Vol ${d.Volume ? (d.Volume / 1000000).toFixed(2) : '0.00'}M</span>
                    </div>
                `;
            }

            if (macd) {
                macd.innerHTML = `
                    <div style="font-weight: 700; color: #34d399; margin-bottom: 2px;">MACD Histogram</div>
                    <div style="display: flex; gap: 8px;">
                        <span style="color: #34d399">Value ${d.macd_diff?.toFixed(2) || '0.00'}</span>
                        ${!isWeekly ? `<span style="color: #ef4444">Signal ${d.macd_signal?.toFixed(2) || '0.00'}</span>` : ''}
                    </div>
                `;
            }

            if (f13 && !isWeekly) {
                let extremeText = '';
                if (d.efi_buy_signal) extremeText = ' (BOTTOM EXTREME)';
                if (d.efi_sell_signal) extremeText = ' (TOP EXTREME)';

                f13.innerHTML = `
                    <div style="font-weight: 700; color: #60a5fa; margin-bottom: 2px;">Force Index (ATR Channels)</div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span style="color: #60a5fa">EFI ${d.efi ? (d.efi / 1000000).toFixed(2) + 'M' : '0.00M'}${extremeText}</span>
                        <span style="color: #ef4444">Signal ${d.efi_signal ? (d.efi_signal / 1000000).toFixed(2) + 'M' : '0.00M'}</span>
                    </div>
                `;
            }

            if (f2 && !isWeekly) {
                f2.innerHTML = `
                    <div style="font-weight: 700; color: #a78bfa; margin-bottom: 2px;">Force Index (2)</div>
                    <div style="color: #a78bfa">Value ${d.force_index_2 ? (d.force_index_2 / 1000).toFixed(1) + 'K' : '0.0K'}</div>
                `;
            }
        };

        const handleCrosshairMove = param => {
            if (!s || !s.candles) return;
            const last = data[data.length - 1];

            if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
                updateLegend(last);
            } else {
                // Defensive check for param.time because it can be an object or string
                let timeStr;
                if (typeof param.time === 'string') {
                    timeStr = param.time;
                } else if (param.time && typeof param.time === 'object') {
                    timeStr = `${param.time.year}-${String(param.time.month).padStart(2, '0')}-${String(param.time.day).padStart(2, '0')}`;
                }

                if (!timeStr) {
                    updateLegend(last);
                    return;
                }

                const item = data.find(d => d.Date && d.Date.split('T')[0] === timeStr) || last;
                if (!item) return;

                const e13 = s.ema13 ? param.seriesData.get(s.ema13) : null;
                const e26 = s.ema26 ? param.seriesData.get(s.ema26) : null;
                const mh = s.macdHist ? param.seriesData.get(s.macdHist) : null;
                const ms = s.macdSignal ? param.seriesData.get(s.macdSignal) : null;
                const f2 = s.force2 ? param.seriesData.get(s.force2) : null;
                const priceData = param.seriesData.get(s.candles);

                updateLegend({
                    ...item,
                    Open: priceData?.open || item?.Open,
                    High: priceData?.high || item?.High,
                    Low: priceData?.low || item?.Low,
                    Close: priceData?.close || priceData?.value || item?.Close,
                    ema_13: e13?.value ?? item?.ema_13,
                    ema_26: e26?.value ?? item?.ema_26,
                    ema_22: item?.ema_22,
                    macd_diff: mh?.value ?? item?.macd_diff,
                    macd_signal: ms?.value ?? item?.macd_signal,
                    force_index_2: f2?.value ?? item?.force_index_2,
                    // Use item values for EFI fields since they aren't easily extracted from multiple series
                    efi: item?.efi,
                    efi_signal: item?.efi_signal,
                    efi_extreme_high: item?.efi_extreme_high,
                    efi_extreme_low: item?.efi_extreme_low,
                    Volume: s.volume ? param.seriesData.get(s.volume)?.value || item?.Volume : item?.Volume,
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


                    {/* Divergence Alerts (Unified - Top Banner) */}
                    {(() => {
                        const isFresh = (macdDivergence?.recency < 5);

                        // 1. MACD Divergence
                        if (macdDivergence && isFresh) {
                            return (
                                <div className={`mb-8 p-4 rounded-xl border-l-4 flex items-start gap-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-500 ${macdDivergence.type === 'bearish'
                                    ? 'bg-red-900/30 border-red-500/40 shadow-red-900/10'
                                    : 'bg-green-900/30 border-green-500/40 shadow-green-900/10'
                                    }`}>
                                    <div className={`p-2 rounded-lg ${macdDivergence.type === 'bearish' ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                                        <AlertTriangle size={24} className={macdDivergence.type === 'bearish' ? 'text-red-400' : 'text-green-400'} />
                                    </div>
                                    <div>
                                        <h4 className={`font-black uppercase tracking-widest text-sm mb-1 ${macdDivergence.type === 'bearish' ? 'text-red-400' : 'text-green-400'}`}>
                                            CRITICAL {macdDivergence.type} DIVERGENCE DETECTED
                                        </h4>
                                        <p className="text-gray-300 text-sm leading-relaxed">
                                            {macdDivergence.type === 'bearish'
                                                ? "Price is making a higher high while momentum (MACD) is weakening. A sharp reversal may be imminent."
                                                : "Price is making a lower low while momentum (MACD) is strengthening. A bottom may be forming."}
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        return null;
                    })()}

                    <div className={`grid grid-cols-1 ${isWeekly ? '' : 'lg:grid-cols-3'} gap-8 relative z-10`}>

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

                        {!isWeekly && (
                            <>
                                {/* COL 2: WAVE */}
                                <div className={`p-5 rounded-2xl border transition-all duration-300 ${tacticalAdvice?.screen2?.force_index_2 < 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                                    <div className="text-[10px] text-gray-500 uppercase font-black mb-3 tracking-widest flex items-center justify-between">
                                        SCREEN 2: THE WAVE (OSCILLATORS)
                                        <span className={`px-2 py-0.5 rounded text-[8px] ${tacticalAdvice?.screen2?.force_index_2 < 0 ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}>
                                            {tacticalAdvice?.screen2?.force_index_2 < 0 ? 'BEARS CONTROL' : 'BULLS CONTROL'}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-2 mb-4">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-400 italic">Force Index (2)</span>
                                            <span className={tacticalAdvice?.screen2?.force_index_2 < 0 ? 'text-blue-400 font-bold' : 'text-amber-400 font-bold'}>
                                                {tacticalAdvice?.screen2?.force_index_2?.toFixed(0) || '0'} ({tacticalAdvice?.screen2?.f2_streak || 0}d)
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-400 italic">Williams %R (14)</span>
                                            <span className={tacticalAdvice?.screen2?.williams_r < -80 ? 'text-green-400 font-bold' : tacticalAdvice?.screen2?.williams_r > -20 ? 'text-red-400 font-bold' : 'text-gray-200'}>
                                                {tacticalAdvice?.screen2?.williams_r?.toFixed(1) || '-0.0'}%
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-400 italic">Stochastic %K</span>
                                            <span className={tacticalAdvice?.screen2?.stoch_k < 20 ? 'text-green-400 font-bold' : tacticalAdvice?.screen2?.stoch_k > 80 ? 'text-red-400 font-bold' : 'text-gray-200'}>
                                                {tacticalAdvice?.screen2?.stoch_k?.toFixed(1) || '0.0'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                        <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Tactical State</div>
                                        <span className={`text-xs font-mono ${tacticalAdvice?.screen2?.status === 'Oversold' ? 'text-green-400' : tacticalAdvice?.screen2?.status === 'Overbought' ? 'text-red-400' : 'text-blue-300'}`}>
                                            {tacticalAdvice?.screen2?.status} {tacticalAdvice?.screen2?.wave_intensity === 'High' ? '(Extremely Volatile)' : ''}
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
                                        <p className="text-sm text-gray-200 leading-relaxed font-bold italic mb-2">
                                            "{tacticalAdvice?.reason}"
                                        </p>
                                        <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                                            <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Screen 3: The Ripple</div>
                                            <p className="text-xs text-blue-100 leading-snug">
                                                {tacticalAdvice?.ripple_msg}
                                            </p>
                                        </div>
                                    </div>

                                    {/* EFI Signal Override */}
                                    {lastData && (lastData.efi_buy_signal || lastData.efi_sell_signal) && (
                                        <div className={`mt-3 p-3 rounded-xl border flex items-center gap-3 animation-pulse ${lastData.efi_buy_signal ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'}`}>
                                            <Zap size={16} className={lastData.efi_buy_signal ? 'text-green-400' : 'text-red-400'} fill="currentColor" />
                                            <div>
                                                <div className={`text-[10px] font-black uppercase tracking-widest ${lastData.efi_buy_signal ? 'text-green-400' : 'text-red-400'}`}>
                                                    EFI {lastData.efi_buy_signal ? 'BUY' : 'SELL'} SIGNAL
                                                </div>
                                                <div className="text-[10px] text-gray-300 leading-tight">
                                                    {lastData.efi_buy_signal ? 'Oversold extreme. Look for entry.' : 'Overbought extreme. Tighten stops.'}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Execution Grid */}
                                    {tacticalAdvice && (
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
                                                <div className={`text-sm font-mono font-bold italic ${(Math.abs((tacticalAdvice?.target || 0) - (tacticalAdvice?.entry || 0)) / Math.abs((tacticalAdvice?.entry || 0) - (tacticalAdvice?.stop || 1))) >= 2 ? 'text-green-400' : 'text-amber-400'}`}>
                                                    {tacticalAdvice.entry && tacticalAdvice.stop && tacticalAdvice.target
                                                        ? `${(Math.abs(tacticalAdvice.target - tacticalAdvice.entry) / Math.abs(tacticalAdvice.entry - tacticalAdvice.stop)).toFixed(2)}:1`
                                                        : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden relative">

                    {/* --- Market Context Header --- */}
                    {regimeData && (
                        <div className="absolute top-6 left-6 right-6 z-20 flex flex-wrap items-center gap-4 px-4 py-2 bg-gray-900/80 border border-gray-700/50 rounded-xl backdrop-blur-md shadow-lg transform transition-all hover:bg-gray-900/95">

                            {/* Macro Status */}
                            <div className="flex items-center gap-2" title={`Macro: ${regimeData.macro_status} | Trend: ${regimeData.regime}`}>
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${regimeData.macro_status === 'Risk-On' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                    <Globe size={12} />
                                    {regimeData.macro_status}
                                </div>
                            </div>

                            <div className="w-[1px] h-4 bg-gray-700" />

                            {/* Sector Status */}
                            <div className="flex items-center gap-2" title={`Sector: ${regimeData.sector_analysis?.stock_sector}`}>
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${regimeData.sector_analysis?.is_leading ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'}`}>
                                    <Layers size={12} />
                                    {regimeData.sector_analysis?.is_leading ? 'Leading Sector' : regimeData.sector_analysis?.stock_sector || 'Sector'}
                                </div>
                            </div>

                            <div className="w-[1px] h-4 bg-gray-700" />

                            {/* Strategic Verdict */}
                            <div className="flex items-center gap-2 ml-auto">
                                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest hidden sm:block">Strategy ({timeframeLabel})</span>
                                <div className={`px-3 py-1 rounded text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${(regimeData.decision?.includes('Buy') || regimeData.decision?.includes('Bullish')) ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]' :
                                    (regimeData.decision?.includes('Avoid') || regimeData.decision?.includes('Short')) ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                                        'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                                    }`}>
                                    {(regimeData.decision?.includes('Buy') || regimeData.decision?.includes('Bullish')) ? <ArrowUpRight size={14} strokeWidth={3} /> : <ShieldCheck size={14} strokeWidth={3} />}
                                    {regimeData.decision?.split('.')[0] || 'N/A'}
                                </div>
                                <button
                                    onClick={() => {
                                        if (chartRef.current) {
                                            const canvas = chartRef.current.takeScreenshot();
                                            if (canvas) {
                                                setSnapshot(canvas.toDataURL());

                                                // Auto-populate Daily Context
                                                if (lastData) {
                                                    setTradeModalInitialData({
                                                        symbol,
                                                        entry_day_high: lastData.High,
                                                        entry_day_low: lastData.Low,
                                                        upper_channel: lastData.price_atr_h3, // 3 ATR Top
                                                        lower_channel: lastData.price_atr_l3  // 3 ATR Bottom
                                                    });
                                                }

                                                setShowTradeModal(true);
                                            }
                                        }
                                    }}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 transition-all shadow-lg ml-2"
                                >
                                    <Plus size={12} />
                                    Log Trade
                                </button>
                            </div>
                        </div>
                    )}



                    <div ref={chartContainerRef} className="w-full h-[900px] relative overflow-hidden" />
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

                    {
                        showJournal && journalEntries.length > 0 && (
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
                        )
                    }
                </div >
            </div >

            {/* Image Preview Modal */}
            {
                selectedImage && (
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
                )
            }
            {/* Trade Entry Modal */}
            {
                showTradeModal && (
                    <TradeEntryModal
                        onClose={() => setShowTradeModal(false)}
                        initialData={tradeModalInitialData}
                        snapshot={snapshot}
                        onSave={() => {
                            // Refresh journal entries if needed
                        }}
                    />
                )
            }
        </div >
    );
};

export default ElderAnalysis;
