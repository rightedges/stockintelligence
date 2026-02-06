import * as React from "react"
import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => (
    <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        ref={ref}
        onClick={() => onCheckedChange && onCheckedChange(!checked)}
        className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-gray-800 shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white",
            checked ? "bg-blue-600" : "bg-transparent",
            className
        )}
        {...props}
    >
        {checked && (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3 text-white m-auto"
            >
                <polyline points="20 6 9 17 4 12" />
            </svg>
        )}
    </button>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
