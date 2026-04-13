"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import {
    Fingerprint,
    KeyRound,
    Shield,
    User,
    Users,
} from "lucide-react"
import {
    AppShellLayout,
    AppShellUtilitySection,
    AppSidebarSection,
} from "@/components/app-shell"
import { LoginRequired } from "@/components/login-required"
import { pageEnterMotion } from "@/lib/motion"

interface NavItem {
    href: string
    label: string
    icon: typeof Users
}

const ACCOUNT_NAV_ITEMS: NavItem[] = [
    { href: "/settings/profile", label: "Profile", icon: User },
    { href: "/settings/passkeys", label: "Passkeys", icon: Fingerprint },
    { href: "/settings/security", label: "Security", icon: Shield },
]

const ADVANCED_NAV_ITEMS: NavItem[] = [
    { href: "/settings/oauth-clients", label: "OAuth Clients", icon: KeyRound },
]

export function SettingsLayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    const getNavItemClassName = (item: NavItem) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
            ? "border border-border bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-[#c94b1f]"
            }`
    }

    return (
        <LoginRequired>
            <div className="min-h-dvh bg-background text-foreground transition-colors duration-200">
                <AppShellLayout
                    contentClassName="max-w-5xl"
                    sidebar={({ closeSidebar }) => (
                        <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={pageEnterMotion.transition}
                            className="space-y-6"
                        >
                            <AppSidebarSection title="Account">
                                <nav className="space-y-1">
                                    {ACCOUNT_NAV_ITEMS.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={closeSidebar}
                                            className={getNavItemClassName(item)}
                                        >
                                            <item.icon className="size-4" />
                                            {item.label}
                                        </Link>
                                    ))}
                                </nav>
                            </AppSidebarSection>

                            <AppSidebarSection title="Advanced">
                                <nav className="space-y-1">
                                    {ADVANCED_NAV_ITEMS.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={closeSidebar}
                                            className={getNavItemClassName(item)}
                                        >
                                            <item.icon className="size-4" />
                                            {item.label}
                                        </Link>
                                    ))}
                                </nav>
                            </AppSidebarSection>

                            <AppShellUtilitySection closeSidebar={closeSidebar} />
                        </motion.div>
                    )}
                >
                    <motion.div
                        key={pathname}
                        {...pageEnterMotion}
                        className="min-w-0"
                    >
                        {children}
                    </motion.div>
                </AppShellLayout>
            </div>
        </LoginRequired>
    )
}
