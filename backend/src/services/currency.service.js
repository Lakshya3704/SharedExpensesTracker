/**
 * Currency conversion service.
 * Uses a fixed configurable exchange rate (USD → INR = ₹83)
 * so balance calculations are deterministic and explainable.
 * 
 * Decision: Fixed rate over API-based because:
 * 1. Expenses are historical — rate at time of expense matters
 * 2. Deterministic = same result every time = easier to verify by hand
 * 3. No external dependency = more reliable
 */
const config = require('../config');

const RATES = config.exchangeRates;

/**
 * Convert an amount to INR.
 * @param {number} amount - The amount in original currency
 * @param {string} currency - The currency code (INR, USD)
 * @returns {number} Amount in INR, rounded to 2 decimal places
 */
function convertToINR(amount, currency) {
  if (!currency || currency.toUpperCase() === 'INR') {
    return roundToTwo(amount);
  }

  const upperCurrency = currency.toUpperCase();
  const rateKey = `${upperCurrency}_TO_INR`;

  if (RATES[rateKey]) {
    return roundToTwo(amount * RATES[rateKey]);
  }

  // Unknown currency — treat as INR with a warning
  console.warn(`Unknown currency: ${currency}. Treating as INR.`);
  return roundToTwo(amount);
}

/**
 * Round a number to 2 decimal places (standard currency rounding).
 */
function roundToTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Get the exchange rate for display purposes.
 */
function getRate(fromCurrency, toCurrency = 'INR') {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return 1;
  const rateKey = `${fromCurrency.toUpperCase()}_TO_${toCurrency.toUpperCase()}`;
  return RATES[rateKey] || 1;
}

module.exports = { convertToINR, roundToTwo, getRate };
