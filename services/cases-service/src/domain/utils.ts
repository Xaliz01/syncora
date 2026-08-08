export function isDuplicateKeyError(err: unknown): boolean {
  return (err as { code?: number })?.code === 11000;
}
