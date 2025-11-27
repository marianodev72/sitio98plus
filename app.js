// frontend/js/app.js

console.log("Frontend cargado correctamente ✅");

// ---------------- API base ----------------
const API_BASE = (() => {
  const { protocol, hostname, port } = window.location;
  // Si servís el frontend en 8080/5173/5500, habla con backend en 3000
  if (port === "8080" || port === "5173" || port === "5500") return "http://127.0.0.1:3000";
  // Si no, mismo host/puerto (por si en algún momento sirves todo junto)
  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
})();
console.log("API_BASE =", API_BASE);

// ---------------- DOM refs ----------------
const $ = (sel) => document.querySelector(sel);
const form = $("#login-form");
const errorBox = $("#login-error");
const adminPanel = $("#admin-panel");
const userInfo = $("#admin-info");
const btnViviendas = $("#btn-viviendas");
const btnUsuarios = $("#btn-usuarios");
const btnFormularios = $("#btn-formularios");
const view = $("#view");

// ---------------- UI helpers ----------------
function showError(msg) {
  if (!errorBox) return alert(msg);
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}
function clearError() {
  if (!errorBox) return;
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}
function setAutenticadoUI(usuario) {
  if (userInfo) userInfo.textContent = `Autenticado como ${usuario?.username ?? "usuario"}`;
  adminPanel?.classList.remove("hidden");
  $("#btn-logout")?.classList.remove("hidden");
  $("#login-card")?.classList.add("hidden");
}
function setNoAutenticadoUI() {
  if (userInfo) userInfo.textContent = "No autenticado";
  adminPanel?.classList.add("hidden");
  $("#btn-logout")?.classList.add("hidden");
  $("#login-card")?.classList.remove("hidden");
  if (view) view.innerHTML = "";
}

// ---------------- API helpers ----------------
const getToken = () => {
  try { return localStorage.getItem("token"); } catch (_) { return null; }
};
const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 401) {
    try { localStorage.removeItem("token"); } catch (_) {}
    setNoAutenticadoUI();
    showError("Sesión expirada o inválida. Inicia sesión.");
  } else if (res.status === 403) {
    showError("No tenés permisos para esta operación.");
  }
  return res;
}

// ---------------- Sesión ----------------
async function tryRestoreSession() {
  const token = getToken();
  if (!token) return;
  try {
    const res = await apiFetch("/api/users/profile", { headers: authHeaders() });
    if (!res.ok) {
      localStorage.removeItem("token");
      setNoAutenticadoUI();
      return;
    }
    const user = await res.json();
    setAutenticadoUI(user);
    renderDashboardWelcome();
  } catch (err) {
    console.error("Error restaurando sesión:", err);
  }
}

