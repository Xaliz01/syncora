export function isDuplicateKeyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    code?: number;
    message?: string;
    cause?: { code?: number; message?: string };
  };
  if (e.code === 11000) return true;
  if (e.cause?.code === 11000) return true;
  const messages = [e.message, e.cause?.message].filter((m): m is string => typeof m === "string");
  return messages.some((m) => m.includes("E11000"));
}
