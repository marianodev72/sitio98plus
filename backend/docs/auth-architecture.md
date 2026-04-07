# Arquitectura de autenticación

## Fuente oficial
- `backend/controllers/authController.js`
- `backend/middleware/auth.js`

## Compatibilidad legacy
- `backend/utils/jwt.js`
  - estado: deprecado
  - propósito: compatibilidad transitoria
  - no define política JWT propia

## Archivos no operativos
- `backend/security/authToken.NO_USAR.experimental.js`
  - estado: experimental / fuera del flujo oficial

## Notas
- JWT oficial: RS256
- transporte principal: cookie httpOnly
- validación de sesión: `authRequired`
- revocación: `tokenVersion`