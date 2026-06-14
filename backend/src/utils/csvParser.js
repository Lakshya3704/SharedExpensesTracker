/**
 * CSV parser utility using papaparse.
 * Parses the uploaded CSV file and returns structured row data.
 */
const Papa = require('papaparse');
const fs = require('fs');

/**
 * Parse a CSV file and return the rows as objects.
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<{ data: Array, errors: Array, meta: Object }>}
 */
function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const result = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
      // Don't transform values — we need the raw data for anomaly detection
      transform: undefined,
    });

    resolve({
      data: result.data,
      errors: result.errors,
      meta: result.meta,
    });
  });
}

/**
 * Parse a CSV string directly (for testing or buffer input).
 */
function parseCSVString(csvString) {
  const result = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    trimHeaders: true,
  });

  return {
    data: result.data,
    errors: result.errors,
    meta: result.meta,
  };
}

module.exports = { parseCSVFile, parseCSVString };
