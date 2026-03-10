#!/usr/bin/env bash
set -euo pipefail

# ========= CONFIG =========
BASE_URL="${BASE_URL:-http://localhost:3000}"   # backend (NO el 5173 del FE)
POSTULANTE_EMAIL="${POSTULANTE_EMAIL:-postulante@test.com}"
POSTULANTE_PASS="${POSTULANTE_PASS:-123456}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@test.com}"
ADMIN_PASS="${ADMIN_PASS:-123456}"

# IDs necesarios para el flujo:
ANEXO01_ID="${ANEXO01_ID:-}"     # submission _id de ANEXO_01 del postulante (ya cerrado)
VIVIENDA_ID="${VIVIENDA_ID:-}"   # viviendaId para generar ANEXO_02

# ========= HELPERS =========
need() { command -v "$1" >/dev/null 2>&1 || { echo "Falta dependencia: $1"; exit 1; }; }
need jq
need curl

login_cookie() {
  local email="$1" pass="$2" cookiefile="$3"
  rm -f "$cookiefile"
  echo "==> Login: $email"
  curl -sS -i \
    -c "$cookiefile" \
    -H "Content-Type: application/json" \
    -X POST "$BASE_URL/api/auth/login" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}" >/dev/null
}

refresh() {
  local cookiefile="$1"
  curl -sS -b "$cookiefile" -c "$cookiefile" -X POST "$BASE_URL/api/auth/refresh" >/dev/null
}

get_role_from_cookie_jwt() {
  # Extrae role desde el cookie "token" guardado por curl en el cookie jar.
  # (solo funciona si el cookie se llama token; ajustá si tu cookie tiene otro nombre)
  local cookiefile="$1"
  local token
  token="$(grep -E $'\ttoken\t' "$cookiefile" | awk '{print $NF}' | tail -n 1 || true)"
  if [[ -z "${token:-}" ]]; then
    echo "UNKNOWN"
    return
  fi
  # decodifica payload base64url
  python3 - <<'PY' "$token"
import sys, json, base64
t=sys.argv[1]
payload=t.split('.')[1]
payload += '=' * (-len(payload) % 4)
payload = payload.replace('-','+').replace('_','/')
data=json.loads(base64.b64decode(payload))
print(data.get("user",{}).get("role","UNKNOWN"))
PY
}

http() {
  local method="$1" url="$2" cookiefile="$3" data="${4:-}"
  if [[ -n "$data" ]]; then
    curl -sS -D /tmp/headers.txt -o /tmp/body.json \
      -b "$cookiefile" -c "$cookiefile" \
      -H "Content-Type: application/json" \
      -X "$method" "$url" -d "$data" || true
  else
    curl -sS -D /tmp/headers.txt -o /tmp/body.json \
      -b "$cookiefile" -c "$cookiefile" \
      -X "$method" "$url" || true
  fi

  local code
  code="$(awk 'NR==1{print $2}' /tmp/headers.txt)"
  echo "$code"
}

show_body() {
  cat /tmp/body.json | jq .
}

# ========= VALIDACIONES =========
if [[ -z "$ANEXO01_ID" ]]; then
  echo "ERROR: te falta ANEXO01_ID (id del submission ANEXO_01). Ej:"
  echo '  ANEXO01_ID="65f..." VIVIENDA_ID="66a..." ./test_anexo02.sh'
  exit 1
fi
if [[ -z "$VIVIENDA_ID" ]]; then
  echo "ERROR: te falta VIVIENDA_ID. Ej:"
  echo '  ANEXO01_ID="65f..." VIVIENDA_ID="66a..." ./test_anexo02.sh'
  exit 1
fi

# ========= FLOW =========
POST_COOKIE="/tmp/cookies_postulante.txt"
ADM_COOKIE="/tmp/cookies_admin.txt"

login_cookie "$POSTULANTE_EMAIL" "$POSTULANTE_PASS" "$POST_COOKIE"
refresh "$POST_COOKIE"

echo "Postulante role (desde cookie/JWT): $(get_role_from_cookie_jwt "$POST_COOKIE")"

echo
echo "==> 1) Generar ANEXO_02 desde ANEXO_01 (idempotente)"
code="$(http POST "$BASE_URL/api/formularios/$ANEXO01_ID/generar-anexo-02" "$POST_COOKIE" "{\"viviendaId\":\"$VIVIENDA_ID\"}")"
echo "HTTP $code"
show_body

ANEXO02_ID="$(cat /tmp/body.json | jq -r '.anexo?._id // .anexoId // .id // empty')"
if [[ -z "${ANEXO02_ID:-}" || "$ANEXO02_ID" == "null" ]]; then
  echo "ERROR: no pude extraer ANEXO02_ID de la respuesta. Revisá el JSON de arriba."
  exit 1
fi
echo "ANEXO02_ID=$ANEXO02_ID"

echo
echo "==> 2) Postulante da conformidad (pasa a EN_REVISION normalmente)"
code="$(http POST "$BASE_URL/api/formularios/$ANEXO02_ID/conformidad" "$POST_COOKIE" '{"datos":{}}')"
echo "HTTP $code"
show_body

echo
echo "==> Login admin"
login_cookie "$ADMIN_EMAIL" "$ADMIN_PASS" "$ADM_COOKIE"
refresh "$ADM_COOKIE"
echo "Admin role (desde cookie/JWT): $(get_role_from_cookie_jwt "$ADM_COOKIE")"

echo
echo "==> 3) ADMIN_GENERAL cierra ANEXO_02 (conformidad-admin) => debe cambiar rol a PERMISIONARIO"
code="$(http POST "$BASE_URL/api/formularios/$ANEXO02_ID/conformidad-admin" "$ADM_COOKIE" '{"datos":{}}')"
echo "HTTP $code"
show_body

echo
echo "==> 4) Refresh postulante y verificar rol en JWT (debería ser PERMISIONARIO)"
refresh "$POST_COOKIE"
echo "Postulante role (desde cookie/JWT): $(get_role_from_cookie_jwt "$POST_COOKIE")"

echo
echo "==> 5) Probar listado de ANEXO_03 en /mios (antes daba 404 por whitelist POSTULANTE)"
code="$(http GET "$BASE_URL/api/formularios/mios?codigo=ANEXO_03" "$POST_COOKIE")"
echo "HTTP $code"
show_body

echo
echo "FIN ✅"