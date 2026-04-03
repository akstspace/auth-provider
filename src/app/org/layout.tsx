import { LoginRequired } from "@/components/login-required"
import { AppNavbar } from "@/components/app-navbar"

export default function OrgLayout({ children }: { children: React.ReactNode }) {
    return (
        <LoginRequired>
            <div className="min-h-dvh bg-background text-foreground transition-colors duration-200">
                <AppNavbar />
                {children}
            </div>
        </LoginRequired>
    )
}
