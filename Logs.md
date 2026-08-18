# Build Logs

## Format
Each entry follows:
```
### [Step N] — [Title]
**Date:** YYYY-MM-DD
**Status:** ✅ Done | 🔧 In Progress | ❌ Blocked
**What:** What was done
**Problem:** What went wrong (if any)
**Fix:** How it was resolved
```

---

### [Step 1] — Initial Build
**Date:** 2026-08-17
**Status:** ✅ Done
**What:** Created 3 files — `index.html`, `style.css`, `app.js`
**Architecture:** Pure client-side, zero dependencies. localStorage for persistence. 3 files total.
**Key decisions:**
- `attendanceDate` set to yesterday on save so calculation window includes today (today is clickable)
- System font stack (no Google Fonts load) — ponytail ultra
- Long weekends algorithm is greedy + cumulative (accounts for already-selected absences)
- Color-coding computes per-date: temporarily marks date absent, checks all subjects ≥75%
**Problem:** None so far
**Fix:** N/A

---

### [Step 2] — Calculation Refactor + Holiday + No Popup
**Date:** 2026-08-17
**Status:** ✅ Done
**What:** Three changes:
1. **Dynamic window** — `project()` now takes `(absentDates, windowEnd?)`. If no absences and no windowEnd, returns only entered attendance. Otherwise window = today → max(absent dates). Long weekends still use semester end.
2. **No popup** — Clicking date instantly toggles `pendingAbsent[]` (uncommitted). Red "Confirm Plan" bar appears below calendar when changes differ from saved data. "Reset" reverts to saved.
3. **Holiday mode** — Toggle button in calendar nav. When active, clicks mark days as holidays (orange, excluded from calculations). Holidays saved immediately to localStorage.
**Problem:** None
**Fix:** N/A

---

### [Step 3] — 3D Cyber Aesthetic + Confetti + Subdued (Attended/Total) + Dynamic Long Weekends
**Date:** 2026-08-17
**Status:** ✅ Done
**What:**
1. **Attendance Counts in Parenthesis:** Appended `(attended/total)` in subdued font right next to the percentage in the projected attendance panel and in tooltips.
2. **Holiday Confetti Animations:** Added floating particle animations inside holiday cells + festive confetti particle explosion bursts whenever a holiday is toggled on the calendar.
3. **Dynamic Long Weekends:** `findLongWeekends()` now dynamically re-evaluates in real time whenever an absent date or holiday is toggled, showing natural holiday long weekends, planned bunk long weekends, and available safe bunks.
4. **Futuristic 3D UI Overhaul:** Applied space-theme ambient gradients, glassmorphism, 3D inset borders, glowing hover depth on tiles, and clean typography.
**Problem:** None
**Fix:** N/A

---

### [Step 4] — Auto-Present Lit Green Highlighting
**Date:** 2026-08-17
**Status:** ✅ Done
**What:**
- When any future date is selected as absent (or pending absent dates exist), all intermediate weekdays between today and the furthest selected absent date that are not marked absent or holiday now **lit green** (`.auto-present`).
- Added animated pulsing green glow for these auto-present days.
- Added live hover preview (`.hover-present`): hovering over any future date previews the intermediate range in green before clicking.
**Problem:** None
**Fix:** N/A

---

### [Step 5] — Refined Active Attending Window Highlighting
**Date:** 2026-08-17
**Status:** ✅ Done
**What:**
- Clarified the visual status of all dates up to `maxAbsentDate`:
  - When user selects a date (e.g. 20th), all weekdays from today up to 20th that are NOT marked absent (e.g. 12th) and NOT marked holiday (e.g. 10th) **LIT UP VIBRANT GREEN (`.attending-green`)**, clearly representing *"I will attend class on these days"*.
  - 10th remains Orange (Holiday).
  - 12th and 20th remain Purple (Bunk / Absent).
  - Updated calendar legend to clearly show `Attending Class`, `Bunk Day`, `Holiday`, `Risky Bunk`, `Danger Bunk`.
**Problem:** None
**Fix:** N/A

---

### [Step 6] — Zero-Scroll Dashboard Layout + 10-Week Long Weekend Limit
**Date:** 2026-08-17
**Status:** ✅ Done
**What:**
1. **Zero-Scroll Viewport Layout:** Made calendar panel and dashboard container compact (`max-height: 100vh`, compact tile aspect ratio, streamlined margins & paddings) so the whole app fits cleanly on standard laptop screens without any vertical scrollbars.
2. **10-Week Long Weekend Horizon:** Constrained `findLongWeekends()` scan window to max 70 days (10 weeks) from today, keeping long weekend recommendations concise, relevant, and lightweight.
**Problem:** None
**Fix:** N/A

---

### [Step 7] — Filter Out 3-Day Weekends (4-Day+ Only)
**Date:** 2026-08-17
**Status:** ✅ Done
**What:**
- Refined `findLongWeekends()` to strictly filter out 3-day (Fri–Sun or Sat–Mon) weekends.
- The sidebar now exclusively displays 4-day (or longer) long weekends created by combining Friday and Monday bunks/holidays (e.g. `Fri, Sat, Sun, Mon`).
**Problem:** None
**Fix:** N/A
