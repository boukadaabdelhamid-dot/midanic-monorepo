/** Shared display formatters for the ERP mobile surfaces (Arabic / fr-DZ). */

export const CURRENCY = "دج";

/** Format a numeric/string amount with 2 decimals using the fr-DZ grouping. */
export function fmtNum(
  value: string | number | null | undefined,
  currency = "",
): string {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const formatted = safe.toLocaleString("fr-DZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${formatted} ${currency}` : formatted;
}

/** Compact integer (no decimals) — handy for counts. */
export function fmtInt(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? Math.round(n) : 0;
  return safe.toLocaleString("fr-DZ");
}

/** Short localized date (e.g. 26/06/2026). Falls back to "—" when missing. */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-DZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type OrderStatusKey =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | (string & {});

/** Arabic label for an order status. */
export function orderStatusLabel(status: OrderStatusKey): string {
  switch (status) {
    case "pending":
      return "قيد الانتظار";
    case "processing":
      return "قيد المعالجة";
    case "shipped":
      return "تم الشحن";
    case "delivered":
      return "تم التسليم";
    case "cancelled":
      return "ملغى";
    default:
      return status;
  }
}
