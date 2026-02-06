import * as React from "react"
import { cn } from "../../lib/utils"

const Slider = React.forwardRef(({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    const val = Array.isArray(value) ? value[0] : value
    return (
        <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={val}
                onChange={(e) => onValueChange && onValueChange([parseFloat(e.target.value)])}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                ref={ref}
                {...props}
            />
        </div>
    )
})
Slider.displayName = "Slider"

export { Slider }
