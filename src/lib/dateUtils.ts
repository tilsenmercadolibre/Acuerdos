/**
 * formatDate
 *
 * Parsea y formatea una fecha guardada como string ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ssZ)
 * sin el bug de zona horaria de JavaScript.
 *
 * Problema: new Date("2025-12-31") se interpreta como UTC 00:00,
 * que en Uruguay (UTC-3) muestra "30/12/2025".
 *
 * Solución: para fechas sin hora (YYYY-MM-DD), usamos
 * new Date(year, month-1, day) que es hora local.
 */
export function formatDate(
  dateStr: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
  locale = 'es-UY'
): string {
  if (!dateStr) return 'N/A';

  // Si es solo fecha (YYYY-MM-DD), parseamos sin zona horaria
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  let date: Date;

  if (dateOnly) {
    const [y, m, d] = dateStr.split('-').map(Number);
    date = new Date(y, m - 1, d); // hora local → sin desfase
  } else {
    date = new Date(dateStr); // tiene hora → OK con timezone
  }

  if (isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString(
    locale,
    opts ?? { day: '2-digit', month: '2-digit', year: 'numeric' }
  );
}

/**
 * formatDateShort
 * Ej: "31 dic"
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  return formatDate(dateStr, { day: 'numeric', month: 'short' });
}

/**
 * formatDateFull
 * Ej: "31 de diciembre de 2025"
 */
export function formatDateFull(dateStr: string | null | undefined): string {
  return formatDate(dateStr, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * parseLocalDate
 * Devuelve un objeto Date sin desfase para fechas YYYY-MM-DD.
 */
export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  if (dateOnly) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}
