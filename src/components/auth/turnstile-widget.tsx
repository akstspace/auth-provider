"use client"

import { Turnstile } from "react-turnstile"
import { useTheme } from "next-themes"
import { captchaEnabled, captchaSiteKey } from "@/lib/captcha"

interface TurnstileWidgetProps {
  onTokenChange: (token: string | null) => void
}

export function TurnstileWidget({ onTokenChange }: TurnstileWidgetProps) {
  const { resolvedTheme } = useTheme()

  if (!captchaEnabled) return null

  return (
    <div className="min-h-16 overflow-hidden rounded-xl bg-card [&_iframe]:-m-px [&_iframe]:block [&_iframe]:rounded-[inherit] [&_iframe]:border-0">
      <Turnstile
        sitekey={captchaSiteKey}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        size="flexible"
        fixedSize
        retry="auto"
        refreshExpired="auto"
        onVerify={(token) => onTokenChange(token)}
        onExpire={() => onTokenChange(null)}
        onError={() => onTokenChange(null)}
      />
    </div>
  )
}
