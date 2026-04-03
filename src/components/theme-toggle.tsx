"use client"

import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { Sun, Moon, Monitor } from "lucide-react"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const mounted = useSyncExternalStore(
        () => () => { },
        () => true,
        () => false,
    )

    if (!mounted) return <div className="size-9" />

    const options = [
        { value: "light", icon: Sun, label: "Light mode" },
        { value: "dark", icon: Moon, label: "Dark mode" },
        { value: "system", icon: Monitor, label: "System preference" },
    ] as const

    return (
        <div className="flex items-center gap-1 rounded-full border border-border/50 bg-muted/50 p-1 backdrop-blur-sm">
            {options.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    aria-label={label}
                    className={`rounded-full p-1.5 transition-colors ${theme === value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Icon className="size-4" />
                </button>
            ))}
        </div>
    )
}
