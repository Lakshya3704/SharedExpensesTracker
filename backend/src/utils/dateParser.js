/**
 * Date parser for CSV import.
 * Handles multiple date formats found in the spreadsheet:
 * - "01-02-2026" (DD-MM-YYYY) — standard format
 * - "Mar-14" (Mon-DD) — malformed, needs year inference
 * - "04-05-2026" — ambiguous DD-MM vs MM-DD
 */

/**
 * Parse a date string from the CSV.
 * Returns { date, original, format, wasModified, isAmbiguous, ambiguityNote }
 */
function parseDate(dateStr, contextYear = 2026) {
  if (!dateStr || dateStr.trim() === '') {
    return { date: null, original: dateStr, format: null, wasModified: false, error: 'Empty date' };
  }

  const trimmed = dateStr.trim();

  // Pattern 1: Mon-DD (e.g., "Mar-14")
  const monthNamePattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{1,2})$/i;
  const monthNameMatch = trimmed.match(monthNamePattern);
  if (monthNameMatch) {
    const monthNames = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const month = monthNames[monthNameMatch[1].toLowerCase()];
    const day = parseInt(monthNameMatch[2], 10);
    const date = new Date(contextYear, month, day);

    return {
      date,
      original: trimmed,
      format: 'Mon-DD',
      wasModified: true,
      isAmbiguous: false,
      resolvedAs: formatDateISO(date),
    };
  }

  // Pattern 2: DD-MM-YYYY (standard format in this CSV)
  const ddmmyyyyPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const ddmmMatch = trimmed.match(ddmmyyyyPattern);
  if (ddmmMatch) {
    const part1 = parseInt(ddmmMatch[1], 10);
    const part2 = parseInt(ddmmMatch[2], 10);
    const year = parseInt(ddmmMatch[3], 10);

    // Check if this could be ambiguous (both parts <= 12)
    const isAmbiguous = part1 <= 12 && part2 <= 12 && part1 !== part2;

    // Default interpretation: DD-MM-YYYY (the dominant format in this CSV)
    const day = part1;
    const month = part2 - 1; // JS months are 0-indexed
    const date = new Date(year, month, day);

    return {
      date,
      original: trimmed,
      format: 'DD-MM-YYYY',
      wasModified: false,
      isAmbiguous,
      resolvedAs: formatDateISO(date),
      ambiguityNote: isAmbiguous
        ? `Could be ${part1}/${part2} (DD/MM) or ${part2}/${part1} (MM/DD)`
        : null,
    };
  }

  // Pattern 3: YYYY-MM-DD (ISO)
  const isoPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const isoMatch = trimmed.match(isoPattern);
  if (isoMatch) {
    const date = new Date(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10) - 1,
      parseInt(isoMatch[3], 10)
    );
    return { date, original: trimmed, format: 'YYYY-MM-DD', wasModified: false, isAmbiguous: false };
  }

  // Could not parse
  return { date: null, original: trimmed, format: null, wasModified: false, error: 'Unrecognized format' };
}

/**
 * Format a Date object as YYYY-MM-DD for database storage
 */
function formatDateISO(date) {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = { parseDate, formatDateISO };
