# Calculation methodology

## 1. Lifestyle baskets

Each city carries base values for 12 monthly expense categories (single person, local
currency). A **lifestyle profile** transforms base values:

- housing tier (which apartment size/location) + a housing multiplier
- a multiplier per non-housing category

Baskets are computed in the city's **local currency** and converted to the display
currency with one FX reference. Any category can be overridden by the user with their
own real expense; overrides win over profile estimates.

## 2. Salary equivalence (net-to-net)

```
required = currentNet × (destBasket / currentBasket)
```

- Inputs are **net** incomes; **this is not a gross-to-net tax calculation** and does
  not model destination income tax or social contributions.
- Outcome at a given destination salary is measured on **disposable income**
  (`net − basket`): better (>+2%), equivalent (±2%), worse (<−2%).

## 3. Currency conversion

```
amount_in_target = amount_in_source / rate[source] × rate[target]
```

One `ConvertedRates` object (base EUR) is shared by the whole comparison; its
`referenceDate`, provider and live/static status are displayed in the header and
footer. Conversion is arithmetic only and is **never** presented as purchasing-power
parity.

## 4. Budget mathematics

- Totals are sums of cents-rounded amounts.
- `savingsRate = (income − expenses) / income` (0 when income ≤ 0).
- Annual figures multiply by exactly 12.

## 5. Relocation model

- One-off items are `confirmed` or `estimated`, and `fixed` or `variable`.
- Scenario multipliers apply **only** to variable items: best ×0.75, expected ×1, worst
  ×1.4.
- `initialBudget = Σ item.amount × (variable ? scenarioMult : 1)`
- `emergencyFund = 3 × destMonthlyCost`
- `breakEvenMonths = ceil(initialBudget / monthlyGain)` where `monthlyGain` is the
  disposable-income delta between destination and origin at the same net income;
  `null` when the gain is not positive (the move never repays itself).

## 6. Floating-point policy

All monetary helpers round to cents at every step (`roundToCents`) to prevent drift in
repeated operations; invalid inputs map to 0 or explicit `null`s instead of poisoning
downstream sums.
