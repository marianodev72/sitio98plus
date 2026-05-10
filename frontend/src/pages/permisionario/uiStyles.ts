// frontend/src/pages/permisionario/uiStyles.ts
export const pageStyle = {
  background: "#0b1220",
  minHeight: "100vh",
  padding: "clamp(12px, 2vw, 20px)",
  color: "#e5e7eb",
  overflowX: "hidden" as const,
  boxSizing: "border-box" as const,
};

export const shellStyle = {
  width: "100%",
  maxWidth: 1100,
  margin: "0 auto",
  minWidth: 0,
  boxSizing: "border-box" as const,
};

export const heroStyle = {
  marginBottom: 20,
};

export const titleStyle = {
  margin: 0,
  fontSize: "clamp(22px, 3vw, 30px)",
  fontWeight: 800,
  letterSpacing: -0.4,
  color: "#ffffff",
};

export const subtitleStyle = {
  marginTop: 8,
  marginBottom: 0,
  maxWidth: 760,
  fontSize: 15,
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.72)",
};

export const cardStyle = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 16,
  padding: "clamp(12px, 2vw, 18px)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
  minWidth: 0,
  boxSizing: "border-box" as const,
};

export const softCardStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: "clamp(12px, 2vw, 14px)",
  minWidth: 0,
  boxSizing: "border-box" as const,
};

export const sectionTitleStyle = {
  margin: "0 0 12px 0",
  fontSize: 18,
  fontWeight: 700,
  color: "#ffffff",
};

export const infoRowStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 12,
  marginBottom: 14,
  fontSize: 14,
  lineHeight: 1.5,
  color: "rgba(255,255,255,0.86)",
};

export const metaStyle = {
  fontSize: 12,
  lineHeight: 1.5,
  color: "rgba(255,255,255,0.68)",
};

export const noteStyle = {
  marginTop: 16,
  fontSize: 12,
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.62)",
};

export const buttonRowStyle = {
  marginTop: 14,
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
};

export const primaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
  maxWidth: "100%",
};

export const secondaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
  maxWidth: "100%",
};

export const successButtonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  maxWidth: "100%",
};

export const moduleButtonStyle = {
  padding: "14px 16px",
  minHeight: 56,
  textAlign: "left" as const,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
  maxWidth: "100%",
};

export const modulesGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 4,
};

export const infoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

export const statusHeaderStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
};

export const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#ffffff",
};
