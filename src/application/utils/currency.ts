// Kwacha currency formatting helpers.
// Accepts free-form input and returns a normalized string like "K120,000".
export function formatKwacha(input: string): string {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `K${withCommas}`;
}
