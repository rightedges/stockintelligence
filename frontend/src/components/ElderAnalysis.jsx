import React, { useState, useEffect, useRef } from 'react';
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    HistogramSeries,
    CrosshairMode
} from 'lightweight-charts';
import { Zap, Info, Notebook, Camera, Calendar, Trash2, Search, AlertTriangle, Edit, ShieldCheck, ArrowUpRight, Globe, Layers, Plus } from 'lucide-react';
import { saveJournalEntry, getJournalEntries, updateJournalEntry, deleteJournalEntry, getActiveTrade } from '../services/api';
import { X } from 'lucide-react';
import TradeEntryModal from './TradeEntryModal';

const ElderAnalysis = ({ data, symbol, srLevels = [], tacticalAdvice, macdDivergence, f13Divergence, timeframeLabel = 'Daily', regimeData, setInitError }) => {
    console.log('ElderAnalysis Init', { symbol, dataLength: data?.length, timeframeLabel });
    const lastData = data && data.length > 0 ? data[data.length - 1] : null;

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
    const [activeTrade, setActiveTrade] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default collapsed for chart space

    // Synchronization labels
    const [syncRange, setSyncRange] = useState(null);
    const [syncCrosshair, setSyncCrosshair] = useState(null);

    // Visibility toggles with persistence
    const loadSetting = (key, defaultValue) => {
        try {
            const saved = localStorage.getItem(`elder_settings_${key}`);
            return saved !== null ? JSON.parse(saved) : defaultValue;
        } catch (e) {
            console.warn(`Error loading setting ${key}`, e);
            return defaultValue;
        }
    };

    const [showValueZones, setShowValueZones] = useState(() => loadSetting('valueZones', true));
    const [showSafeZones, setShowSafeZones] = useState(() => loadSetting('safeZones', false));
    const [showSRLevels, setShowSRLevels] = useState(() => loadSetting('srLevels', true));
    const [showDivergences, setShowDivergences] = useState(() => loadSetting('divergences', true));
    const [showEMA, setShowEMA] = useState(() => loadSetting('ema', true));
    const [showMarkers, setShowMarkers] = useState(() => loadSetting('markers', true));

    // Persist settings on change
    useEffect(() => {
        localStorage.setItem('elder_settings_valueZones', JSON.stringify(showValueZones));
        localStorage.setItem('elder_settings_safeZones', JSON.stringify(showSafeZones));
        localStorage.setItem('elder_settings_srLevels', JSON.stringify(showSRLevels));
        localStorage.setItem('elder_settings_divergences', JSON.stringify(showDivergences));
        localStorage.setItem('elder_settings_ema', JSON.stringify(showEMA));
        localStorage.setItem('elder_settings_markers', JSON.stringify(showMarkers));
    }, [showValueZones, showSafeZones, showSRLevels, showDivergences, showEMA, showMarkers]);

    const priceFormatter = (price) => (price || 0).toFixed(2);

    const fetchActiveTrade = async () => {
        if (!symbol) return;
        try {
            const res = await getActiveTrade(symbol);
            if (res.data) setActiveTrade(res.data);
            else setActiveTrade(null);
        } catch (err) {
            console.error("Failed to fetch active trade", err);
        }
    };

    useEffect(() => {
        if (!symbol) return;
        const fetchAnalysis = async () => {
            // ... existing fetch logic if any ...
        };
        fetchActiveTrade();
    }, [symbol]);
    const currentImpulse = lastData?.impulse || 'blue';
    const isWeekly = timeframeLabel === 'Weekly';

    useEffect(() => {
        if (!symbol) return;
        const key = `analysis_${symbol}_${timeframeLabel}`;
        setPersistenceKey(key);
    }, [symbol, timeframeLabel]);

    const chartRef = useRef(null); // Keep for compatibility/screenshot of main
    const chartsRef = useRef({}); // Professional Multi-Pane Reference
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
    }, [symbol]);

    // Initialize Multi-Pane Integrated Professional Layout
    useEffect(() => {
        if (!chartContainerRef.current) return;
        const container = chartContainerRef.current;
        container.innerHTML = '';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0px';
        container.style.background = '#111827';
        container.style.borderRadius = '12px';
        container.style.overflow = 'hidden';
        container.style.border = '1px solid rgba(255, 255, 255, 0.05)';

        const isWeekly = timeframeLabel === 'Weekly';
        const background = { type: 'solid', color: '#111827' };
        const textColor = 'rgba(255, 255, 255, 0.9)';
        const gridColor = 'rgba(197, 203, 206, 0.05)';

        const paneConfigs = [
            { id: 'price', flex: 10 },
            { id: 'volume', flex: 1.2 },
            { id: 'macd', flex: 2 },
            { id: 'force13', flex: 2, hide: isWeekly },
            { id: 'force2', flex: 1.5, hide: isWeekly }
        ].filter(p => !p.hide);

        const charts = {};
        const legends = {};
        const containerWidth = container.clientWidth || 800;
        const containerHeight = container.clientHeight || 1000;
        const totalFlex = paneConfigs.reduce((sum, p) => sum + p.flex, 0);

        try {
            paneConfigs.forEach((p, idx) => {
                const paneDiv = document.createElement('div');
                paneDiv.style.flex = p.flex;
                paneDiv.style.minHeight = '100px';
                paneDiv.style.position = 'relative';
                paneDiv.style.borderBottom = idx < paneConfigs.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none';
                container.appendChild(paneDiv);

                const chart = createChart(paneDiv, {
                    layout: {
                        background: { type: 'solid', color: '#111827' },
                        textColor: 'rgba(255, 255, 255, 0.9)',
                    },
                    grid: {
                        vertLines: { color: 'rgba(197, 203, 206, 0.05)' },
                        horzLines: { color: 'rgba(197, 203, 206, 0.05)' },
                    },
                    width: containerWidth,
                    height: (containerHeight / totalFlex) * p.flex,
                    timeScale: {
                        visible: idx === paneConfigs.length - 1,
                        borderColor: 'rgba(197, 203, 206, 0.1)',
                        timeVisible: true,
                    },
                    rightPriceScale: {
                        borderColor: 'rgba(197, 203, 206, 0.1)',
                        visible: true,
                        autoScale: true,
                        scaleMargins: { top: 0.1, bottom: 0.1 },
                        minimumWidth: 130,
                    },
                    leftPriceScale: { visible: false },
                    crosshair: {
                        mode: CrosshairMode.Normal,
                        vertLine: {
                            labelVisible: idx === paneConfigs.length - 1,
                            color: 'rgba(255, 255, 255, 0.75)',
                            width: 1,
                            style: 0,
                            labelBackgroundColor: '#4f46e5',
                        },
                        horzLine: {
                            labelBackgroundColor: '#4f46e5',
                            color: 'rgba(255, 255, 255, 0.75)',
                            visible: p.id === 'price',
                            labelVisible: p.id === 'price',
                        },
                    },
                    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
                    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
                });

                if (!chart) throw new Error(`Chart Creation Failed for pane: ${p.id}`);
                console.log(`Pane Init [${p.id}]:`, Object.keys(chart));
                charts[p.id] = chart;

                const leg = document.createElement('div');
                leg.style = `
                    position: absolute; left: 12px; top: 6px; z-index: 10;
                    font-family: -apple-system, sans-serif; font-size: 11px;
                    color: rgba(255, 255, 255, 0.7); pointer-events: none;
                    display: flex; flex-direction: column; gap: 0px;
                    background: rgba(17, 24, 39, 0.4); padding: 2px 6px; border-radius: 4px;
                `;
                paneDiv.appendChild(leg);
                legends[p.id] = leg;
            });

            chartsRef.current = charts;
        } catch (e) {
            console.error("Multi-Pane Init Failure", e);
            setInitError(`CHART INIT FAILED: ${e.message}. Please verify lightweight-charts version.`);
        }
        chartRef.current = charts.price;
        legendRef.current = legends;

        // --- Defensive Series Creation Wrapper ---
        const createSeries = (chart, type, options = {}) => {
            if (!chart) return null;
            try {
                // v4/v5 modern methods
                if (type === 'Candlestick' && chart.addCandlestickSeries) return chart.addCandlestickSeries(options);
                if (type === 'Line' && chart.addLineSeries) return chart.addLineSeries(options);
                if (type === 'Histogram' && chart.addHistogramSeries) return chart.addHistogramSeries(options);

                // Fallback for older versions or weird module binding
                if (chart.addSeries) {
                    const SeriesTypes = { 'Candlestick': CandlestickSeries, 'Line': LineSeries, 'Histogram': HistogramSeries };
                    return chart.addSeries(SeriesTypes[type], options);
                }

                throw new Error(`MISSING SERIES METHODS! Keys: ${Object.keys(chart).join(', ')}`);
            } catch (err) {
                console.error(`Series Creation Error [${type}]:`, err);
                const keys = chart ? Object.keys(chart).join(', ') : 'null';
                setInitError(`SERIES CRASH [${type}]: ${err.message}. Available methods: ${keys}`);
                return null;
            }
        };

        const s = {};
        s.anchors = {};

        if (!charts.price) return; // Fail safe

        // 1. Price Pane
        s.candles = createSeries(charts.price, 'Candlestick');
        if (!s.candles) return; // Stop if core series fails

        s.ema13 = createSeries(charts.price, 'Line', { color: '#60a5fa', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });

        if (!isWeekly) {
            s.ema26 = createSeries(charts.price, 'Line', { color: '#f59e0b', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
            s.ema22 = createSeries(charts.price, 'Line', { color: 'rgba(255, 255, 255, 0.4)', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
            const bandStyle = (opacity, style) => ({ color: `rgba(148, 163, 184, ${opacity})`, lineWidth: 1, lineStyle: style, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
            s.priceH1 = createSeries(charts.price, 'Line', bandStyle(0.15, 2));
            s.priceL1 = createSeries(charts.price, 'Line', bandStyle(0.15, 2));
            s.priceH2 = createSeries(charts.price, 'Line', bandStyle(0.25, 3));
            s.priceL2 = createSeries(charts.price, 'Line', bandStyle(0.25, 3));
            s.priceH3 = createSeries(charts.price, 'Line', { ...bandStyle(0.6, 0), lineWidth: 1.5 });
            s.priceL3 = createSeries(charts.price, 'Line', { ...bandStyle(0.6, 0), lineWidth: 1.5 });
            s.safeZoneLong = createSeries(charts.price, 'Line', { color: 'rgba(239, 68, 68, 0.7)', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
            s.safeZoneShort = createSeries(charts.price, 'Line', { color: 'rgba(34, 197, 94, 0.7)', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
            s.divMacdPrice = createSeries(charts.price, 'Line', { color: 'rgba(255, 165, 0, 0.8)', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
            s.divEfiPrice = createSeries(charts.price, 'Line', { color: 'rgba(255, 165, 0, 0.8)', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
        }

        // 2. Volume Pane
        if (charts.volume) {
            s.volume = createSeries(charts.volume, 'Histogram', { priceScaleId: 'right', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false });
            if (!isWeekly) s.volumeSMA = createSeries(charts.volume, 'Line', { color: '#f59e0b', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        }

        // 3. MACD Pane
        if (charts.macd) {
            s.macdHist = createSeries(charts.macd, 'Histogram', { lastValueVisible: false, priceLineVisible: false, priceFormat: { precision: 2, minMove: 0.01 } });
            if (!isWeekly) {
                s.macdSignal = createSeries(charts.macd, 'Line', { color: '#ef4444', lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
                s.divMacdInd = createSeries(charts.macd, 'Line', { color: 'rgba(255, 165, 0, 0.8)', lineWidth: 2, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
            }
        }

        if (!isWeekly && charts.force13 && charts.force2) {
            // 4. Force 13 Pane
            s.force13 = createSeries(charts.force13, 'Line', { color: '#60a5fa', lineWidth: 2.5, lastValueVisible: false, priceLineVisible: false, priceFormat: { type: 'volume' } });
            s.force13Sig = createSeries(charts.force13, 'Line', { color: '#ef4444', lineWidth: 1, lastValueVisible: false, priceLineVisible: false, priceFormat: { type: 'volume' }, crosshairMarkerVisible: false });
            const efiBandStyle = (opacity, style) => ({ color: `rgba(148, 163, 184, ${opacity})`, lineWidth: 1, lineStyle: style, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false, priceFormat: { type: 'volume' } });
            s.efiH1 = createSeries(charts.force13, 'Line', efiBandStyle(0.15, 2));
            s.efiL1 = createSeries(charts.force13, 'Line', efiBandStyle(0.15, 2));
            s.efiH2 = createSeries(charts.force13, 'Line', efiBandStyle(0.25, 3));
            s.efiL2 = createSeries(charts.force13, 'Line', efiBandStyle(0.25, 3));
            s.efiH3 = createSeries(charts.force13, 'Line', { ...efiBandStyle(0.6, 0), lineWidth: 1.5 });
            s.efiL3 = createSeries(charts.force13, 'Line', { ...efiBandStyle(0.6, 0), lineWidth: 1.5 });
            s.divEfiInd = createSeries(charts.force13, 'Line', { color: 'rgba(255, 165, 0, 0.8)', lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceFormat: { type: 'volume' }, crosshairMarkerVisible: false });
            s.force13.createPriceLine({ price: 0, color: 'rgba(255, 255, 255, 0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });

            // 5. Force 2 Pane
            s.force2 = createSeries(charts.force2, 'Histogram', { lastValueVisible: false, priceLineVisible: false, priceFormat: { type: 'volume' } });
        }

        // HIDDEN ANCHORS
        Object.keys(charts).forEach(id => {
            if (id === 'price') return;
            s.anchors[id] = createSeries(charts[id], 'Line', { visible: false, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
        });

        seriesRef.current = s;

        // --- Synchronization and Legend Logic ---
        const updateLegends = (d) => {
            if (!d || !legendRef.current) return;
            const isWeekly = timeframeLabel === 'Weekly';
            const l = legendRef.current;

            if (l.price) {
                l.price.innerHTML = `
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span style="color: #9ca3af;">O</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Open?.toFixed(2) || '0.00'}</span>
                        <span style="color: #9ca3af;">H</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.High?.toFixed(2) || '0.00'}</span>
                        <span style="color: #9ca3af;">L</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Low?.toFixed(2) || '0.00'}</span>
                        <span style="color: #9ca3af;">C</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Close?.toFixed(2) || '0.00'}</span>
                        <span style="color: #60a5fa">EMA13 ${d.ema_13?.toFixed(2) || ''}</span>
                    </div>
                `;
            }
            if (l.volume) l.volume.innerHTML = `<div style="color: #94a3b8">VOL ${d.Volume ? (d.Volume / 1000000).toFixed(2) : '0.00'}M</div>`;
            if (l.macd) l.macd.innerHTML = `<div style="color: #34d399">MACD ${d.macd_diff?.toFixed(2) || '0.00'}</div>`;
            if (l.force13 && !isWeekly) l.force13.innerHTML = `<div style="color: #60a5fa">FORCE (13) ${d.efi ? (d.efi / 1000000).toFixed(2) + 'M' : '0.00M'}</div>`;
            if (l.force2 && !isWeekly) l.force2.innerHTML = `<div style="color: #a78bfa">FORCE (2) ${d.force_index_2 ? (d.force_index_2 / 1000).toFixed(1) + 'K' : '0.0K'}</div>`;
        };

        let isSyncingRange = false;
        const handleTimeRangeChange = (range) => {
            Object.values(charts).forEach(c => c.timeScale().setVisibleLogicalRange(range));
        };

        let isSyncing = false;
        let lastHoveredId = 'price';
        const handleCrosshairMove = (param, sourceId) => {
            if (isSyncing || !seriesRef.current) return;
            const s = seriesRef.current;

            isSyncing = true;
            if (!param.point || param.point.x < 0 || !param.time) {
                isSyncing = true;
                Object.keys(charts).forEach(id => {
                    if (charts[id]) charts[id].clearCrosshairPosition();
                });
                updateLegends(data[data.length - 1]);
                isSyncing = false;
                return;
            }
            if (sourceId !== lastHoveredId) {
                Object.keys(charts).forEach(id => {
                    if (charts[id]) {
                        charts[id].applyOptions({
                            crosshair: {
                                horzLine: {
                                    visible: id === sourceId,
                                    labelVisible: id === sourceId,
                                }
                            }
                        });
                    }
                });
                lastHoveredId = sourceId;
            }

            // SYNC CROSSHAIR
            Object.keys(charts).forEach(id => {
                if (id === sourceId) return;

                const ts = s.anchors[id] || (id === 'price' ? s.candles : null);
                if (ts) {
                    // UNDEFINED price + horizontal line visibility FALSE (set above)
                    // handles the 'single horizontal line' requirement perfectly.
                    charts[id].setCrosshairPosition(undefined, param.time, ts);
                }
            });

            // LEGEND SYNC
            let timeStr;
            if (typeof param.time === 'string') timeStr = param.time;
            else if (param.time && typeof param.time === 'object') {
                timeStr = `${param.time.year}-${String(param.time.month).padStart(2, '0')}-${String(param.time.day).padStart(2, '0')}`;
            }
            const item = data.find(d => d.Date && d.Date.split('T')[0] === timeStr) || data[data.length - 1];
            const priceData = (sourceId === 'price') ? param.seriesData.get(s.candles) : null;

            updateLegends({
                ...item,
                Open: priceData?.open || item?.Open,
                High: priceData?.high || item?.High,
                Low: priceData?.low || item?.Low,
                Close: priceData?.close || priceData?.value || item?.Close,
            });
            isSyncing = false;
        };

        Object.keys(charts).forEach(id => {
            charts[id].timeScale().subscribeVisibleLogicalRangeChange(handleTimeRangeChange);
            charts[id].subscribeCrosshairMove((param) => handleCrosshairMove(param, id));
        });

        const observer = new ResizeObserver(entries => {
            if (entries[0]) {
                const width = entries[0].contentRect.width;
                const hTotal = entries[0].contentRect.height;
                const totalF = paneConfigs.reduce((sum, p) => sum + p.flex, 0);
                Object.values(charts).forEach((c, idx) => {
                    if (c && paneConfigs[idx]) {
                        const h = (paneConfigs[idx].flex / totalF) * hTotal;
                        c.applyOptions({ width, height: h });
                    }
                });
            }
        });
        observer.observe(container);

        updateLegends(data[data.length - 1]);

        return () => {
            srLineRefs.current = [];
            observer.disconnect();
            Object.values(charts).forEach(c => c.remove());
            chartsRef.current = {};
            legendRef.current = null;
            seriesRef.current = {};
        };
    }, [symbol, timeframeLabel, data]);

    const getCombinedSnapshot = () => {
        if (Object.keys(chartsRef.current).length === 0) return null;
        try {
            const paneIds = ['price', 'volume', 'macd', 'force13', 'force2'].filter(id => chartsRef.current[id]);
            const canvases = paneIds.map(id => chartsRef.current[id].takeScreenshot());
            const combined = document.createElement('canvas');
            const ctx = combined.getContext('2d');
            combined.width = canvases[0].width;
            combined.height = canvases.reduce((sum, c) => sum + c.height, 0);
            let currentY = 0;
            canvases.forEach(c => {
                ctx.drawImage(c, 0, currentY);
                currentY += c.height;
            });
            return combined.toDataURL();
        } catch (e) {
            console.error("Failed to take combined snapshot", e);
            return chartsRef.current.price?.takeScreenshot().toDataURL();
        }
    };

    const handleSaveJournal = async () => {
        if (!note.trim()) return;

        setIsSaving(true);
        try {
            const snapshot = getCombinedSnapshot();
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
        if (!chartsRef.current.price || !data || data.length === 0) return;
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

        const candleData = [], ema13Data = [], ema22Data = [], ema26Data = [], priceH1Data = [], priceL1Data = [], priceH2Data = [], priceL2Data = [], priceH3Data = [], priceL3Data = [], macdHistData = [], macdSignalData = [], force2Data = [], force13Data = [], ema13DataForce = [], efiH1Data = [], efiL1Data = [], efiH2Data = [], efiL2Data = [], efiH3Data = [], efiL3Data = [], volumeData = [], volumeSMAData = [], szLongData = [], szShortData = [];

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

                if (d.safezone_long) szLongData.push({ time, value: d.safezone_long });
                if (d.safezone_short) szShortData.push({ time, value: d.safezone_short });
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

        safeSetData(s.safeZoneLong, szLongData, 'SZ Long');
        safeSetData(s.safeZoneShort, szShortData, 'SZ Short');

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

                if (s.divMacdPrice) s.divMacdPrice.applyOptions({ color });
                if (s.divMacdInd) s.divMacdInd.applyOptions({ color });

                const priceVal1 = macdDivergence.type === 'bearish' ? p1.High : p1.Low;
                const priceVal2 = macdDivergence.type === 'bearish' ? p2.High : p2.Low;
                if (s.divMacdPrice) safeSetData(s.divMacdPrice, [{ time: time1, value: priceVal1 }, { time: time2, value: priceVal2 }], 'DivPrice');
                if (s.divMacdInd) safeSetData(s.divMacdInd, [{ time: time1, value: p1.macd_diff || 0 }, { time: time2, value: p2.macd_diff || 0 }], 'DivInd');
            }
        } else {
            if (s.divMacdPrice) safeSetData(s.divMacdPrice, [], 'DivPrice');
            if (s.divMacdInd) safeSetData(s.divMacdInd, [], 'DivInd');
        }

        if (f13Divergence && data[f13Divergence.idx1] && data[f13Divergence.idx2] && !isWeekly) {
            const p1 = data[f13Divergence.idx1];
            const p2 = data[f13Divergence.idx2];
            if (p1?.Date && p2?.Date) {
                const time1 = p1.Date.split('T')[0];
                const time2 = p2.Date.split('T')[0];
                const color = f13Divergence.type === 'bearish' ? '#ef4444' : '#22c55e';
                if (s.divEfiPrice) s.divEfiPrice.applyOptions({ color });
                if (s.divEfiInd) s.divEfiInd.applyOptions({ color });
                const priceVal1 = f13Divergence.type === 'bearish' ? p1.High : p1.Low;
                const priceVal2 = f13Divergence.type === 'bearish' ? p2.High : p2.Low;
                if (s.divEfiPrice) safeSetData(s.divEfiPrice, [{ time: time1, value: priceVal1 }, { time: time2, value: priceVal2 }], 'DivEfiPrice');
                const val1 = p1.efi_truncated ?? p1.efi;
                const val2 = p2.efi_truncated ?? p2.efi;
                if (s.divEfiInd) safeSetData(s.divEfiInd, [{ time: time1, value: val1 }, { time: time2, value: val2 }], 'DivEfiInd');
            }
        } else {
            if (s.divEfiPrice) safeSetData(s.divEfiPrice, [], 'DivEfiPrice');
            if (s.divEfiInd) safeSetData(s.divEfiInd, [], 'DivEfiInd');
        }

        // Render Markers
        const markers = [];
        const seenTimes = new Set();
        data.forEach((d) => {
            if (!d || !d.Date) return;
            const time = d.Date.split('T')[0];
            if (seenTimes.has(time)) return;
            if (d.efi_buy_signal) {
                markers.push({ time, position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'E' });
                seenTimes.add(time);
            } else if (d.efi_sell_signal) {
                markers.push({ time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'E' });
                seenTimes.add(time);
            }
        });
        if (s.candles && typeof s.candles.setMarkers === 'function') {
            try {
                s.candles.setMarkers(showMarkers ? markers : []);
            } catch (err) {
                console.error("setMarkers Failure:", err);
            }
        }

        // --- Populate Anchor Series for perfect alignment ---
        const timeAnchorData = data.map(d => ({ time: d.Date.split('T')[0], value: 0 }));
        Object.keys(s.anchors || {}).forEach(id => {
            safeSetData(s.anchors[id], timeAnchorData, `Anchor-${id}`);
        });

        chartsRef.current.price.timeScale().fitContent();
    }, [data, symbol, srLevels, showMarkers]);

    // Visibility Control Effect
    useEffect(() => {
        const s = seriesRef.current;
        if (!s || !s.candles) return;

        const setVis = (series, visible) => {
            if (series) series.applyOptions({ visible });
        };

        // EMA Group
        setVis(s.ema13, showEMA);
        setVis(s.ema26, showEMA);
        setVis(s.ema22, showEMA);

        // Value Zones (ATR Channels)
        setVis(s.priceH1, showValueZones);
        setVis(s.priceL1, showValueZones);
        setVis(s.priceH2, showValueZones);
        setVis(s.priceL2, showValueZones);
        setVis(s.priceH3, showValueZones);
        setVis(s.priceL3, showValueZones);
        setVis(s.efiH1, showValueZones);
        setVis(s.efiL1, showValueZones);
        setVis(s.efiH2, showValueZones);
        setVis(s.efiL2, showValueZones);
        setVis(s.efiH3, showValueZones);
        setVis(s.efiL3, showValueZones);

        // SafeZones
        setVis(s.safeZoneLong, showSafeZones);
        setVis(s.safeZoneShort, showSafeZones);

        // Divergences
        setVis(s.divMacdPrice, showDivergences);
        setVis(s.divMacdInd, showDivergences);
        setVis(s.divEfiPrice, showDivergences);
        setVis(s.divEfiInd, showDivergences);

        // S/R levels are handled in a separate effect below
    }, [showValueZones, showSafeZones, showDivergences, showEMA]);
    // Dedicated S/R Levels Effect
    useEffect(() => {
        const s = seriesRef.current;
        if (!s || !s.candles) return;

        // Clear existing lines
        srLineRefs.current.forEach(line => s.candles.removePriceLine(line));
        srLineRefs.current = [];

        // Re-create only if enabled
        if (showSRLevels && srLevels) {
            srLevels.forEach(level => {
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
        }
    }, [showSRLevels, srLevels]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Main Content Area (Left) */}
            <div className="flex-1 flex flex-col gap-6 w-full min-w-0">

                <div className="bg-blue-600/10 border border-blue-500/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -mr-20 -mt-20" />
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 bg-gray-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <Info className="text-blue-400" size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-2xl italic tracking-tighter">
                                    TRIPLE SCREEN STRATEGY
                                </h3>
                                <div className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-0.5">
                                    {symbol} • {timeframeLabel} Analysis
                                </div>
                            </div>
                        </div>

                        {regimeData && (
                            <div className="flex flex-wrap items-center gap-3 bg-black/40 p-2 pl-4 rounded-xl border border-white/5 shadow-inner">
                                {/* Macro Status */}
                                <div className="flex items-center gap-2" title={`Macro: ${regimeData.macro_status} | Trend: ${regimeData.regime}`}>
                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${regimeData.macro_status === 'Risk-On' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                        <Globe size={12} />
                                        {regimeData.macro_status}
                                    </div>
                                </div>

                                <div className="w-[1px] h-4 bg-gray-800" />

                                {/* Sector Status */}
                                <div className="flex items-center gap-2" title={`Sector: ${regimeData.sector_analysis?.stock_sector}`}>
                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${regimeData.sector_analysis?.is_leading ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'}`}>
                                        <Layers size={12} />
                                        {regimeData.sector_analysis?.is_leading ? 'Leading Sector' : regimeData.sector_analysis?.stock_sector || 'Sector'}
                                    </div>
                                </div>

                                <div className="w-[1px] h-4 bg-gray-800" />

                                {/* Strategic Verdict */}
                                <div className="flex items-center gap-3 ml-2">
                                    <div className={`px-3 py-1 rounded text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${(regimeData.decision?.includes('Buy') || regimeData.decision?.includes('Bullish')) ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]' :
                                        (regimeData.decision?.includes('Avoid') || regimeData.decision?.includes('Short')) ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                                            'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                                        }`}>
                                        {(regimeData.decision?.includes('Buy') || regimeData.decision?.includes('Bullish')) ? <ArrowUpRight size={14} strokeWidth={3} /> : <ShieldCheck size={14} strokeWidth={3} />}
                                        {regimeData.decision?.split('.')[0] || 'N/A'}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const snapshot = getCombinedSnapshot();
                                                if (snapshot) {
                                                    setSnapshot(snapshot);
                                                    if (lastData) {
                                                        setTradeModalInitialData({
                                                            symbol,
                                                            entry_day_high: lastData.High,
                                                            entry_day_low: lastData.Low,
                                                            upper_channel: lastData.price_atr_h3,
                                                            lower_channel: lastData.price_atr_l3,
                                                            safezone_long: lastData.safezone_long,
                                                            safezone_short: lastData.safezone_short
                                                        });
                                                    }
                                                    setShowTradeModal(true);
                                                }
                                            }}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 transition-all shadow-lg border border-blue-400/30"
                                        >
                                            <Plus size={12} />
                                            Log Trade
                                        </button>

                                        <button
                                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 transition-all shadow-lg border ${isSidebarOpen ? 'bg-blue-500 text-white border-blue-400' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'}`}
                                            title={isSidebarOpen ? "Hide Analysis Notes" : "Show Analysis Notes"}
                                        >
                                            <Notebook size={14} />
                                            {isSidebarOpen ? 'Hide Notes' : 'Notes'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>


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

                    {/* EFI Divergence Alert */}
                    {(() => {
                        const isFresh = (f13Divergence?.recency < 5);
                        if (f13Divergence && isFresh) {
                            return (
                                <div className={`mb-8 p-4 rounded-xl border-l-4 flex items-start gap-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-500 delay-150 ${f13Divergence.type === 'bearish'
                                    ? 'bg-orange-900/30 border-orange-500/40 shadow-orange-900/10'
                                    : 'bg-teal-900/30 border-teal-500/40 shadow-teal-900/10'
                                    }`}>
                                    <div className={`p-2 rounded-lg ${f13Divergence.type === 'bearish' ? 'bg-orange-500/20' : 'bg-teal-500/20'}`}>
                                        <Zap size={24} className={f13Divergence.type === 'bearish' ? 'text-orange-400' : 'text-teal-400'} />
                                    </div>
                                    <div>
                                        <h4 className={`font-black uppercase tracking-widest text-sm mb-1 ${f13Divergence.type === 'bearish' ? 'text-orange-400' : 'text-teal-400'}`}>
                                            FORCE INDEX {f13Divergence.type} DIVERGENCE
                                        </h4>
                                        <p className="text-gray-300 text-sm leading-relaxed">
                                            {f13Divergence.type === 'bearish'
                                                ? "Price made a higher high, but Volume/Force is falling. Smart money is withdrawing."
                                                : "Price made a lower low, but Volume/Force is rising. Selling pressure is drying up."}
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

                {/* Chart Logic & Visibility Card */}
                <div className="bg-gray-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <Layers className="text-blue-400" size={18} />
                        </div>
                        <h4 className="font-black text-white text-sm uppercase tracking-widest italic">
                            Chart Engine & Visibility
                        </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {[
                            { id: 'ema', label: 'EMA (13/22/26)', state: showEMA, setter: setShowEMA, icon: Zap, color: 'blue' },
                            { id: 'zones', label: 'Value Zones', state: showValueZones, setter: setShowValueZones, icon: Layers, color: 'indigo' },
                            { id: 'sr', label: 'S/SR Levels', state: showSRLevels, setter: setShowSRLevels, icon: ShieldCheck, color: 'purple' },
                            { id: 'div', label: 'Divergence', state: showDivergences, setter: setShowDivergences, icon: AlertTriangle, color: 'amber' },
                            { id: 'safe', label: 'SafeZone Stops', state: showSafeZones, setter: setShowSafeZones, icon: ShieldCheck, color: 'red' },
                            { id: 'markers', label: 'Force Signals', state: showMarkers, setter: setShowMarkers, icon: Search, color: 'emerald' }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => t.setter(!t.state)}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${t.state
                                    ? `bg-${t.color}-500/20 text-${t.color}-400 border-${t.color}-500/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)]`
                                    : 'bg-gray-800/40 text-gray-500 border-white/5 hover:bg-gray-800/60'
                                    }`}
                            >
                                <t.icon size={14} className={t.state ? `text-${t.color}-400` : 'text-gray-600'} />
                                {t.label}
                                {t.state && <div className={`w-1.5 h-1.5 rounded-full bg-${t.color}-400 animate-pulse`} />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden relative">




                    {/* Active Trade Widget */}
                    {activeTrade && (
                        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-4 px-6 py-3 bg-gray-900/90 border border-blue-500/50 rounded-xl backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-4">
                            <div className="flex flex-col">
                                <div className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1">Active Position</div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-lg font-black ${activeTrade.direction === 'Long' ? 'text-green-400' : 'text-red-400'}`}>
                                        {activeTrade.direction.toUpperCase()}
                                    </span>
                                    <span className="text-sm font-mono text-gray-300">
                                        {activeTrade.quantity} @ {activeTrade.entry_price}
                                    </span>
                                </div>
                            </div>
                            <div className="w-px h-8 bg-gray-700 mx-2" />
                            <div className="flex flex-col">
                                <div className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1">Strategy</div>
                                <div className="text-xs font-bold text-blue-300">
                                    {activeTrade.strategy_name || 'Manual'}
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    const snapshot = getCombinedSnapshot();
                                    if (snapshot) {
                                        setSnapshot(snapshot);
                                        setTradeModalInitialData({
                                            ...activeTrade,
                                            exit_date: new Date().toISOString().split('T')[0],
                                            exit_price: lastData.Close,
                                            exit_day_high: lastData.High,
                                            exit_day_low: lastData.Low,
                                            upper_channel: lastData.price_atr_h3,
                                            lower_channel: lastData.price_atr_l3
                                        });
                                        setShowTradeModal(true);
                                    }
                                }}
                                className="ml-4 bg-gray-800 hover:bg-gray-700 hover:text-white text-gray-300 border border-gray-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
                            >
                                <Camera size={14} /> Close Trade
                            </button>
                        </div>
                    )}

                    <div ref={chartContainerRef} className="w-full h-[1100px] relative overflow-hidden" />
                </div>
            </div>

            {/* Sidebar Area (Right) */}
            <div className={`flex-shrink-0 flex flex-col gap-6 lg:sticky lg:top-6 transition-all duration-300 ${isSidebarOpen ? 'w-full lg:w-[450px] opacity-100' : 'w-0 lg:w-0 overflow-hidden opacity-0 p-0 m-0 border-0'}`}>
                {/* Quick Journal Input */}
                <div className="bg-gray-800 border-2 border-blue-500/20 p-6 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Notebook className="text-blue-400" size={20} />
                            <h3 className="text-lg font-bold text-white">Analysis Notes</h3>
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
                </div>
            </div>

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
                            fetchActiveTrade();
                            // Refresh journal entries if needed
                            // loadJournal(); // If we had this function exposed or local
                        }}
                    />
                )
            }
        </div>
    );
};

export default ElderAnalysis;
