# DECISIONS.md — Decision Log

Every significant technical and product decision, the options considered, and why the chosen approach was selected.

---

## Decision 1: Relational Database over NoSQL

**Context:** Assignment requires "relational DBs only."  
**Options:**
1. PostgreSQL + Prisma ORM
2. SQLite + Prisma
3. MySQL + Sequelize

**Chosen:** PostgreSQL + Prisma  
**Rationale:** PostgreSQL is the most capable relational DB for production use, has excellent JSON support if needed, and Prisma provides type-safe queries with auto-generated migrations. SQLite would be simpler for local dev but harder to deploy. MySQL is viable but PostgreSQL has better feature parity.

---

## Decision 2: Fixed Exchange Rate (₹83/$1)

**Context:** Priya's complaint: "the sheet pretends a dollar is a rupee." Multiple expenses are in USD.  
**Options:**
1. Fixed configurable rate (e.g., ₹83/$1)
2. Live API (e.g., ExchangeRate-API)
3. Per-expense user-entered rate

**Chosen:** Fixed configurable rate via environment variable  
**Rationale:**
- Expenses are historical — the rate at time of import matters more than today's rate
- A fixed rate makes balance calculations **deterministic and reproducible** — critical for the live interview where I need to walk through calculations by hand
- Eliminates external API dependency (no network failures, no rate changes between calculations)
- Still configurable: change `USD_TO_INR_RATE` in `.env` to use any rate
- A live rate would give different balances every time you load the page — confusing for users

---

## Decision 3: Three-Tier Anomaly Severity

**Context:** The CSV has 18+ problems. Need a systematic handling policy.  
**Options:**
1. Binary: auto-fix or reject
2. Three tiers: auto-fix, warn, require action
3. All manual review

**Chosen:** Three tiers  
**Rationale:**
- **AUTO_FIXED**: Issues with an objectively correct fix (commas in numbers, name casing). No ambiguity → no need to bother the user.
- **WARNING**: Issues with a reasonable default but the user should know (missing currency → default INR). Transparent, not silent.
- **REQUIRES_ACTION**: Issues where any automated guess could be wrong (which duplicate to keep, who paid when unknown). The user MUST decide.

This directly addresses the assignment's core requirement: *"A crashed import and a silent guess are both failing answers."*

---

## Decision 4: Debt Simplification Algorithm

**Context:** Aisha wants "one number per person. Who pays whom, how much, done."  
**Options:**
1. Show all pairwise debts (N×N matrix)
2. Greedy simplification (minimize transaction count)
3. Optimal min-cost flow

**Chosen:** Greedy simplification  
**Rationale:**
- Net balance per person first, then greedily match largest debtor to largest creditor
- Produces **minimum number of transactions** in O(n log n) time
- Simpler to implement and explain than min-cost flow
- For 6-7 people, the difference between greedy and optimal is negligible
- Both pairwise and simplified views are available (tabs in the UI)

---

## Decision 5: Temporal Group Membership

**Context:** Sam: "I moved in mid-April. Why would March electricity affect my balance?" Meera moved out at end of March.  
**Options:**
1. Simple boolean `is_active` flag
2. `joined_at` + `left_at` date fields
3. Full membership history table

**Chosen:** `joined_at` + `left_at` on `group_members`  
**Rationale:**
- Tracks exactly when each person was part of the group
- Balance calculation only includes expenses where the person was an active member on the expense date
- Handles the CSV timeline: Meera (Feb 1 – Mar 29), Dev (Mar 8 – Mar 14 for Goa trip), Sam (Apr 8 onwards)
- A boolean flag would lose the date information needed for correct balance attribution

---

## Decision 6: Settlement Detection from CSV

**Context:** Row 14 is "Rohan paid Aisha back ₹5,000" — a settlement logged as an expense.  
**Options:**
1. Treat all rows as expenses uniformly
2. Detect settlements by heuristics and import separately
3. Let user manually classify each row

**Chosen:** Heuristic detection + user confirmation  
**Rationale:**
- Pattern matching on description ("paid.*back", "settlement", "transfer") + missing split_type → strong signal
- Import as a `Settlement` record (Rohan → Aisha) rather than an `Expense`
- Flagged as WARNING so user confirms the classification
- If classified as expense, the split calculation would be wrong (would split ₹5,000 among group members)

---

## Decision 7: Handling Negative Amounts (Refunds)

**Context:** Row 26: "Parasailing refund" Dev -$30.  
**Options:**
1. Reject negative amounts as errors
2. Treat as refunds (negative expense)
3. Create a separate "refund" entity

**Chosen:** Treat as refund (negative expense)  
**Rationale:**
- A negative expense is the simplest representation: everyone who was in the original split gets credited their share
- No new entity type needed — the expense system already handles amounts
- The note "one slot got cancelled" confirms it's a legitimate refund, not a data error
- The absolute value check would incorrectly flag this; instead we flag with WARNING and explain

---

## Decision 8: Rounding Strategy

**Context:** Equal splits often produce repeating decimals (e.g., ₹48,000 ÷ 4 = ₹12,000 exactly, but ₹1,199 ÷ 4 = ₹299.75).  
**Options:**
1. Round to 2 decimal places, lose/gain pennies
2. Round to 2 decimal places, assign remainder to first person
3. Use integer paisa arithmetic

**Chosen:** Round to 2 decimal places with remainder to first person  
**Rationale:**
- `roundToTwo(amount / n)` for each person, then `remainder = total - (perPerson * n)` → added to person 1
- Maximum discrepancy: (n-1) × 0.01 rupees — negligible for practical purposes
- Simpler than integer arithmetic and produces human-readable amounts
- Consistent and reproducible

---

## Decision 9: How to Handle "Priya S" (Row 11)

**Context:** One row has `Priya S` as the payer name, all others use `Priya`.  
**Options:**
1. Treat as a different person named "Priya S"
2. Auto-map to "Priya" via alias table
3. Flag for user decision

**Chosen:** Auto-map via alias table + flag as WARNING  
**Rationale:**
- Strong contextual evidence: "Priya S" appears once in a column where "Priya" appears many times, same expense patterns, same group
- Likely a last initial added by accident
- Auto-mapping avoids creating a ghost user with one expense
- WARNING flag ensures user can override if it actually IS a different person

---

## Decision 10: Ambiguous Date Row 34 ("04-05-2026")

**Context:** The CSV uses DD-MM-YYYY format. "04-05-2026" = May 4 in DD-MM or April 5 in MM-DD. The note itself says "is this April 5 or May 4? format is a mess."  
**Options:**
1. Default to DD-MM (May 4) — consistent with CSV format
2. Default to MM-DD (April 5) — consistent with chronological order
3. Flag for user decision

**Chosen:** Flag for user decision (REQUIRES_ACTION)  
**Rationale:**
- Both interpretations have supporting evidence. DD-MM is the dominant format, but May 4 would be out of chronological order (April entries follow)
- The user's own note confirms they're unsure
- Making a silent assumption here would be exactly the kind of "silent guess" the assignment warns against
- Present both options and let the user decide
