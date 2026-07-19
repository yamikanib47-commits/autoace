export function text(value: unknown, field: string, max = 1000) {
  if (typeof value !== "string") throw new Error(`${field} is required`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > max) throw new Error(`${field} is invalid`);
  return cleaned;
}

export function optionalText(value: unknown, max = 1000) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Invalid text value");
  const cleaned = value.trim();
  if (cleaned.length > max) throw new Error("Text value is too long");
  return cleaned || null;
}

export function phone(value: unknown) {
  const cleaned = text(value, "phone", 20);
  if (cleaned.length < 7) throw new Error("phone is invalid");
  return cleaned;
}

export function year(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1886 || parsed > 2030) throw new Error("year is invalid");
  return parsed;
}

export async function body(request: Request) {
  const value = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Request body must be an object");
  return value as Record<string, unknown>;
}
