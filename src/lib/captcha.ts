export const captchaSiteKey =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export const captchaEnabled = Boolean(captchaSiteKey);

export const captchaHeader = (token: string | null) =>
  token
    ? {
        "x-captcha-response": token,
      }
    : {};
