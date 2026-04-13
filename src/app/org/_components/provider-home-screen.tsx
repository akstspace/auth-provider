"use client"

import Link from "next/link"
import { motion } from "motion/react"
import {
    ChevronRight,
    Fingerprint,
    Loader2,
    Shield,
    User,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { pageEnterMotion } from "@/lib/motion"
import { isPlatformAdmin } from "@/lib/platform-admin"

export function ProviderHomeScreen() {
    const { data: session, isPending } = authClient.useSession()

    if (isPending) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const canAccessPlatformAdmin = isPlatformAdmin(session?.user?.role)
    const shortcuts = [
        {
            href: "/settings/profile",
            icon: User,
            title: "Account",
            description: "Update your name and basic profile details.",
        },
        {
            href: "/settings/passkeys",
            icon: Fingerprint,
            title: "Passkeys",
            description: "Add or remove passkeys for faster sign-in.",
        },
        {
            href: "/settings/security",
            icon: Shield,
            title: "Security",
            description: "Manage 2FA, devices, and app access.",
        },
    ]

    return (
        <main className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.section
                {...pageEnterMotion}
                className="space-y-6 pb-16 pt-12"
            >
                <div className="rounded-lg border bg-card p-6 sm:p-8">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">
                            {session?.user?.name || "Your account"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {session?.user?.email || "Signed in"}
                        </p>
                        {canAccessPlatformAdmin ? (
                            <div className="inline-flex rounded-md border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                                Platform admin
                            </div>
                        ) : null}
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        {shortcuts.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group rounded-lg border bg-background p-5 transition-colors hover:bg-accent"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex size-10 items-center justify-center rounded-md border bg-muted">
                                            <item.icon className="size-4 text-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{item.title}</p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[#c94b1f]" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </motion.section>
        </main>
    )
}
