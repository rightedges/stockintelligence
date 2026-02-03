import React, { useState, useEffect } from 'react';
import ChartPane from './ChartPane';
import type { LogicalRange, MouseEventParams } from 'lightweight-charts';

const ChartLayout: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [syncRange, setSyncRange] = useState<LogicalRange | null>(null);
    const [syncCrosshair, setSyncCrosshair] = useState<MouseEventParams | null>(null);

    useEffect(() => {
        fetch('/data.json')
            .then(res => res.json())
            .then(data => setData(data))
            .catch(err => console.error("Error loading data:", err));
    }, []);

    const handleTimeRangeChange = (range: LogicalRange | null) => {
        setSyncRange(range);
    };

    const handleCrosshairMove = (params: MouseEventParams) => {
        setSyncCrosshair(params);
    };

    if (data.length === 0) return <div>Loading data...</div>;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            backgroundColor: '#131722',
            gap: '2px', // Visual separation like panes
            overflow: 'hidden'
        }}>
            {/* Main OHLC Chart */}
            <div style={{ flex: 3, position: 'relative', overflow: 'hidden' }}>
                <ChartPane
                    data={data}
                    type="candle"
                    height={0} // Using flex
                    title="AAPL - Daily"
                    onTimeRangeChange={handleTimeRangeChange}
                    onCrosshairMove={handleCrosshairMove}
                    syncRange={syncRange}
                    syncCrosshair={syncCrosshair}
                />
            </div>

            {/* RSI Indicator Pane */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <ChartPane
                    data={data}
                    type="line"
                    height={0} // Using flex
                    title="RSI (14)"
                    onTimeRangeChange={handleTimeRangeChange}
                    onCrosshairMove={handleCrosshairMove}
                    syncRange={syncRange}
                    syncCrosshair={syncCrosshair}
                />
            </div>

            {/* Volume Pane */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <ChartPane
                    data={data}
                    type="histogram"
                    height={0} // Using flex
                    title="Volume"
                    onTimeRangeChange={handleTimeRangeChange}
                    onCrosshairMove={handleCrosshairMove}
                    syncRange={syncRange}
                    syncCrosshair={syncCrosshair}
                />
            </div>
        </div>
    );
};

export default ChartLayout;
