import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as LW from 'lightweight-charts';
const {
    createChart,
    CandlestickSeries,
    LineSeries,
    HistogramSeries,
    CrosshairMode,
    createSeriesMarkers
} = LW;
console.log("DEBUG: lightweight-charts version:", typeof LW.version === 'function' ? LW.version() : LW.version || "unknown");
console.log("DEBUG: createSeriesMarkers exists?", typeof createSeriesMarkers);
import { Zap, Info, Notebook, Camera, Calendar, Trash2, Search, AlertTriangle, Edit, ShieldCheck, ArrowUpRight, Globe, Layers, Plus } from 'lucide-react';
import { saveJournalEntry, getJournalEntries, updateJournalEntry, deleteJournalEntry, getActiveTrade } from '../services/api';
import { X } from 'lucide-react';
// TradeEntryModal moved to Dashboard

const TechnicalChart = ({
    data,
    symbol,
    srLevels = [],
    tacticalAdvice,
    macdDivergence,
    f13Divergence,
    timeframeLabel = 'Daily',
    regimeData,
    setInitError,
    onLogTrade,
    indicatorConfigs, // Props from Dashboard
    isSidebarOpen // Props from Dashboard
}) => {
    console.log('TechnicalChart Init', { symbol, dataLength: data?.length, timeframeLabel });
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


    // Modal state moved to Dashboard
    const [snapshot, setSnapshot] = useState(null);
    const [activeTrade, setActiveTrade] = useState(null);
    // isSidebarOpen is now a prop from Dashboard

    // Synchronization labels
    const [syncRange, setSyncRange] = useState(null);
    const [syncCrosshair, setSyncCrosshair] = useState(null);

    // Ref to access current visibility inside event listeners/loops
    const visibilityRef = useRef(indicatorConfigs);

    const lastLegendDataRef = useRef(null);
    useEffect(() => {
        visibilityRef.current = indicatorConfigs;
    }, [indicatorConfigs]);

    // Helpers to extract visibility from the new multi-instance config
    const getVis = (type) => {
        const item = [...(indicatorConfigs.overlays || []), ...(indicatorConfigs.panes || []), ...(indicatorConfigs.signals || [])]
            .find(i => i.type === type);
        return item ? item.visible : false;
    };

    const showValueZones = getVis('valueZones');
    const showEMA = getVis('ema'); // Helper for legacy blocks if any
    const showForceZones = getVis('forceZones');
    const showGuppySignals = getVis('guppySignals');
    const showSRLevels = getVis('srLevels');
    const showSafeZones = getVis('safeZones');
    const showGuppy = getVis('guppy');
    const showBollinger = getVis('bollinger');
    const showATRStop = getVis('atrStop');
    const showVolume = getVis('volume');
    const showMACD = getVis('macd');
    const showForce13 = getVis('force13');
    const showForce2 = getVis('force2');
    const showMacdDivergence = getVis('macdDivergence');
    const showForceDivergence = getVis('forceDivergence');
    const showForceMarkers = getVis('forceMarkers');

    const priceFormatter = (price) => (price || 0).toFixed(2);

    // --- Defensive Series Creation Wrapper ---
    const createSeries = useCallback((chart, type, options = {}) => {
        if (!chart) return null;
        try {
            let series;
            if (type === 'Candlestick' && chart.addCandlestickSeries) {
                series = chart.addCandlestickSeries(options);
            } else if (type === 'Line' && chart.addLineSeries) {
                series = chart.addLineSeries(options);
            } else if (type === 'Histogram' && chart.addHistogramSeries) {
                series = chart.addHistogramSeries(options);
            } else if (chart.addSeries) {
                const SeriesTypes = { 'Candlestick': CandlestickSeries, 'Line': LineSeries, 'Histogram': HistogramSeries };
                series = chart.addSeries(SeriesTypes[type], options);
            }

            if (!series) throw new Error(`MISSING SERIES METHODS for ${type}`);
            return series;
        } catch (err) {
            console.error(`Series Creation Error[${type}]: `, err);
            return null;
        }
    }, []);

    const safeSetData = useCallback((series, seriesData, label) => {
        if (!series) return;
        try {
            // Sanitization: lightweight-charts requires numbers or strings for values.
            // It throws assertions on null/NaN.
            const sanitized = (seriesData || []).filter(item => {
                if (item.open !== undefined) {
                    // Candlestick data
                    return item.open != null && item.high != null && item.low != null && item.close != null &&
                        !isNaN(item.open) && !isNaN(item.high) && !isNaN(item.low) && !isNaN(item.close);
                } else {
                    // Value-based data (Line, Histogram)
                    return item.value != null && !isNaN(item.value);
                }
            });
            series.setData(sanitized);
        } catch (err) {
            console.error(`FAILED to set ${label}:`, err);
        }
    }, []);

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
    const updateLegendsRef = useRef(null); // Expose to other effects
    const srLineRefs = useRef([]);
    const isResizing = useRef(false);
    const prevWidth = useRef(0);

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

    const resizeRAF = useRef(null);

    const paneConfigs = [
        { id: 'price', flex: 10, visible: true },
        { id: 'volume', flex: 1.5, visible: indicatorConfigs.panes.find(p => p.type === 'volume')?.visible },
        { id: 'macd', flex: 3.5, visible: indicatorConfigs.panes.find(p => p.type === 'macd')?.visible },
        { id: 'force13', flex: 4, visible: indicatorConfigs.panes.find(p => p.type === 'force13')?.visible },
        { id: 'force2', flex: 2, visible: indicatorConfigs.panes.find(p => p.type === 'force2')?.visible }
    ].filter(p => p.visible !== false);

    // Initialize Multi-Pane Integrated Professional Layout
    useEffect(() => {
        let isAlive = true; // Safety flag for async operations/callbacks
        console.log('TechnicalChart: Initializing Layout...', { timeframeLabel, indicatorConfigs });
        prevWidth.current = 0; // Force reset on every new mount/symbol change

        if (!chartContainerRef.current) return;
        const container = chartContainerRef.current;
        container.innerHTML = '';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0px';
        container.style.background = '#111827';
        container.style.borderRadius = '0px'; // Remove radius for full fit
        container.style.overflow = 'hidden';
        container.style.border = 'none'; // Remove border to prevent inset
        container.style.width = '100%'; // FORCE FULL WIDTH
        container.style.justifyContent = 'center'; // Center content just in case
        container.style.alignItems = 'stretch'; // Ensure children stretch

        const isWeekly = timeframeLabel === 'Weekly';
        const background = { type: 'solid', color: '#111827' };
        const textColor = 'rgba(255, 255, 255, 0.9)';
        const gridColor = 'rgba(197, 203, 206, 0.05)';

        const charts = {};
        const legends = {};
        // Use getBoundingClientRect for precision, with fallback
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width || container.clientWidth || 800;
        const containerHeight = rect.height || 1000;

        console.log('[TechnicalChart] Container Dimensions Init:', {
            rectWidth: rect.width,
            rectHeight: rect.height,
            clientWidth: container.clientWidth,
            clientHeight: container.clientHeight,
            resolvedWidth: containerWidth
        });

        const totalFlex = paneConfigs.reduce((sum, p) => sum + p.flex, 0);

        try {
            paneConfigs.forEach((p, idx) => {
                const paneDiv = document.createElement('div');
                paneDiv.style.flex = p.flex;
                paneDiv.style.width = '100%'; // Ensure full width
                paneDiv.style.minHeight = '100px';
                paneDiv.style.position = 'relative';
                // Remove internal borders for cleaner look or keep minimal
                paneDiv.style.borderBottom = idx < paneConfigs.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none';
                container.appendChild(paneDiv);

                const borderOffset = paneConfigs.length - 1;
                const effectiveHeight = Math.max(0, containerHeight - borderOffset);

                const chart = createChart(paneDiv, {
                    layout: {
                        background: { type: 'solid', color: '#111827' },
                        textColor: 'rgba(255, 255, 255, 0.9)',
                    },
                    grid: {
                        vertLines: { color: 'rgba(197, 203, 206, 0.05)' },
                        horzLines: { color: 'rgba(197, 203, 206, 0.05)' },
                    },
                    width: containerWidth, // Use PRECISE width
                    height: Math.max(10, Math.floor((effectiveHeight / totalFlex) * p.flex)),
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
                        minimumWidth: 95, // FORCE FIXED WIDTH to align all stacked panes (Critical for Daily View)
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
                charts[p.id] = chart;

                const leg = document.createElement('div');
                leg.style = `
                    position: absolute; left: 12px; top: 6px; z-index: 10;
                    font-family: -apple-system, sans-serif; font-size: 11px;
                    color: rgba(255, 255, 255, 0.7); pointer-events: none;
                    display: flex; flex-direction: column; gap: 0px;
                    background: rgba(17, 24, 39, 0.4); padding: 4px 8px; border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                `;


                paneDiv.appendChild(leg);
                legends[p.id] = leg;
            });

            chartsRef.current = charts;
        } catch (e) {
            console.error("Multi-Pane Init Failure", e);
            setInitError(`CHART INIT FAILED: ${e.message} `);
        }
        chartRef.current = charts.price;
        legendRef.current = legends;

        const s = { anchors: {}, overlays: {}, panes: {} };
        if (!chartsRef.current.price) return;

        // 1. Price Pane
        s.candles = createSeries(chartsRef.current.price, 'Candlestick');
        if (!s.candles) return;

        // Initialize markers primitive (v5 API)
        if (createSeriesMarkers && s.candles) {
            s.markers = { candles: createSeriesMarkers(s.candles) };
        }

        // Static/Internal Overlays (Linked to specific UI features)
        const bandStyle = (opacity, style) => ({ color: `rgba(148, 163, 184, ${opacity})`, lineWidth: 1, lineStyle: style, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
        // s.ema13 and s.ema26 removed: now handled by dynamic indicatorConfigs
        s.ema22 = createSeries(chartsRef.current.price, 'Line', { color: 'rgba(255, 255, 255, 0.4)', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        s.priceH1 = createSeries(chartsRef.current.price, 'Line', bandStyle(0.15, 2));
        s.priceL1 = createSeries(chartsRef.current.price, 'Line', bandStyle(0.15, 2));
        s.priceH2 = createSeries(chartsRef.current.price, 'Line', bandStyle(0.25, 3));
        s.priceL2 = createSeries(chartsRef.current.price, 'Line', bandStyle(0.25, 3));
        s.priceH3 = createSeries(chartsRef.current.price, 'Line', { ...bandStyle(0.6, 0), lineWidth: 1.5 });
        s.priceL3 = createSeries(chartsRef.current.price, 'Line', { ...bandStyle(0.6, 0), lineWidth: 1.5 });

        s.safeZoneLong = createSeries(chartsRef.current.price, 'Line', { color: 'rgba(239, 68, 68, 0.7)', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
        s.safeZoneShort = createSeries(chartsRef.current.price, 'Line', { color: 'rgba(34, 197, 94, 0.7)', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });

        const bbStyle = (color) => ({ color: color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
        s.bbUpper = createSeries(chartsRef.current.price, 'Line', bbStyle('rgba(34, 211, 238, 0.6)'));
        s.bbMiddle = createSeries(chartsRef.current.price, 'Line', bbStyle('rgba(34, 211, 238, 0.8)'));
        s.bbLower = createSeries(chartsRef.current.price, 'Line', bbStyle('rgba(34, 211, 238, 0.6)'));

        s.atrStop = createSeries(chartsRef.current.price, 'Line', { color: '#ec4899', lineWidth: 2, lineStyle: 0, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });

        s.guppySeries = [];
        const createGuppy = (period, isLong) => {
            const color = isLong ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.6)';
            const series = createSeries(chartsRef.current.price, 'Line', { color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
            if (series) s.guppySeries.push({ series, id: `guppy_${isLong ? 'long' : 'short'}_${period}` });
        };
        [3, 5, 8, 10, 12, 15].forEach(p => createGuppy(p, false));
        [30, 35, 40, 45, 50, 60].forEach(p => createGuppy(p, true));

        // Signals & Divergence (On Price Chart)
        s.divMacdPrice = createSeries(chartsRef.current.price, 'Line', { color: 'rgba(255, 165, 0, 0.8)', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
        s.divEfiPrice = createSeries(chartsRef.current.price, 'Line', { color: 'rgba(255, 165, 0, 0.8)', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });

        // 2. Volume Pane
        if (chartsRef.current.volume) {
            s.volume = createSeries(chartsRef.current.volume, 'Histogram', { priceScaleId: 'right', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false });
            s.volumeSMA = createSeries(chartsRef.current.volume, 'Line', { color: '#f59e0b', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        }

        // 3. MACD Pane
        if (chartsRef.current.macd) {
            s.macdHist = createSeries(chartsRef.current.macd, 'Histogram', { lastValueVisible: false, priceLineVisible: false, priceFormat: { precision: 2, minMove: 0.01 } });
            s.macdSignal = createSeries(chartsRef.current.macd, 'Line', { color: '#ef4444', lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
            s.divMacdInd = createSeries(chartsRef.current.macd, 'Line', { color: 'rgba(255, 165, 0, 0.8)', lineWidth: 2, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
        }

        // 4. Force 13 Pane
        if (chartsRef.current.force13) {
            s.force13 = createSeries(chartsRef.current.force13, 'Line', { color: '#60a5fa', lineWidth: 2.5, lastValueVisible: false, priceLineVisible: false, priceFormat: { type: 'volume' } });
            s.force13Sig = createSeries(chartsRef.current.force13, 'Line', { color: '#ef4444', lineWidth: 1, lastValueVisible: false, priceLineVisible: false, priceFormat: { type: 'volume' }, crosshairMarkerVisible: false });
            const efiBandStyle = (opacity, style) => ({ color: `rgba(148, 163, 184, ${opacity})`, lineWidth: 1, lineStyle: style, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false, priceFormat: { type: 'volume' } });
            s.efiH1 = createSeries(chartsRef.current.force13, 'Line', efiBandStyle(0.15, 2));
            s.efiL1 = createSeries(chartsRef.current.force13, 'Line', efiBandStyle(0.15, 2));
            s.efiH2 = createSeries(chartsRef.current.force13, 'Line', efiBandStyle(0.25, 3));
            s.efiL2 = createSeries(chartsRef.current.force13, 'Line', efiBandStyle(0.25, 3));
            s.efiH3 = createSeries(chartsRef.current.force13, 'Line', { ...efiBandStyle(0.6, 0), lineWidth: 1.5 });
            s.efiL3 = createSeries(chartsRef.current.force13, 'Line', { ...efiBandStyle(0.6, 0), lineWidth: 1.5 });
            s.divEfiInd = createSeries(chartsRef.current.force13, 'Line', { color: 'rgba(255, 165, 0, 0.8)', lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceFormat: { type: 'volume' }, crosshairMarkerVisible: false });
            s.force13.createPriceLine({ price: 0, color: 'rgba(255, 255, 255, 0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
        }

        if (chartsRef.current.force2) {
            // 5. Force 2 Pane
            s.force2 = createSeries(chartsRef.current.force2, 'Histogram', { lastValueVisible: false, priceLineVisible: false, priceFormat: { type: 'volume' } });
        }

        // HIDDEN ANCHORS
        Object.keys(chartsRef.current).forEach(id => {
            if (id === 'price') return;
            s.anchors[id] = createSeries(chartsRef.current[id], 'Line', { visible: false, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
        });

        seriesRef.current = s;

        return () => {
            isAlive = false;
            Object.values(chartsRef.current).forEach(c => {
                try { c.remove(); } catch (e) { }
            });
            chartsRef.current = {};
        };
    }, [symbol, timeframeLabel, isSidebarOpen, createSeries, showVolume, showMACD, showForce13, showForce2]);

    // Hook 2 logic merged into Hook 4

    useEffect(() => {
        let isAlive = true;
        // --- Synchronization and Legend Logic ---
        const updateLegends = (d) => {
            if (!d || !legendRef.current) return;
            lastLegendDataRef.current = d; // Store for re-render

            const isWeekly = timeframeLabel === 'Weekly';
            const l = legendRef.current;
            const vis = visibilityRef.current; // Access current state

            if (l.price) {
                let overlaysHtml = '';
                const confs = visibilityRef.current;
                if (confs && confs.overlays) {
                    confs.overlays.forEach(cfg => {
                        if (cfg.visible && ['ema', 'sma'].includes(cfg.type)) {
                            const val = d[`${cfg.type}_${cfg.params?.window}`];
                            if (val != null) {
                                overlaysHtml += `<span style="color: ${cfg.color || '#9ca3af'}; font-size: 10px; margin-left: 8px;">${cfg.type.toUpperCase()}(${cfg.params.window}) ${val.toFixed(2)}</span>`;
                            }
                        }
                    });
                }

                l.price.innerHTML = `
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        <span style="color: #9ca3af;">O</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Open?.toFixed(2) || '0.00'}</span>
                        <span style="color: #9ca3af;">H</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.High?.toFixed(2) || '0.00'}</span>
                        <span style="color: #9ca3af;">L</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Low?.toFixed(2) || '0.00'}</span>
                        <span style="color: #9ca3af;">C</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Close?.toFixed(2) || '0.00'}</span>
                        ${overlaysHtml}
                    </div>
                `;
            }
            if (l.volume) l.volume.innerHTML = `<div style="color: #94a3b8">VOL ${d.Volume ? (d.Volume / 1000000).toFixed(2) : '0.00'}M</div>`;
            if (l.macd) l.macd.innerHTML = `<div style="color: #34d399">MACD ${d.macd_diff?.toFixed(2) || '0.00'}</div>`;
            if (l.force13) l.force13.innerHTML = `<div style="color: #60a5fa">FORCE (13) ${d.efi ? (d.efi / 1000000).toFixed(2) + 'M' : '0.00M'}</div>`;
            if (l.force2) l.force2.innerHTML = `<div style="color: #a78bfa">FORCE (2) ${d.force_index_2 ? (d.force_index_2 / 1000).toFixed(1) + 'K' : '0.0K'}</div>`;
        };
        updateLegendsRef.current = updateLegends; // Assign to Ref

        let isSyncingRange = false;
        const handleTimeRangeChange = (range) => {
            if (!isAlive) return; // SAFETY
            if (isSyncingRange || isResizing.current) return;
            isSyncingRange = true;
            Object.values(chartsRef.current).forEach(c => c.timeScale().setVisibleLogicalRange(range));
            isSyncingRange = false;
        };

        let isSyncing = false;
        let lastHoveredId = 'price';
        const handleCrosshairMove = (param, sourceId) => {
            if (!isAlive) return; // SAFETY
            if (isSyncing || !seriesRef.current || isResizing.current) return;
            const s = seriesRef.current;

            isSyncing = true;
            if (!param.point || param.point.x < 0 || !param.time) {
                isSyncing = true;
                Object.keys(chartsRef.current).forEach(id => {
                    if (chartsRef.current[id]) chartsRef.current[id].clearCrosshairPosition();
                });
                updateLegends(data[data.length - 1]);
                isSyncing = false;
                return;
            }
            if (sourceId !== lastHoveredId) {
                Object.keys(chartsRef.current).forEach(id => {
                    if (chartsRef.current[id]) {
                        chartsRef.current[id].applyOptions({
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
            Object.keys(chartsRef.current).forEach(id => {
                if (id === sourceId) return;

                const ts = s.anchors[id] || (id === 'price' ? s.candles : null);
                if (ts) {
                    // UNDEFINED price + horizontal line visibility FALSE (set above)
                    // handles the 'single horizontal line' requirement perfectly.
                    chartsRef.current[id].setCrosshairPosition(undefined, param.time, ts);
                }
            });

            // LEGEND SYNC
            let timeStr;
            if (typeof param.time === 'string') timeStr = param.time;
            else if (param.time && typeof param.time === 'object') {
                timeStr = `${param.time.year} -${String(param.time.month).padStart(2, '0')} -${String(param.time.day).padStart(2, '0')} `;
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

        Object.keys(chartsRef.current).forEach(id => {
            chartsRef.current[id].timeScale().subscribeVisibleLogicalRangeChange(handleTimeRangeChange);
            chartsRef.current[id].subscribeCrosshairMove((param) => handleCrosshairMove(param, id));
        });

        // --- Robust Resize Handler ---
        const handleResize = () => {
            if (!isAlive) {
                console.warn('[TechnicalChart] Resize skipped: Component unmounted/not alive');
                return;
            }

            if (resizeRAF.current) cancelAnimationFrame(resizeRAF.current);

            resizeRAF.current = requestAnimationFrame(() => {
                if (!isAlive) return;
                if (!chartContainerRef.current) {
                    console.error('[TechnicalChart] Resize Failed: No container ref');
                    return;
                }

                // Use LIVE DOM dimensions
                const width = chartContainerRef.current.clientWidth;
                const hTotal = chartContainerRef.current.clientHeight;
                const rect = chartContainerRef.current.getBoundingClientRect();

                console.log(`[TechnicalChart] handleResize EXECUTE[${Date.now()}]`, {
                    clientWidth: width,
                    clientHeight: hTotal,
                    rectWidth: rect.width,
                    rectHeight: rect.height,
                    paneCount: paneConfigs.length
                });

                if (width === 0 || hTotal === 0) {
                    console.warn('[TechnicalChart] Resize Aborted: Zero Dimensions Detected');
                    return;
                }

                const totalF = paneConfigs.reduce((sum, p) => sum + p.flex, 0);

                // Disable sync logic during resize to prevent loops
                isResizing.current = true;
                isSyncingRange = true;

                // 1. Capture Visible Range BEFORE Resize (to maintain position)
                let oldRange = null;
                if (chartsRef.current.price && prevWidth.current > 0) {
                    try {
                        oldRange = chartsRef.current.price.timeScale().getVisibleLogicalRange();
                    } catch (e) { }
                }

                // 2. Apply New Dimensions to All Panes
                const borderOffset = paneConfigs.length - 1;
                const effectiveHeight = Math.max(0, hTotal - borderOffset);

                paneConfigs.forEach(p => {
                    const c = chartsRef.current[p.id];
                    if (c) {
                        const newHeight = Math.max(10, Math.floor((p.flex / totalF) * effectiveHeight));
                        // console.log(`[TechnicalChart] Resizing Pane ${ p.id }: `, { width, newHeight });
                        c.applyOptions({ width, height: newHeight });
                    }
                });

                // 3. Restore Range Logic (Anchor Right)
                // REMOVED to allow natural left-side expansion/magnetism
                /*
                if (prevWidth.current > 0 && oldRange && width !== prevWidth.current) {
                   // ... logic removed ...
                }
                */

                prevWidth.current = width;

                setTimeout(() => {
                    if (isAlive) { // Check before updating refs
                        isResizing.current = false;
                        isSyncingRange = false;
                        // console.log('[ElderAnalysis] Resize Complete & Locks Released');
                    }
                }, 50);
            });
        };

        const observer = new ResizeObserver(entries => {
            if (entries[0] && isAlive) {
                const { width, height } = entries[0].contentRect;
                console.log(`[TechnicalChart] ResizeObserver Triggered[${Date.now()}]`, { width, height });
                handleResize();
            }
        });
        if (chartContainerRef.current) {
            observer.observe(chartContainerRef.current);
        }

        // IMMEDIATE RESIZE TRIGGERS
        console.log('[TechnicalChart] Scheduling Initial Resize Triggers...');
        setTimeout(() => {
            if (isAlive) {
                console.log('[TechnicalChart] Trigger 1 (50ms) Firing...');
                handleResize();
            }
        }, 50);
        setTimeout(() => {
            if (isAlive) {
                console.log('[TechnicalChart] Trigger 2 (200ms) Firing...');
                handleResize();
            }
        }, 200);

        // Expose resize handler to parent scope ref if needed or attach to window for manual events
        // Using a custom event listener for manual triggers from parent effects
        const manualResizeListener = () => { if (isAlive) handleResize(); };
        window.addEventListener('resize-chart-manual', manualResizeListener);


        updateLegends(data[data.length - 1]);

        return () => {
            isAlive = false; // KILL SWITCH
            window.removeEventListener('resize-chart-manual', manualResizeListener);
            if (window.resizeTimeout) clearTimeout(window.resizeTimeout);
            if (resizeRAF.current) cancelAnimationFrame(resizeRAF.current);
            srLineRefs.current = [];

            // Critical Reset
            prevWidth.current = 0;
            isResizing.current = false;

            if (chartContainerRef.current) {
                chartContainerRef.current.style.pointerEvents = 'auto';
            }

            observer.disconnect();
            window.removeEventListener('resize-chart-manual', manualResizeListener);

            Object.keys(chartsRef.current).forEach(id => {
                const c = chartsRef.current[id];
                if (c) {
                    try {
                        c.timeScale().unsubscribeVisibleLogicalRangeChange(handleTimeRangeChange);
                        c.unsubscribeCrosshairMove(handleCrosshairMove);
                    } catch (e) { }
                }
            });

            legendRef.current = null;
            seriesRef.current = {};
        };
    }, [symbol, timeframeLabel, data, showVolume, showMACD, showForce13, showForce2]);

    // Force resize check when sidebar toggles (to catch end of CSS transition)
    useEffect(() => {
        // Immediate check
        window.dispatchEvent(new Event('resize-chart-manual'));

        // Checks during transition
        const timers = [100, 200, 300, 350].map(t =>
            setTimeout(() => window.dispatchEvent(new Event('resize-chart-manual')), t)
        );

        return () => timers.forEach(t => clearTimeout(t));
    }, [isSidebarOpen]);

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
            template = `### WEEKLY MACRO TIDE\n\n ** 1. TIDE ANALYSIS(EMA 13) **\n - Direction: \n - Slope Quality: \n\n ** 2. IMPULSE SYSTEM **\n - State: (Red / Green / Blue) \n - Restriction: \n\n ** 3. BIG PICTURE CONTEXT **\n - Sector Rank: \n - Major S / R Levels: \n\n ** 4. STRATEGIC BIAS **\n - Next Week's Goal: `;
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

        const candleData = [], ema22Data = [], priceH1Data = [], priceL1Data = [], priceH2Data = [], priceL2Data = [], priceH3Data = [], priceL3Data = [], macdHistData = [], macdSignalData = [], force2Data = [], force13Data = [], ema13DataForce = [], efiH1Data = [], efiL1Data = [], efiH2Data = [], efiL2Data = [], efiH3Data = [], efiL3Data = [], volumeData = [], volumeSMAData = [], szLongData = [], szShortData = [];

        // 1. Sync & Cleanup Dynamic Overlays first so they exist for data population
        indicatorConfigs.overlays.forEach(cfg => {
            if (['ema', 'sma'].includes(cfg.type)) {
                if (!s.overlays[cfg.id]) {
                    s.overlays[cfg.id] = createSeries(chartsRef.current.price, 'Line', {
                        color: cfg.color || '#60a5fa',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false
                    });
                } else {
                    // Update color if it changed
                    s.overlays[cfg.id].applyOptions({ color: cfg.color || '#60a5fa' });
                }
            }
        });

        // Cleanup: Remove dynamic series that are no longer in configs
        Object.keys(s.overlays || {}).forEach(id => {
            if (!indicatorConfigs.overlays.find(o => o.id === id)) {
                if (s.overlays[id]) chartsRef.current.price.removeSeries(s.overlays[id]);
                delete s.overlays[id];
            }
        });

        // New Indicators Data Containers
        const dynamicData = {};
        indicatorConfigs.overlays.forEach(cfg => {
            dynamicData[cfg.id] = [];
        });
        const atrStopData = [];
        const bbUpperData = [], bbMiddleData = [], bbLowerData = [];
        const guppyData = {};
        [3, 5, 8, 10, 12, 15, 30, 35, 40, 45, 50, 60].forEach(p => guppyData[p] = []);

        const processedTimes = new Set();
        data.forEach(d => {
            if (!d || !d.Date) return;
            const time = d.Date.split('T')[0];
            if (processedTimes.has(time)) return;
            processedTimes.add(time);

            const candleColor = d.impulse === 'green' ? '#22c55e' : d.impulse === 'red' ? '#ef4444' : '#60a5fa';
            candleData.push({ time, open: d.Open, high: d.High, low: d.Low, close: d.Close, color: candleColor, wickColor: candleColor, borderColor: candleColor });

            // Dynamic Overlays
            indicatorConfigs.overlays.forEach(cfg => {
                const series = s.overlays[cfg.id];
                if (series && cfg.visible) {
                    const colName = `${cfg.type}_${cfg.params?.window}`;
                    if (d[colName] !== undefined) {
                        dynamicData[cfg.id].push({ time, value: d[colName] });
                    }
                }
            });

            if (d.ema_22) ema22Data.push({ time, value: d.ema_22 });

            if (d.price_atr_h1) priceH1Data.push({ time, value: d.price_atr_h1 });
            if (d.price_atr_l1) priceL1Data.push({ time, value: d.price_atr_l1 });
            if (d.price_atr_h2) priceH2Data.push({ time, value: d.price_atr_h2 });
            if (d.price_atr_l2) priceL2Data.push({ time, value: d.price_atr_l2 });
            if (d.price_atr_h3) priceH3Data.push({ time, value: d.price_atr_h3 });
            if (d.price_atr_l3) priceL3Data.push({ time, value: d.price_atr_l3 });

            if (d.safezone_long) szLongData.push({ time, value: d.safezone_long });
            if (d.safezone_short) szShortData.push({ time, value: d.safezone_short });

            // --- NEW DATA POPULATION ---
            if (d.volatility_stop) atrStopData.push({ time, value: d.volatility_stop });

            if (d.bb_upper) bbUpperData.push({ time, value: d.bb_upper });
            if (d.bb_middle) bbMiddleData.push({ time, value: d.bb_middle });
            if (d.bb_lower) bbLowerData.push({ time, value: d.bb_lower });

            // Guppy
            [3, 5, 8, 10, 12, 15].forEach(p => {
                const val = d[`guppy_short_${p}`];
                if (val) guppyData[p].push({ time, value: val });
            });
            [30, 35, 40, 45, 50, 60].forEach(p => {
                const val = d[`guppy_long_${p}`];
                if (val) guppyData[p].push({ time, value: val });
            });

            if (d.macd_diff !== undefined && d.macd_diff !== null) {
                macdHistData.push({ time, value: d.macd_diff, color: d.macd_diff >= 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)' });
            }

            if (d.macd_signal) {
                macdSignalData.push({ time, value: d.macd_signal });
            }

            if (d.force_index_2 !== undefined && d.force_index_2 !== null) {
                force2Data.push({
                    time,
                    value: d.force_index_2,
                    color: d.force_index_2 >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                });
            }

            if (d.efi_truncated !== undefined && d.efi_truncated !== null) {
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

        indicatorConfigs.overlays.forEach(cfg => {
            if (s.overlays[cfg.id]) {
                safeSetData(s.overlays[cfg.id], dynamicData[cfg.id], cfg.id);
            }
        });

        safeSetData(s.candles, candleData, 'Candles');
        // s.ema13 and s.ema26 now handled by the dynamicData loop above
        safeSetData(s.ema22, ema22Data, 'EMA22');
        safeSetData(s.priceH1, priceH1Data, 'PH1');
        safeSetData(s.priceL1, priceL1Data, 'PL1');
        safeSetData(s.priceH2, priceH2Data, 'PH2');
        safeSetData(s.priceL2, priceL2Data, 'PL2');
        safeSetData(s.priceH3, priceH3Data, 'PH3');
        safeSetData(s.priceL3, priceL3Data, 'PL3');
        safeSetData(s.safeZoneLong, szLongData, 'SZLong');
        safeSetData(s.safeZoneShort, szShortData, 'SZShort');

        // --- SET NEW DATA ---
        safeSetData(s.atrStop, atrStopData, 'ATRStop');
        safeSetData(s.bbUpper, bbUpperData, 'BBUpper');
        safeSetData(s.bbMiddle, bbMiddleData, 'BBMiddle');
        safeSetData(s.bbLower, bbLowerData, 'BBLower');

        if (s.guppySeries) {
            s.guppySeries.forEach(g => {
                const period = parseInt(g.id.split('_').pop());
                safeSetData(g.series, guppyData[period], g.id);
            });
        }
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

        if (f13Divergence && data[f13Divergence.idx1] && data[f13Divergence.idx2]) {
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

        // --- Populate Anchor Series for perfect alignment ---
        const timeAnchorData = data.map(d => ({ time: d.Date.split('T')[0], value: 0 }));
        Object.keys(s.anchors || {}).forEach(id => {
            safeSetData(s.anchors[id], timeAnchorData, `Anchor-${id}`);
        });

        chartsRef.current.price.timeScale().fitContent();
    }, [data, symbol, srLevels, indicatorConfigs, safeSetData]);

    // Dedicated Marker Effect with slight delay to ensure series are painted
    useEffect(() => {
        const s = seriesRef.current;

        if (!s || !s.candles || !data || data.length === 0) {
            return;
        }

        const applyMarkers = () => {
            const markers = [];
            const seenTimes = new Set();

            data.forEach((d) => {
                const timeStr = d.Date.split('T')[0];
                if (seenTimes.has(timeStr)) return;

                // 1. Force Index Signals (Elder)
                if (showForceMarkers) {
                    if (d.efi_buy_signal) {
                        markers.push({ time: timeStr, position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'E' });
                        seenTimes.add(timeStr);
                    } else if (d.efi_sell_signal) {
                        markers.push({ time: timeStr, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'E' });
                        seenTimes.add(timeStr);
                    }
                }

                // 2. Guppy MMA Crossover Signals
                if (showGuppySignals && !seenTimes.has(timeStr)) {
                    if (d.guppy_signal === 1) {
                        markers.push({ time: timeStr, position: 'belowBar', color: '#60a5fa', shape: 'arrowUp', text: 'G' });
                        seenTimes.add(timeStr);
                    } else if (d.guppy_signal === -1) {
                        markers.push({ time: timeStr, position: 'aboveBar', color: '#f87171', shape: 'arrowDown', text: 'G' });
                        seenTimes.add(timeStr);
                    }
                }
            });

            // V5 MARKERS API CALL
            if (s.markers?.candles) {
                try {
                    s.markers.candles.setMarkers(markers);
                } catch (err) {
                    console.error("DEBUG [Markers-v5]: Failed to apply markers", err);
                }
            }
        };

        const timer = setTimeout(applyMarkers, 100);
        return () => clearTimeout(timer);
    }, [data, symbol, showForceMarkers, showGuppySignals]);

    // Visibility Control Effect
    useEffect(() => {
        const s = seriesRef.current;
        if (!s || !s.candles) return;

        const setVis = (series, visible) => {
            if (series) series.applyOptions({ visible });
        };

        // Dynamic Overlays
        Object.keys(s.overlays).forEach(id => {
            const cfg = indicatorConfigs.overlays.find(c => c.id === id);
            if (cfg) setVis(s.overlays[id], cfg.visible);
        });

        const getVisById = (id) => {
            const item = [...(indicatorConfigs.overlays || []), ...(indicatorConfigs.panes || []), ...(indicatorConfigs.signals || [])]
                .find(i => i.id === id);
            return item ? item.visible : false;
        };

        // Legacy/Linked Series (Value Zones bases)
        setVis(s.ema22, getVisById('ema_22') || showValueZones);

        // Value Zones (ATR Channels)
        setVis(s.priceH1, showValueZones);
        setVis(s.priceL1, showValueZones);
        setVis(s.priceH2, showValueZones);
        setVis(s.priceL2, showValueZones);
        setVis(s.priceH3, showValueZones);
        setVis(s.priceL3, showValueZones);

        // SafeZones
        setVis(s.safeZoneLong, showSafeZones);
        setVis(s.safeZoneShort, showSafeZones);

        // --- NEW VISIBILITY ---
        setVis(s.atrStop, showATRStop);

        // Bollinger
        setVis(s.bbUpper, showBollinger);
        setVis(s.bbMiddle, showBollinger);
        setVis(s.bbLower, showBollinger);

        // Guppy
        if (s.guppySeries) {
            s.guppySeries.forEach(g => setVis(g.series, showGuppy));
        }

        // EFI ATR Bands (Controlled by showForceZones)
        ['efiH1', 'efiL1', 'efiH2', 'efiL2', 'efiH3', 'efiL3'].forEach(id => {
            setVis(s[id], showForceZones);
        });

        // Divergences
        setVis(s.divMacdPrice, showMacdDivergence);
        setVis(s.divMacdInd, showMacdDivergence);
        setVis(s.divEfiPrice, showForceDivergence);
        setVis(s.divEfiInd, showForceDivergence);

        // Refresh Legends to update Eye Icons
        if (updateLegendsRef.current && lastLegendDataRef.current) {
            updateLegendsRef.current(lastLegendDataRef.current);
        }

        // S/R levels are handled in a separate effect below
    }, [indicatorConfigs, showValueZones, showForceZones, showSafeZones, showMacdDivergence, showForceDivergence, showForceMarkers, showEMA, showGuppy, showBollinger, showATRStop, showSRLevels]);
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
        <div className="flex flex-col lg:flex-row gap-0 h-full bg-gray-950 overflow-y-auto custom-scrollbar relative">
            {/* Main Content Area (Left) */}
            <div className="flex-1 flex flex-col gap-2 w-full min-w-0">

                {/* Header Card Removed */}


                {/* Divergence Alerts (Unified - Top Banner) */}
                {(() => {
                    const isFresh = (macdDivergence?.recency < 5);

                    // 1. MACD Divergence
                    if (macdDivergence && isFresh) {
                        return (
                            <div className={`mb-2 p-2 rounded-lg border-l-2 flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-300 ${macdDivergence.type === 'bearish'
                                ? 'bg-red-900/30 border-red-500/40 shadow-red-900/10'
                                : 'bg-green-900/30 border-green-500/40 shadow-green-900/10'
                                }`}>
                                <div className={`p-2 rounded-lg ${macdDivergence.type === 'bearish' ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                                    <Info size={24} className={macdDivergence.type === 'bearish' ? 'text-red-400' : 'text-green-400'} />
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

            </div>

            {/* Chart Logic & Visibility Card REMOVED (Moved to Legend) */}

            {/* Chart Logic & Visibility Card REMOVED (Moved to Legend) */}

            <div className="w-full h-full relative overflow-hidden flex flex-col min-w-0">

                {/* Chart Container Wrapper */}
                <div className="relative w-full flex-1 min-h-[800px] bg-gray-950">
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
                                    if (onLogTrade) onLogTrade();
                                }}
                                className="ml-4 bg-gray-800 hover:bg-gray-700 hover:text-white text-gray-300 border border-gray-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
                            >
                                <Camera size={14} /> Close Trade
                            </button>
                        </div>
                    )}

                    <div ref={chartContainerRef} className="w-full h-full relative overflow-hidden rounded-2xl min-w-0" />
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

        </div >
    );
};

export default TechnicalChart;
