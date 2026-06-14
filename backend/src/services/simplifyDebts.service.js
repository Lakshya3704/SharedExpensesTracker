/**
 * Debt simplification service.
 * Implements Aisha's request: "one number per person. Who pays whom, how much, done."
 * 
 * Algorithm (Greedy):
 * 1. Calculate net balance for each person (positive = creditor, negative = debtor)
 * 2. Sort creditors descending, debtors ascending (by absolute value)
 * 3. Match largest debtor with largest creditor
 * 4. The transfer amount = min(|debt|, |credit|)
 * 5. Adjust balances, repeat until all settled
 * 
 * This produces the minimum number of transactions to settle all debts.
 */
const { roundToTwo } = require('./currency.service');

/**
 * Simplify debts from a pairwise debt map.
 * @param {Object} debts - Pairwise debt map { "debtorId:creditorId": amount }
 * @param {Object} userNames - Map of userId to name { id: name }
 * @returns {Array} Simplified transactions [{ from, to, amount }]
 */
function simplifyDebts(debts, userNames) {
  // Step 1: Calculate net balance per person
  const balances = {};

  for (const [key, amount] of Object.entries(debts)) {
    const [debtorId, creditorId] = key.split(':').map(Number);
    balances[debtorId] = (balances[debtorId] || 0) - amount;
    balances[creditorId] = (balances[creditorId] || 0) + amount;
  }

  // Step 2: Separate into creditors and debtors
  const creditors = []; // people who are owed money (positive balance)
  const debtors = [];   // people who owe money (negative balance)

  for (const [userId, balance] of Object.entries(balances)) {
    const rounded = roundToTwo(balance);
    if (rounded > 0.01) {
      creditors.push({ userId: Number(userId), balance: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ userId: Number(userId), balance: Math.abs(rounded) });
    }
  }

  // Sort: largest amounts first for efficient matching
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  // Step 3: Greedily match debtors to creditors
  const transactions = [];
  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const transferAmount = roundToTwo(Math.min(debtors[i].balance, creditors[j].balance));

    if (transferAmount > 0.01) {
      transactions.push({
        fromUserId: debtors[i].userId,
        fromName: userNames[debtors[i].userId] || `User ${debtors[i].userId}`,
        toUserId: creditors[j].userId,
        toName: userNames[creditors[j].userId] || `User ${creditors[j].userId}`,
        amount: transferAmount,
      });
    }

    debtors[i].balance = roundToTwo(debtors[i].balance - transferAmount);
    creditors[j].balance = roundToTwo(creditors[j].balance - transferAmount);

    if (debtors[i].balance < 0.01) i++;
    if (creditors[j].balance < 0.01) j++;
  }

  return transactions;
}

module.exports = { simplifyDebts };
