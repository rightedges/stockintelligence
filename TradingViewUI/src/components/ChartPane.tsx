import React, { useEffect, useRef } from 'react';
import type {
    IChartApi,
    ISeriesApi,
    SeriesType,
    ChartOptions,
    DeepPartial,
    Time,
    LogicalRange,
    MouseEventParams
} from 'lightweight-charts';
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    HistogramSeries
} from 'lightweight-charts';

interface ChartPaneProps {
    data: any[];
    type: 'candle' | 'line' | 'histogram';
    options?: DeepPartial<ChartOptions>;
    height: number;
    title?: string;
    onTimeRangeChange?: (range: LogicalRange | null) => void;
    onCrosshairMove?: (params: MouseEventParams) => void;
    syncRange?: LogicalRange | null;
    syncCrosshair?: MouseEventParams | null;
}

const ChartPane: React.FC<ChartPaneProps> = ({
    data,
    type,
    options,
    height,
    title,
    onTimeRangeChange,
    onCrosshairMove,
    syncRange,
    syncCrosshair
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            ...options,
            autoSize: true, // Let it handle resizing itself
            layout: {
                background: { color: '#131722' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
            },
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                minimumWidth: 80, // Ensure all panes have the same price scale width
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                visible: type === 'histogram' ? true : false,
            },
            crosshair: {
                mode: 0,
                vertLine: {
                    labelBackgroundColor: '#9B7DFF',
                },
                horzLine: {
                    labelBackgroundColor: '#9B7DFF',
                },
            },
        });

        chartRef.current = chart;

        let series: ISeriesApi<SeriesType>;
        if (type === 'candle') {
            series = chart.addSeries(CandlestickSeries, {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            });
            series.setData(data.map(d => ({
                time: d.time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close
            })));

            // Add moving averages to the same chart if it's the candle chart
            const sma20 = chart.addSeries(LineSeries, { color: 'rgba(255, 255, 0, 0.5)', lineWidth: 1 });
            sma20.setData(data.map(d => ({ time: d.time, value: d.sma_20 })));
        } else if (type === 'line') {
            series = chart.addSeries(LineSeries, {
                color: '#2962FF',
                lineWidth: 2,
            });
            series.setData(data.map(d => ({ time: d.time, value: d.rsi })));
        } else {
            series = chart.addSeries(HistogramSeries, {
                color: '#26a69a',
                priceFormat: {
                    type: 'volume',
                },
            });
            series.setData(data.map(d => ({
                time: d.time,
                value: d.volume,
                color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
            })));
        }

        seriesRef.current = series;

        // Sync logic
        if (onTimeRangeChange) {
            chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
                onTimeRangeChange(range);
            });
        }

        if (onCrosshairMove) {
            chart.subscribeCrosshairMove((params) => {
                onCrosshairMove(params);
            });
        }

        return () => {
            chart.remove();
        };
    }, [data, type, height]);

    // Apply sync from outside
    useEffect(() => {
        if (chartRef.current && syncRange) {
            chartRef.current.timeScale().setVisibleLogicalRange(syncRange);
        }
    }, [syncRange]);

    useEffect(() => {
        if (chartRef.current && syncCrosshair) {
            const time = syncCrosshair.time;
            if (time) {
                chartRef.current.setCrosshairPosition(0, time as Time, seriesRef.current!);
            } else {
                chartRef.current.clearCrosshairPosition();
            }
        }
    }, [syncCrosshair]);

    return (
        <div style={{ position: 'relative', height: height || '100%', width: '100%' }}>
            {title && (
                <div style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    zIndex: 2,
                    color: '#d1d4dc',
                    fontSize: '12px',
                    pointerEvents: 'none'
                }}>
                    {title}
                </div>
            )}
            <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default ChartPane;
