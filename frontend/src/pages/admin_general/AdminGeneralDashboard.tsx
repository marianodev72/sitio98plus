// src/pages/admin_general/AdminGeneralDashboard.tsx

import { useAuth } from "../../auth/useAuth";
import {
  cardStyle,
  heroStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
  pageStyle,
  shellStyle,
  sectionTitleStyle,
} from "../permisionario/uiStyles";

export default function AdminGeneralDashboard() {
  const { user } = useAuth();

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h1 style={titleStyle}>Panel Admin General</h1>
          <p style={subtitleStyle}>
            Panel institucional para administración general, acceso a módulos transversales y control
            operativo del sistema.
          </p>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Usuario activo</h3>

          <div style={softCardStyle}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.62)",
                marginBottom: 6,
              }}
            >
              Administrador
            </div>

            <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff" }}>
              {user?.nombre} {user?.apellido}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}