// backend/utils/errorHandler.js
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Error interno';
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }
  res.status(status).json({ message });
}
module.exports = { errorHandler };
