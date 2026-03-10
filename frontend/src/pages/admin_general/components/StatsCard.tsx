import React from "react";

export default function StatsCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 16, background: "#fff" }}>
      <div style={{ fontSize: 15, fontWeight: 900 }}>{title}</div>
      {subtitle ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>{subtitle}</div> : null}
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}
