import React from "react";

export default function KpiCard({
  title,
  value,
  subtitle,
  accent,
  onDownloadCSV,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: string;
  onDownloadCSV?: () => void;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: 14,
        padding: 16,
        background: "#fff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: accent || "#111",
          opacity: 0.9,
        }}
      />
      <div style={{ paddingLeft: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.9 }}>{title}</div>
        <div style={{ marginTop: 10, fontSize: 36, fontWeight: 900, letterSpacing: -0.4 }}>{value}</div>
        {subtitle ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>{subtitle}</div> : null}

        <div style={{ marginTop: 12 }}>
          <button
            onClick={onDownloadCSV}
            style={{
              padding: "7px 10px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: onDownloadCSV ? "pointer" : "default",
              opacity: onDownloadCSV ? 1 : 0.6,
            }}
            disabled={!onDownloadCSV}
          >
            Descargar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
