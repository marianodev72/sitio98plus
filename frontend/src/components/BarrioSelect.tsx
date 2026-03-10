import { useEffect, useState } from "react";
import { http } from "../api/http";

type Props = {
  value: string;
  onChange: (barrio: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function BarrioSelect({
  value,
  onChange,
  disabled,
  placeholder = "Seleccionar barrio…",
}: Props) {
  const [barrios, setBarrios] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const res = await http.get("/barrios");
      const list = Array.isArray(res.data?.barrios) ? res.data.barrios : [];
      setBarrios(list.map((x: any) => String(x || "").trim()).filter(Boolean));
    } catch (e) {
      console.error("[BARRIO SELECT] Error cargando barrios", e);
      setBarrios([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      style={{ width: "100%" }}
    >
      <option value="">{loading ? "Cargando barrios…" : placeholder}</option>
      {barrios.map((b) => (
        <option key={b} value={b}>
          {b}
        </option>
      ))}
    </select>
  );
}
