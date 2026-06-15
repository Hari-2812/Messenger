/**
 * Structured Request Logger Middleware
 * Logs every HTTP request with method, path, status, duration.
 * Keeps logs clean — no sensitive headers or body content.
 */

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    // Color-coded by status range
    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';

    console.log(
      JSON.stringify({
        level,
        type: 'http',
        method,
        path: originalUrl,
        status: statusCode,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      })
    );
  });

  next();
};

module.exports = requestLogger;
