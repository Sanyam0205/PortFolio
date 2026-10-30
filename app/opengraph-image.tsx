import { ImageResponse } from "next/og";
import { portfolio } from "@/content/portfolio";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${portfolio.name}, ${portfolio.role}`;

export default function OpenGraphImage() {
  const line = { stroke: "#7f889e", strokeWidth: 2.5 };
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#ffffff", padding: 80, gap: 40 }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 92, letterSpacing: -3, color: "#1d1d1f" }}>{portfolio.name}</div>
        <div style={{ fontSize: 44, color: "#6b0f1a", marginTop: 12 }}>{portfolio.role}</div>
      </div>
      <svg width="350" height="500" viewBox="0 0 210 300">
        <rect x="48" y="118" width="38" height="108" rx="19" transform="rotate(20 67 118)" fill="#fff" {...line} />
        <rect x="124" y="118" width="38" height="108" rx="19" transform="rotate(-20 143 118)" fill="#fff" {...line} />
        <rect x="62" y="225" width="34" height="50" rx="17" fill="#fff" {...line} />
      <rect x="114" y="225" width="34" height="50" rx="17" fill="#fff" {...line} />
      <ellipse cx="65" cy="270" rx="28" ry="20" fill="#fff" {...line} />
        <ellipse cx="145" cy="270" rx="28" ry="20" fill="#fff" {...line} />
        <path d="M66 112 C50 150 42 200 58 232 C70 250 140 250 152 232 C168 200 160 150 144 112 Z" fill="#fff" {...line} />
        <ellipse cx="105" cy="60" rx="58" ry="48" fill="#fff" {...line} />
        <ellipse cx="85" cy="76" rx="6.5" ry="11" fill="#14141a" />
        <ellipse cx="125" cy="76" rx="6.5" ry="11" fill="#14141a" />
        <rect x="52" y="102" width="106" height="24" rx="12" fill="#8a121f" />
        <path d="M74 102h12l6 24H80zM104 102h12l6 24h-12zM134 102h10l4 24h-10z" fill="#16121a" />
        <rect x="124" y="116" width="26" height="82" rx="10" fill="#8a121f" />
        <rect x="124" y="136" width="26" height="18" fill="#16121a" />
        <rect x="124" y="172" width="26" height="18" fill="#16121a" />
      </svg>
    </div>,
    size,
  );
}
