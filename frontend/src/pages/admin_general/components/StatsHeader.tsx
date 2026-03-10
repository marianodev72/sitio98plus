import React from "react";

export default function StatsHeader({
  orgHeader = "BASE NAVAL USHUAIA - DEPARTAMENTO ALCALDIA",
  orgSubheader = "Estadísticas Institucionales – ORGANO ADMINISTRADOR VVFFZN98",
  barrio,
  barrios,
  onChangeBarrio,
  emittedLabel,
}: {
  orgHeader?: string;
  orgSubheader?: string;
  barrio: string;
  barrios: string[];
  onChangeBarrio: (b: string) => void;
  emittedLabel: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        padding: 18,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.2 }}>{orgHeader}</div>
      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, opacity: 0.85 }}>{orgSubheader}</div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ fontWeight: 700 }}>Ámbito:</label>
          <select
            value={barrio}
            onChange={(e) => onChangeBarrio(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc" }}
          >
            <option value="TODOS">Todos</option>
            {barrios.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <span style={{ fontSize: 13, opacity: 0.8 }}>{emittedLabel}</span>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button disabled style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #ddd", opacity: 0.6 }}>
            Descargar informe (PDF)
          </button>
          <button disabled style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #ddd", opacity: 0.6 }}>
            Descargar tablero (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}
