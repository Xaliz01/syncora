import { BadRequestException } from "@nestjs/common";
import { TVA_RATES, type TvaRate } from "@planwise/shared";

export function normalizeArticleReference(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeTvaRate(value: unknown): TvaRate {
  const n = typeof value === "number" ? value : Number(value);
  if ((TVA_RATES as readonly number[]).includes(n)) return n as TvaRate;
  return 20;
}

export function ensureNonNegativeNumber(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be a non-negative number`);
  }
  return value;
}

export function ensureStrictlyPositiveNumber(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new BadRequestException(`${field} must be greater than 0`);
  }
  return value;
}

export function isDuplicateKeyError(err: unknown): boolean {
  return (err as { code?: number })?.code === 11000;
}
