# SCOPE.md — Anomaly Log & Database Schema

## Part 1: CSV Anomaly Catalog

The CSV file (`Expenses Export.csv`) contains **18 deliberate data problems**. Below is every anomaly detected, the row it occurs in, and the handling policy.

### Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| 🔧 AUTO_FIXED | Safe to fix automatically | Applied without user input |
| ⚠️ WARNING | Fixed but user should verify | Shown to user for review |
| 🚨 REQUIRES_ACTION | Cannot proceed without user | Blocks import until resolved |

---

### Anomaly #1 — Duplicate Expense (Rows 5–6)
**Type:** `duplicate_expense`  
**Severity:** 🚨 REQUIRES_ACTION  
**Data:** Row 5: "Dinner at Marina Bites" by Dev ₹3,200 | Row 6: "dinner - marina bites" by Dev ₹3,200  
**Issue:** Same date, same payer, same amount, similar description (different casing & formatting).  
**Policy:** Flag both rows. Let user choose which to keep. Default suggestion: keep Row 5 (proper capitalization).

### Anomaly #2 — Comma in Amount (Row 7)
**Type:** `amount_format`  
**Severity:** 🔧 AUTO_FIXED  
**Data:** Amount is `"1,200"` (with comma and quotes)  
**Policy:** Strip commas, parse as numeric `1200`. Standard CSV number formatting issue.

### Anomaly #3 — Lowercase Payer Name (Row 9)
**Type:** `name_normalized`  
**Severity:** 🔧 AUTO_FIXED  
**Data:** `paid_by` = `priya` (lowercase)  
**Policy:** Normalize to Title Case → "Priya". Names are case-insensitive identifiers.

### Anomaly #4 — Fractional Currency Amount (Row 10)
**Type:** `fractional_amount`  
**Severity:** 🔧 AUTO_FIXED  
**Data:** Amount = `899.995` (3 decimal places)  
**Policy:** Round to 2 decimal places → `900.00`. INR smallest denomination is paisa (0.01).

### Anomaly #5 — Name Variant (Row 11)
**Type:** `name_normalized`  
**Severity:** ⚠️ WARNING  
**Data:** `paid_by` = `Priya S` instead of `Priya`  
**Policy:** Map to "Priya" via known alias table. Flag for user confirmation since it could be a different person.

### Anomaly #6 — Missing Payer (Row 13)
**Type:** `missing_payer`  
**Severity:** 🚨 REQUIRES_ACTION  
**Data:** `paid_by` is empty. Note says "can't remember who paid"  
**Policy:** Cannot import without a payer. Flag for user to manually assign the payer.

### Anomaly #7 — Settlement Logged as Expense (Row 14)
**Type:** `settlement_as_expense`  
**Severity:** ⚠️ WARNING  
**Data:** "Rohan paid Aisha back" ₹5,000. No split_type. Note: "this is a settlement not an expense??"  
**Policy:** Detect via description pattern + missing split_type. Import as a Settlement record (Rohan → Aisha ₹5,000) instead of an Expense.

### Anomaly #8 — Percentages Sum to 110% (Row 15)
**Type:** `percentage_sum_error`  
**Severity:** 🚨 REQUIRES_ACTION  
**Data:** "Aisha 30%; Rohan 30%; Priya 30%; Meera 20%" = 110%. Note: "percentages might be off"  
**Policy:** Flag as math error. Suggestions: (a) normalize proportionally to 100%, (b) let user fix manually. Cannot silently guess which percentage is wrong.

### Anomaly #9 — Multi-Currency USD Expenses (Rows 20, 21, 23, 26)
**Type:** Multi-currency handling  
**Severity:** Handled by design  
**Data:** 4 expenses in USD (Goa villa $540, beach lunch $84, parasailing $150, refund -$30)  
**Policy:** Store in original currency. Convert to INR at fixed rate ₹83/$1 for balance calculations. Rate is configurable via `USD_TO_INR_RATE` env var.

### Anomaly #10 — Non-Group Member in Split (Row 23)
**Type:** `adhoc_participant`  
**Severity:** ⚠️ WARNING  
**Data:** `split_with` includes "Dev's friend Kabir" — not a registered group member.  
**Policy:** Parse "Kabir" as the actual name. Create as an ad-hoc user. Flag for user review.

### Anomaly #11 — Duplicate with Different Amounts (Rows 24–25)
**Type:** `duplicate_expense`  
**Severity:** 🚨 REQUIRES_ACTION  
**Data:** Row 24: "Dinner at Thalassa" by Aisha ₹2,400 | Row 25: "Thalassa dinner" by Rohan ₹2,450  
**Issue:** Same date, same restaurant, different payers AND different amounts. Note on Row 25: "Aisha also logged this I think hers is wrong"  
**Policy:** Flag both. User must choose which to keep. Row 25's note suggests keeping Row 25 (₹2,450 by Rohan).

