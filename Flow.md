# Application Flow

## Overview

```
[First Visit] → Setup → Calendar Dashboard → Toggle Absences → See Projections
[Return Visit] → Auto-mark present for missed days → Calendar Dashboard
```

---

## Flow 1: First-Time Setup

```
1. User opens app
2. App checks localStorage for existing data
3. No data found → show Setup screen

Setup Screen (3 steps, one page):
┌─────────────────────────────────────┐
│ Step 1: Semester End Date           │
│   [Date picker]                     │
│                                     │
│ Step 2: Weekly Timetable            │
│   Monday:    [+ Add subject]        │
│   Tuesday:   [+ Add subject]        │
│   ...                               │
│   Friday:    [+ Add subject]        │
│                                     │
│   Each subject entry:               │
│   [Subject name] [Number of classes]│
│                                     │
│ Step 3: Current Attendance          │
│   (Auto-populated from timetable)   │
│   Math:    attended [__] / total [__]│
│   Physics: attended [__] / total [__]│
│   ...                               │
│                                     │
│              [Save & Continue]      │
└─────────────────────────────────────┘

4. Data saved to localStorage
5. Redirect to Calendar Dashboard
```

---

## Flow 2: Return Visit (Auto-Present)

```
1. User opens app
2. App reads `lastVisitDate` from localStorage
3. If lastVisitDate < today:
   a. Get all weekdays between lastVisitDate and today (exclusive of today)
   b. For each weekday NOT already marked absent:
      - Mark as present (these days are now locked)
   c. Update lastVisitDate to today
   d. Recalculate all attendance projections
4. Show Calendar Dashboard with updated data
```

---

## Flow 3: Calendar Dashboard (Main Screen)

```
┌──────────────────────────────────────────────┐
│  📅 August 2026            [< Prev] [Next >] │
│                                              │
│  Mon   Tue   Wed   Thu   Fri   Sat   Sun     │
│                          1🟢   2⬜   3⬜     │
│  4🟢   5🟢   6🟢   7🟡   8🔴   9⬜  10⬜    │
│  11🟢  12🟢  13🟢  14🟢  15🟢  16⬜  17⬜    │
│  18■   19■   20■   21■   22■   23⬜  24⬜    │  ← past = locked present
│  ...                                         │
│                                              │
│  ── Attendance Projection ──                 │
│  Math:      78.3%  ████████░░ (safe)         │
│  Physics:   76.1%  ████████░░ (safe)         │
│  DBMS:      75.0%  ████████░░ (edge)         │
│  OS:        82.5%  █████████░ (safe)         │
│                                              │
│  ── Best Long Weekends ──                    │
│  🏖️ Sep 5-7  (skip Fri Sep 5)               │
│  🏖️ Sep 19-21 (skip Fri Sep 19)             │
│  🏖️ Oct 6-8  (skip Mon Oct 6)               │
│                                              │
└──────────────────────────────────────────────┘

Legend:
  🟢 = safe to skip     (all subjects stay ≥ 75%)
  🟡 = risky to skip    (some subject at 75-76%)
  🔴 = can't skip       (some subject drops < 75%)
  ■  = past/locked       (already marked present)
  ⬜ = weekend           (non-interactive)
```

---

## Flow 4: Marking a Day Absent

```
1. User clicks a GREEN or YELLOW date (e.g., Sep 5, Friday)
2. Tooltip shows per-subject impact:
   "Skip Fri Sep 5:
    Math: 78.3% → 76.1%
    DBMS: 75.0% → 73.8% ⚠️"
3. Confirm button appears: [Confirm skip for Sep 5?]
4. User clicks confirm
5. Date turns to a "skipped" visual state (strikethrough / X)
6. ALL attendance projections recalculate instantly
7. ALL calendar colors update (other dates may shift green→yellow→red)
8. Best long weekends list updates
```

---

## Flow 5: Calculation Engine

```
For each subject S:

  existing_attended = user input (from setup)
  existing_total = user input (from setup)

  For each remaining weekday D from today to semester end:
    day_of_week = D.getDayOfWeek()  // Monday=0 ... Friday=4
    classes_on_D = timetable[day_of_week][S] or 0

    if D is marked absent:
      missed += classes_on_D
    else:
      attended += classes_on_D

    total += classes_on_D

  projected_attended = existing_attended + attended
  projected_total = existing_total + total
  projected_% = (projected_attended / projected_total) × 100
```

### Color-Coding Logic (per date)

```
For date D, temporarily mark D as absent (on top of existing selections):
  For each subject S:
    calculate projected_%
    if any subject < 75%  → RED
    if any subject < 76%  → YELLOW
    else                  → GREEN
```

### Best Long Weekends Algorithm

```
1. Collect all remaining Fridays and Mondays
2. Pair adjacent Fri+Mon as potential long weekends
3. Greedy: try adding each pair, check if all subjects stay ≥75%
4. If pair works → add to suggestion list
5. If only one of pair works → suggest standalone
6. Sort by date
```

---

## Data Model (localStorage)

```json
{
  "semesterEnd": "2026-12-15",
  "lastVisitDate": "2026-08-17",
  "timetable": {
    "monday":    [{"subject": "Math", "classes": 2}, {"subject": "DBMS", "classes": 1}],
    "tuesday":   [{"subject": "Physics", "classes": 3}],
    "wednesday": [...],
    "thursday":  [...],
    "friday":    [...]
  },
  "attendance": {
    "Math":    {"attended": 20, "total": 25},
    "Physics": {"attended": 18, "total": 22},
    "DBMS":    {"attended": 15, "total": 20}
  },
  "absentDates": ["2026-09-05", "2026-09-19", "2026-10-06"],
  "holidays": ["2026-10-24", "2026-11-03"]
}
```
