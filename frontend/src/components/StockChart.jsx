import React, { useEffect, useRef } from 'react';
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    HistogramSeries,
    CrosshairMode
} from 'lightweight-charts';

const StockChart = ({ data, srLevels = [], colors = {} }) => {
    const chartContainerRef = useRef();

    useEffect(() => {
        if (!data || data.length === 0) return;
        if (!chartContainerRef.current) return;

        try {
            const background = { type: 'solid', color: colors.backgroundColor || '#242424' };
            const textColor = colors.textColor || 'rgba(255, 255, 255, 0.9)';
            const gridColor = 'rgba(197, 203, 206, 0.1)';

            chartContainerRef.current.innerHTML = '';

            const width = chartContainerRef.current.clientWidth;
            const height = 600;

            const chart = createChart(chartContainerRef.current, {
                layout: { background, textColor },
                grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
                width: width,
                height: height,
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                    borderColor: gridColor,
                },
                rightPriceScale: {
                    visible: true,
                    borderColor: gridColor,
                    minimumWidth: 80,
                },
                leftPriceScale: {
                    visible: true,
                    borderColor: gridColor,
                    minimumWidth: 50,
                },
                crosshair: {
                    mode: CrosshairMode.Normal,
                },
            });

            // --- Series Creation ---

            // Price & EMAs (Right Scale)
            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
                priceScaleId: 'right',
            });
            const ema50Series = chart.addSeries(LineSeries, { color: 'rgba(41, 98, 255, 1)', lineWidth: 2, priceScaleId: 'right', lastValueVisible: false, priceLineVisible: false });
            const ema200Series = chart.addSeries(LineSeries, { color: 'rgba(255, 165, 0, 1)', lineWidth: 2, priceScaleId: 'right', lastValueVisible: false, priceLineVisible: false });

            // Volume (Custom 'volume' Scale)
            const volumeSeries = chart.addSeries(HistogramSeries, {
                color: '#26a69a',
                priceFormat: { type: 'volume' },
                priceScaleId: 'volume',
                lastValueVisible: false,
                priceLineVisible: false,
            });
            const volSmaSeries = chart.addSeries(LineSeries, { color: '#ffffff', lineWidth: 1, priceScaleId: 'volume', lastValueVisible: false, priceLineVisible: false });

            // RSI (Custom 'rsi' Scale - LEFT)
            const rsiSeries = chart.addSeries(LineSeries, {
                color: '#ba68c8', lineWidth: 2,
                priceScaleId: 'rsi',
                lastValueVisible: false,
                priceLineVisible: false,
            });
            const rsiOverbought = chart.addSeries(LineSeries, { color: 'rgba(255, 255, 255, 0.3)', lineWidth: 1, lineStyle: 2, priceScaleId: 'rsi', lastValueVisible: false, priceLineVisible: false });
            const rsiOversold = chart.addSeries(LineSeries, { color: 'rgba(255, 255, 255, 0.3)', lineWidth: 1, lineStyle: 2, priceScaleId: 'rsi', lastValueVisible: false, priceLineVisible: false });

            // --- Pane Layout ---

            // Price Pane (Top 75%)
            chart.priceScale('right').applyOptions({
                scaleMargins: { top: 0.05, bottom: 0.25 },
            });

            // Volume Overlay (Bottom 15% of Price Pane)
            chart.priceScale('volume').applyOptions({
                scaleMargins: { top: 0.60, bottom: 0.25 },
                visible: false,
            });

            // RSI Pane (Bottom 25%) - Hide numeric axis to declutter price scale
            chart.priceScale('rsi').applyOptions({
                scaleMargins: { top: 0.76, bottom: 0 },
                visible: false,
                borderColor: gridColor,
            });

            // --- Data Processing ---
            const candleData = [];
            const ema50Data = [];
            const ema200Data = [];
            const volumeData = [];
            const volumeSmaData = [];
            const rsiData = [];
            const rsiLevel70 = [];
            const rsiLevel30 = [];

            data.forEach(d => {
                const time = d.Date.split('T')[0];
                if (d.Open !== null && d.Open !== undefined) {
                    candleData.push({ time, open: d.Open, high: d.High, low: d.Low, close: d.Close });
                    const color = d.Close >= d.Open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)';
                    volumeData.push({ time, value: d.Volume, color });
                }
                if (d.ema_50 !== null && d.ema_50 !== undefined) ema50Data.push({ time, value: d.ema_50 });
                if (d.ema_200 !== null && d.ema_200 !== undefined) ema200Data.push({ time, value: d.ema_200 });
                if (d.volume_sma_20 !== null && d.volume_sma_20 !== undefined) volumeSmaData.push({ time, value: d.volume_sma_20 });
                if (d.rsi !== null && d.rsi !== undefined) {
                    rsiData.push({ time, value: d.rsi });
                    rsiLevel70.push({ time, value: 70 });
                    rsiLevel30.push({ time, value: 30 });
                }
            });

            candleSeries.setData(candleData);
            ema50Series.setData(ema50Data);
            ema200Series.setData(ema200Data);
            volumeSeries.setData(volumeData);
            volSmaSeries.setData(volumeSmaData);
            rsiSeries.setData(rsiData);
            rsiOverbought.setData(rsiLevel70);
            rsiOversold.setData(rsiLevel30);

            // --- Support & Resistance Lines ---
            srLevels.forEach(level => {
                candleSeries.createPriceLine({
                    price: level.price,
                    color: level.type === 'resistance' ? '#ef4444' : '#22c55e',
                    lineWidth: 1.5,
                    lineStyle: 1, // Solid-dotted mix
                    axisLabelVisible: false,
                    title: level.type.toUpperCase(),
                });
            });

            chart.timeScale().fitContent();

            // --- Legend Handling ---
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

            chart.subscribeCrosshairMove(param => {
                const last = data[data.length - 1];
                if (!param.time || param.point.x < 0 || param.point.y < 0) {
                    updateLegend(last);
                } else {
                    const price = param.seriesData.get(candleSeries);
                    const e50 = param.seriesData.get(ema50Series);
                    const e200 = param.seriesData.get(ema200Series);
                    const r = param.seriesData.get(rsiSeries);
                    const v = param.seriesData.get(volumeSeries);

                    updateLegend({
                        Open: price?.open || last?.Open,
                        High: price?.high || last?.High,
                        Low: price?.low || last?.Low,
                        Close: price?.close || price?.value || last?.Close,
                        ema_50: e50?.value,
                        ema_200: e200?.value,
                        rsi: r?.value,
                        Volume: v?.value || last.Volume
                    });
                }
            });

            function updateLegend(d) {
                if (!d) return;
                legend.innerHTML = `
                    <div style="font-size: 14px; font-weight: 600; color: #e5e7eb; margin-bottom: 2px;">
                        Technical Analysis
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="display: flex; gap: 4px;">
                            <span style="color: #9ca3af;">O</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Open?.toFixed(2)}</span>
                            <span style="color: #9ca3af;">H</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.High?.toFixed(2)}</span>
                            <span style="color: #9ca3af;">L</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Low?.toFixed(2)}</span>
                            <span style="color: #9ca3af;">C</span> <span style="${d.Open >= d.Close ? 'color: #ef4444' : 'color: #22c55e'}">${d.Close?.toFixed(2)}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <span style="color: #2962ff">EMA50 ${d.ema_50?.toFixed(2)}</span>
                        <span style="color: #ffa500">EMA200 ${d.ema_200?.toFixed(2)}</span>
                        <span style="color: #ba68c8">RSI ${d.rsi?.toFixed(2)}</span>
                        <span style="color: #94a3b8">Vol ${d.Volume ? (d.Volume / 1000000).toFixed(1) + 'M' : '-'}</span>
                    </div>
                `;
            }
            updateLegend(data[data.length - 1]);

            const handleResize = (entries) => {
                if (!chart || !entries || entries.length === 0) return;
                const { width } = entries[0].contentRect;
                chart.applyOptions({ width });
            };

            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(chartContainerRef.current);

            return () => {
                resizeObserver.disconnect();
                chart.remove();
                if (chartContainerRef.current) chartContainerRef.current.innerHTML = '';
            };
        } catch (error) {
            console.error('StockChart Error:', error);
        }
    }, [data, colors]);

    return (
        <div ref={chartContainerRef} className="w-full h-[600px] bg-[#242424] relative overflow-hidden" />
    );
};

export default StockChart;
