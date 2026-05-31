"use client";

/**
 * KintoLogo — Brand mark for Kinto Care
 * Option B: Pulse icon in navy square + serif wordmark
 *
 * Usage:
 *   <KintoLogo />                  — default (icon + wordmark, size md)
 *   <KintoLogo size="sm" />        — smaller (login/onboarding header)
 *   <KintoLogo size="lg" />        — larger (marketing)
 *   <KintoLogo iconOnly />         — KC square only (app icon, favicon context)
 *   <KintoLogo wordmarkOnly />     — wordmark only (no icon)
 */

type KintoLogoProps = {
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  wordmarkOnly?: boolean;
  className?: string;
};

export function KintoLogo({
  size = "md",
  iconOnly = false,
  wordmarkOnly = false,
  className = "",
}: KintoLogoProps) {
  const sizes = {
    sm: { icon: 28, pulse: 18, font: "1.25rem", sub: "0.6rem" },
    md: { icon: 36, pulse: 22, font: "1.5rem", sub: "0.65rem" },
    lg: { icon: 48, pulse: 30, font: "2rem", sub: "0.75rem" },
  };

  const s = sizes[size];

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="img"
      aria-label="Kinto Care"
    >
      {/* Pulse icon */}
      {!wordmarkOnly && (
        <div
          style={{
            width: s.icon,
            height: s.icon,
            borderRadius: 8,
            background: "#1A2B3C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width={s.pulse}
            height={s.pulse}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <polyline
              points="2,12 6,12 9,4 12,20 15,8 18,12 22,12"
              stroke="#0D9488"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Wordmark */}
      {!iconOnly && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                fontFamily: "var(--font-playfair), Georgia, serif",
                fontSize: s.font,
                fontWeight: 700,
                color: "#1A2B3C",
                letterSpacing: "-0.3px",
              }}
            >
              Kinto
            </span>
            <span
              style={{
                fontFamily: "var(--font-playfair), Georgia, serif",
                fontSize: s.font,
                fontWeight: 400,
                color: "#0D9488",
                letterSpacing: "-0.3px",
                marginLeft: 5,
              }}
            >
              Care
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
