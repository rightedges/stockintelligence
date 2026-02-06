import * as React from "react"
import { cn } from "../../lib/utils"

const TabsContext = React.createContext(null)

const Tabs = ({ defaultValue, value, onValueChange, children, className }) => {
    const [activeTab, setActiveTab] = React.useState(value || defaultValue)

    React.useEffect(() => {
        if (value !== undefined) {
            console.log("Tabs syncing with value:", value);
            setActiveTab(value)
        }
    }, [value])

    const handleTabChange = (val) => {
        console.log("Tab Change Requested:", val);
        setActiveTab(val)
        if (onValueChange) onValueChange(val)
    }

    return (
        <TabsContext.Provider value={{ activeTab, handleTabChange }}>
            <div className={cn("space-y-2", className)}>
                {children}
            </div>
        </TabsContext.Provider>
    )
}

const TabsList = ({ children, className }) => (
    <div className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-gray-900 p-1 text-gray-400", className)}>
        {children}
    </div>
)

const TabsTrigger = ({ value, children, className }) => {
    const { activeTab, handleTabChange } = React.useContext(TabsContext)
    const active = activeTab === value

    return (
        <button
            type="button"
            onClick={() => {
                console.log(`TabsTrigger Clicked: ${value}`);
                // window.alert(`Switching to ${value}`);
                handleTabChange(value);
            }}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                active ? "bg-gray-800 text-white shadow" : "hover:text-gray-200",
                className
            )}
        >
            {children}
        </button>
    )
}

const TabsContent = ({ value, children, className }) => {
    const { activeTab } = React.useContext(TabsContext)

    if (activeTab !== value) return null

    return (
        <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
            {children}
        </div>
    )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
