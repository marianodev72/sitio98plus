// src/pages/Home.tsx
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "16px",
        textAlign: "center",
      }}
    >
      <h1>Sitio 98</h1>

      <p>
        La página solicitada no está disponible.
        <br />
        Por favor, utilice las opciones de navegación habilitadas.
      </p>

      <Link to="/login">
        <button>Ingresar</button>
      </Link>
    </div>
  );
}
