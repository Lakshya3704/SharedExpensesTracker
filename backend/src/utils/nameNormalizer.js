/**
 * Name normalizer for CSV import.
 * Handles inconsistent naming in the spreadsheet:
 * - "priya" → "Priya" (lowercase)
 * - "Priya S" → "Priya" (name variant)
 * - "rohan " → "Rohan" (trailing space)
 * - "Dev's friend Kabir" → flagged as ad-hoc participant
 */

// Known name mappings discovered from CSV analysis
const NAME_ALIASES = {
  'priya s': 'Priya',
  'priya': 'Priya',
  'aisha': 'Aisha',
  'rohan': 'Rohan',
  'meera': 'Meera',
  'dev': 'Dev',
  'sam': 'Sam',
};

/**
 * Normalize a person's name from CSV data.
 * Returns { normalized, original, wasModified, isAdHoc, adHocName }
 */
function normalizeName(rawName) {
  if (!rawName || rawName.trim() === '') {
    return { normalized: null, original: rawName, wasModified: false, isAdHoc: false };
  }

  const trimmed = rawName.trim();
  const lowerTrimmed = trimmed.toLowerCase();

  // Check for ad-hoc participants (e.g., "Dev's friend Kabir")
  if (lowerTrimmed.includes("'s friend") || lowerTrimmed.includes("'s friend")) {
    // Extract the actual name
    const friendMatch = trimmed.match(/(?:'s\s+friend\s+)(\w+)/i);
    const friendName = friendMatch ? friendMatch[1] : trimmed;
    return {
      normalized: toTitleCase(friendName),
      original: trimmed,
      wasModified: true,
      isAdHoc: true,
      adHocName: toTitleCase(friendName),
      referredBy: trimmed.split("'s")[0].trim(),
    };
  }

  // Check known aliases
  if (NAME_ALIASES[lowerTrimmed]) {
    const normalized = NAME_ALIASES[lowerTrimmed];
    return {
      normalized,
      original: trimmed,
      wasModified: normalized !== trimmed,
      isAdHoc: false,
    };
  }

  // Default: title case
  const normalized = toTitleCase(trimmed);
  return {
    normalized,
    original: trimmed,
    wasModified: normalized !== trimmed,
    isAdHoc: false,
  };
}

/**
 * Convert string to Title Case
 */
function toTitleCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Parse the split_with field (semicolon-separated names)
 * Returns array of { normalized, original, wasModified, isAdHoc }
 */
function parseSplitWith(splitWithStr) {
  if (!splitWithStr) return [];
  return splitWithStr.split(';').map(name => normalizeName(name));
}

module.exports = { normalizeName, parseSplitWith, toTitleCase, NAME_ALIASES };
