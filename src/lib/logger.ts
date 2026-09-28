function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const payload = meta ? { message, ...meta } : { message };
  console[level](JSON.stringify(payload));
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
