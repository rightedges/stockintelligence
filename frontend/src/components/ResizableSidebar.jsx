import React, { useState, useCallback, useEffect } from 'react';

const ResizableSidebar = ({ children, initialWidth = 300, minWidth = 200, maxWidth = 600 }) => {
    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = useCallback((mouseDownEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (mouseMoveEvent) => {
            if (isResizing) {
                // Calculate new width: Window Width - Mouse X
                // (Since it's a right sidebar, width is distance from right edge)
                const newWidth = window.innerWidth - mouseMoveEvent.clientX;
                if (newWidth >= minWidth && newWidth <= maxWidth) {
                    setWidth(newWidth);
                }
            }
        },
        [isResizing, minWidth, maxWidth]
    );

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <div
            className="relative flex flex-col border-l border-gray-800 bg-gray-900 h-full"
            style={{ width: width, minWidth: width }}
        >
            {/* Drag Handle */}
            <div
                className={`absolute top-0 bottom-0 left-0 w-1 cursor-col-resize z-50 hover:bg-blue-500/50 transition-colors ${isResizing ? 'bg-blue-500' : 'bg-transparent'}`}
                onMouseDown={startResizing}
            />

            {/* Content */}
            <div className="flex-1 overflow-hidden h-full">
                {children}
            </div>
        </div>
    );
};

export default ResizableSidebar;