// ---------------- Render genérico ----------------
function render(title, html, actions = "") {
  if (!view) return;
  view.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h2>${title}</h2>
        <div class="actions">${actions}</div>
      </div>
      <div class="panel-body">${html}</div>
    </div>
  `;
}

// ---------------- Viviendas ----------------
async function loadViviendas() {
  const res = await apiFetch("/api/viviendas", { headers: authHeaders() });
  if (!res.ok) throw new Error("No se pudo cargar viviendas");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.data || []);
}
async function renderViviendas() {
  try {
    const items = await loadViviendas();
    const cards = items.map((v, i) => `
      <article class="card">
        <h3>${v.titulo || v.nombre || `Vivienda #${i + 1}`}</h3>
        <p>${v.descripcion || v.direccion || "Sin descripción"}</p>
        <small>${v.ciudad || v.localidad || ""}</small>
        <div class="card-actions">
          <button class="btn btn-ghost" data-view="${v._id}">Ver</button>
          <button class="btn btn-danger" data-del="${v._id}">Borrar</button>
        </div>
      </article>
    `).join("");
    const actions = `
      <button id="btn-create-viv" class="btn">+ Nueva vivienda</button>
      <button id="btn-refresh-viv" class="btn btn-ghost">Actualizar</button>
    `;
    render("Viviendas", `<div class="grid">${cards || "<em>No hay viviendas</em>"}</div>`, actions);

    $("#btn-create-viv")?.addEventListener("click", showCreateViviendaForm);
    $("#btn-refresh-viv")?.addEventListener("click", renderViviendas);
    view.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del");
        if (!confirm("¿Borrar esta vivienda?")) return;
        const res = await apiFetch(`/api/viviendas/${id}`, { method: "DELETE", headers: authHeaders() });
        if (!res.ok) return alert("No se pudo borrar (revisá permisos o id)");
        renderViviendas();
      });
    });
  } catch (e) {
    console.error(e);
    showError("No se pudieron cargar las viviendas. Revisa que el backend esté en http://127.0.0.1:3000 y el endpoint exista.");
    render("Viviendas", `<div class="grid"><em>No hay viviendas</em></div>`, `
      <button id="btn-refresh-viv" class="btn btn-ghost">Reintentar</button>
    `);
    $("#btn-refresh-viv")?.addEventListener("click", renderViviendas);
  }
}
function showCreateViviendaForm() {
  render("Nueva vivienda", `
    <form id="form-viv" class="form">
      <label>Título<input name="titulo" required /></label>
      <label>Descripción<textarea name="descripcion"></textarea></label>
      <label>Dirección<input name="direccion" /></label>
      <label>Ciudad<input name="ciudad" /></label>
      <div class="form-actions">
        <button class="btn" type="submit">Guardar</button>
        <button class="btn btn-ghost" type="button" id="cancel-viv">Cancelar</button>
      </div>
    </form>
  `);
  $("#cancel-viv")?.addEventListener("click", renderViviendas);
  $("#form-viv")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    const res = await apiFetch("/api/viviendas", {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return alert("No se pudo crear (¿rol insuficiente?)");
    renderViviendas();
  });
}

// ---------------- Usuarios ----------------
async function loadUsuarios() {
  const res = await apiFetch("/api/users", { headers: authHeaders() });
  if (!res.ok) throw new Error("No se pudo cargar usuarios");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.data || []);
}
async function renderUsuarios() {
  try {
    const items = await loadUsuarios();
    const rows = items.map(u => `
      <tr>
        <td>${u.username || u.email || "-"}</td>
        <td>${u.role || u.rol || "-"}</td>
        <td>${u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}</td>
      </tr>
    `).join("");
    render("Usuarios", `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Creado</th></tr></thead>
          <tbody>${rows || "<tr><td colspan='3'><em>No hay usuarios</em></td></tr>"}</tbody>
        </table>
      </div>
    `, `<button id="btn-refresh-users" class="btn btn-ghost">Actualizar</button>`);
    $("#btn-refresh-users")?.addEventListener("click", renderUsuarios);
  } catch (e) {
    console.error(e);
    showError("No se pudieron cargar los usuarios. Verifica http://127.0.0.1:3000/api/users");
  }
}

// ---------------- Dashboard por defecto ----------------
function renderDashboardWelcome() {
  render("Panel principal", `
    <div class="grid">
      <div class="card">
        <h3>Viviendas</h3>
        <p>Gestioná las viviendas registradas en el sistema.</p>
        <div class="card-actions"><button id="go-viviendas" class="btn">Ir a viviendas</button></div>
      </div>
      <div class="card">
        <h3>Usuarios</h3>
        <p>Consultá y administra usuarios (requiere rol).</p>
        <div class="card-actions"><button id="go-usuarios" class="btn">Ir a usuarios</button></div>o
      </div>
    </div>
  `);
  $("#go-viviendas")?.addEventListener("click", () => btnViviendas?.click());
  $("#go-usuarios")?.addEventListener("click", () => btnUsuarios?.click());
}

// ---------------- Listeners (con DOMContentLoaded) ----------------
window.addEventListener("DOMContentLoaded", () => {
  // Login
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();
      const username = (form.username?.value || "").trim();
      const password = (form.password?.value || "").trim();
      if (!username || !password) return showError("Completá usuario y contraseña.");
      try {
        const response = await apiFetch("/api/users/login", {
          method: "POST",
          body: JSON.stringify({ username, password })
        });
        if (!response.ok) {
          if (response.status === 401) return showError("Credenciales incorrectas.");
          if (response.status === 405) return showError("Método no permitido. Verificá la URL del backend.");
          return showError(`Error en login: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data?.token) return showError("Respuesta inválida del servidor (sin token).");
        try { localStorage.setItem("token", data.token); } catch (_) {}
        setAutenticadoUI(data.user || { username });
        renderDashboardWelcome();
      } catch (err) {
        console.error("Fallo de conexión:", err);
        showError("No se pudo conectar al servidor.");
      }
    });
  }

  // Delegado para el botón Salir (funciona aunque el botón aparezca después)
  document.addEventListener("click", (e) => {
    const salir = e.target.closest("#btn-logout");
    if (!salir) return;
    e.preventDefault();
    try { localStorage.removeItem("token"); } catch (_) {}
    setNoAutenticadoUI();
    // hard refresh para limpiar cualquier estado residual
    location.reload();
  });

  // Botones del panel
  btnViviendas?.addEventListener("click", () => {
    if (!getToken()) return showError("Necesitás iniciar sesión.");
    renderViviendas();
  });
  btnUsuarios?.addEventListener("click", () => {
    if (!getToken()) return showError("Necesitás iniciar sesión.");
    renderUsuarios();
  });
  btnFormularios?.addEventListener("click", () =>
    render("Formularios", "<p>Próximamente…</p>")
  );

  // Intentar restaurar sesión
  tryRestoreSession();
});