### Anomaly #12 — Negative Amount / Refund (Row 26)
**Type:** `negative_amount`  
**Severity:** ⚠️ WARNING  
**Data:** "Parasailing refund" Dev -$30. Note: "one slot got cancelled"  
**Policy:** Treat as a refund/credit. Import as a negative expense — each participant's balance is credited their share.

### Anomaly #13 — Malformed Date (Row 27)
**Type:** `date_format`  
**Severity:** 🔧 AUTO_FIXED  
**Data:** Date is `Mar-14` instead of `DD-MM-YYYY`  
**Policy:** Parse `Mar-14` as March 14, 2026 (context year). Reformat to `2026-03-14`.

### Anomaly #14 — Payer Trailing Space + Lowercase (Row 27)
**Type:** `name_normalized`  
**Severity:** 🔧 AUTO_FIXED  
**Data:** `paid_by` = `rohan ` (lowercase with trailing space)  
**Policy:** Trim whitespace + Title Case → "Rohan".

### Anomaly #15 — Missing Currency (Row 28)
**Type:** `missing_currency`  
**Severity:** ⚠️ WARNING  
**Data:** Currency field is empty. Note: "forgot to set currency"  
**Policy:** Default to INR (dominant currency in the dataset). Flag for user verification.

### Anomaly #16 — Zero Amount (Row 31)
**Type:** `zero_amount`  
**Severity:** ⚠️ WARNING  
**Data:** Amount is `0`. Note: "counted twice earlier - fixing later"  
**Policy:** Import as VOID/inactive status. A ₹0 expense has no financial impact, but we preserve it for audit trail.

### Anomaly #17 — Ambiguous Date (Row 34)
**Type:** `ambiguous_date`  
**Severity:** 🚨 REQUIRES_ACTION  
**Data:** Date is `04-05-2026`. Note: "is this April 5 or May 4? format is a mess"  
**Issue:** DD-MM gives May 4th, MM-DD gives April 5th. The CSV predominantly uses DD-MM-YYYY format, so default parsing gives May 4. But this row appears chronologically between March and April entries, suggesting it should be April 5 (or May 4 is out of order).  
**Policy:** Flag for user decision. Present both interpretations. The user's note itself confirms the ambiguity.

### Anomaly #18 — Inactive Member in Split (Row 36)
**Type:** `inactive_member`  
**Severity:** ⚠️ WARNING  
**Data:** April 2 groceries includes Meera in `split_with`, but Meera moved out ~March 29.  
**Note:** "oops Meera still in the group list"  
**Policy:** Flag the membership conflict. Suggest removing Meera from this split. Requires approval per Meera's request ("I want to approve anything the app deletes or changes").

### Anomaly #19 — Conflicting Split Type and Details (Row 42)
**Type:** `conflicting_split`  
**Severity:** ⚠️ WARNING  
**Data:** `split_type` = "equal" but `split_details` = "Aisha 1; Rohan 1; Priya 1; Sam 1"  
**Note:** "split_type says equal but someone added shares anyway"  
**Policy:** Since the shares are all 1:1:1:1 (which IS equal), use the split_type value ("equal") and ignore the redundant details. Flag for user awareness.

---

## Part 2: Database Schema

### Entity-Relationship Diagram

```
Users ──┬── GroupMembers ──── Groups
        │                      │
        ├── Expenses ──────────┤
        │      │               │
        │      └── ExpenseSplits
        │                      │
        ├── Settlements ───────┘
        │
        └── ImportAnomalies ── Imports
```

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, name, email, password_hash |
| `groups` | Expense groups | id, name, description, created_by |
| `group_members` | Temporal membership | group_id, user_id, joined_at, left_at, role |
| `expenses` | Expense records | group_id, description, amount, currency, split_type, paid_by, expense_date, status |
| `expense_splits` | Per-user share of each expense | expense_id, user_id, share_value, owed_amount, owed_amount_inr |
| `settlements` | Debt payments | group_id, from_user_id, to_user_id, amount, settled_at |
| `imports` | CSV import records | group_id, filename, status, total_rows, imported_rows, skipped_rows |
| `import_anomalies` | Detected anomalies | import_id, row_number, anomaly_type, severity, description, action_taken |

### Key Design Decisions

1. **Temporal membership** (`group_members.joined_at` / `left_at`) — enables Sam's request: expenses before his join date don't affect his balance.
2. **`owed_amount_inr`** in expense_splits — pre-computed INR amounts avoid re-converting currencies during balance calculation.
3. **`import_anomalies` table** — full audit trail of every CSV issue detected, for the import report and Meera's approval requirement.
4. **`expense.status`** — ACTIVE/VOID/FLAGGED allows soft-deletion and handles zero-amount expenses.
