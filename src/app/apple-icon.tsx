import { ImageResponse } from "next/og";

// iOS wil een PNG voor het scherm-icoon en zet er zelf geen achtergrond achter,
// vandaar hetzelfde merkteken maar dan volvlak gerenderd.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3F6B4F",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path
            d="M25 13c-3.4 3 2.6 5.4-.8 8.4M39 13c-3.4 3 2.6 5.4-.8 8.4"
            fill="none"
            stroke="#D9A441"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <rect x="11" y="26" width="42" height="6" rx="3" fill="#FFFFFF" />
          <rect x="5" y="35" width="10" height="5" rx="2.5" fill="#FFFFFF" />
          <rect x="49" y="35" width="10" height="5" rx="2.5" fill="#FFFFFF" />
          <path
            d="M14 34h36v9.5A8.5 8.5 0 0 1 41.5 52h-19A8.5 8.5 0 0 1 14 43.5z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    ),
    size,
  );
}
