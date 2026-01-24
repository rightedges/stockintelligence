import React, { useEffect, useRef } from 'react';
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    HistogramSeries,
    CrosshairMode
} from 'lightweight-charts';

const StockChart = ({ data, colors = {} }) => {
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
            const ema50Series = chart.addSeries(LineSeries, { color: 'rgba(41, 98, 255, 1)', lineWidth: 2, title: 'EMA 50', priceScaleId: 'right' });
            const ema200Series = chart.addSeries(LineSeries, { color: 'rgba(255, 165, 0, 1)', lineWidth: 2, title: 'EMA 200', priceScaleId: 'right' });

            // Volume (Custom 'volume' Scale)
            const volumeSeries = chart.addSeries(HistogramSeries, {
                color: '#26a69a',
                priceFormat: { type: 'volume' },
                priceScaleId: 'volume',
            });
            const volSmaSeries = chart.addSeries(LineSeries, { color: '#ffffff', lineWidth: 1, title: 'SMA 20', priceScaleId: 'volume' });

            // RSI (Custom 'rsi' Scale)
            const rsiSeries = chart.addSeries(LineSeries, {
                color: '#ba68c8', lineWidth: 2, title: 'RSI 14',
                priceScaleId: 'rsi',
            });
            const rsiOverbought = chart.addSeries(LineSeries, { color: 'rgba(255, 255, 255, 0.3)', lineWidth: 1, lineStyle: 2, title: '70', priceScaleId: 'rsi' });
            const rsiOversold = chart.addSeries(LineSeries, { color: 'rgba(255, 255, 255, 0.3)', lineWidth: 1, lineStyle: 2, title: '30', priceScaleId: 'rsi' });

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

            // RSI Pane (Bottom 25%)
            chart.priceScale('rsi').applyOptions({
                scaleMargins: { top: 0.76, bottom: 0 },
                visible: true,
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

            chart.timeScale().fitContent();

            const handleResize = () => {
                if (chartContainerRef.current) {
                    chart.applyOptions({ width: chartContainerRef.current.clientWidth });
                }
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                chart.remove();
            };
        } catch (error) {
            console.error('StockChart Error:', error);
        }
    }, [data, colors]);

    return (
        <div ref={chartContainerRef} className="w-full h-[600px] bg-[#242424]" />
    );
};

export default StockChart;
