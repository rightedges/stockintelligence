import * as React from "react"
import { cn } from "../../lib/utils"
import { ChevronDown } from "lucide-react"

const Select = ({ children, value, onValueChange }) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const containerRef = React.useRef(null)

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <div className="relative w-full" ref={containerRef}>
            {React.Children.map(children, child => {
                if (!React.isValidElement(child)) return null

                if (child.type.displayName === "SelectTrigger") {
                    return React.cloneElement(child, {
                        onClick: () => setIsOpen(!isOpen),
                        selectedId: value
                    })
                }
                if (child.type.displayName === "SelectContent" && isOpen) {
                    return React.cloneElement(child, {
                        onSelect: (val) => {
                            onValueChange(val);
                            setIsOpen(false);
                        },
                        onClose: () => setIsOpen(false)
                    })
                }
                return null
            })}
        </div>
    )
}

const SelectTrigger = React.forwardRef(({ className, children, onClick, selectedId, ...props }, ref) => (
    <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-white hover:bg-gray-900 transition-colors",
            className
        )}
        {...props}
    >
        {React.Children.map(children, child => {
            if (React.isValidElement(child) && child.type.displayName === "SelectValue") {
                return React.cloneElement(child, { selectedId })
            }
            return child
        })}
        <ChevronDown size={14} className="opacity-50" />
    </button>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder, selectedId, children }) => {
    return (
        <span className="truncate">
            {children || selectedId || placeholder}
        </span>
    )
}
SelectValue.displayName = "SelectValue"

const SelectContent = ({ children, onSelect, onClose, className }) => {
    return (
        <div className={cn("absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-800 bg-gray-950 p-1 text-white shadow-md animate-in fade-in zoom-in-95", className)}>
            {React.Children.map(children, child => {
                if (React.isValidElement(child) && child.type.displayName === "SelectItem") {
                    return React.cloneElement(child, {
                        onClick: () => onSelect(child.props.value)
                    })
                }
                return child
            })}
        </div>
    )
}
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, children, onClick, ...props }, ref) => (
    <div
        ref={ref}
        onClick={onClick}
        className={cn(
            "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-gray-800 focus:bg-gray-800 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer",
            className
        )}
        {...props}
    >
        {children}
    </div>
))
SelectItem.displayName = "SelectItem"

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
