# Requirements

## Functional Requirements

### FR1: Timetable Input
- User manually enters their weekly timetable (Monday to Friday)
- Each day: list of subjects and number of classes per subject
- Weekends (Sat/Sun) are excluded — no classes
- Timetable is stored locally (localStorage) — enter once, persists

### FR2: Current Attendance Input
- User enters per-subject attendance: classes attended / total classes held so far
- Editable anytime
- Stored locally

### FR3: Semester End Date
- User sets the last working day of the semester
- Used to calculate total remaining weekdays and classes

### FR4: Monthly Calendar View
- Display a full month calendar (navigable month-to-month)
- Weekends greyed out / non-interactive
- Only dates from today onward are interactive (past dates are locked as "present")
- Dates before today (after semester start) are auto-marked present

### FR5: Absent Day Selection
- User clicks a future weekday on the calendar to toggle it as "absent"
- Absent = ALL classes on that day-of-week are missed
- A small confirm button appears: "Confirm skip for [date]?"
- User can un-toggle (click again to cancel the absence)
- Multiple dates can be marked absent simultaneously

### FR6: Auto-Present Logic
- Every weekday between today and semester end that is NOT marked absent = present
- All classes on present days are counted as attended
- If user hasn't opened the app for N days, upon opening: all missed weekdays between last visit and today are auto-marked present
- Reference point is always **today's date**

### FR7: Attendance Calculation
- Per-subject projected attendance % after factoring:
  - Existing attendance (from FR2)
  - Auto-present days (all their classes counted as attended)
  - Absent days (all their classes counted as missed)
- Formula per subject:
  ```
  projected % = (existing_attended + classes_on_present_days) / (existing_total + classes_on_all_remaining_days) × 100
  ```

### FR8: Calendar Color-Coding
- Each future weekday is color-coded BEFORE user clicks:
  - **Green**: safe to skip — all subjects stay ≥75% even if this day is skipped
  - **Yellow**: risky — at least one subject would be in the 75–76% range
  - **Red**: can't skip — at least one subject drops below 75%
- Colors update live as user toggles absent dates

### FR9: Hover Tooltip
- Hovering a date shows per-subject impact:
  - "Skipping this day: Math → 73.2%, Physics → 80.1%, ..."
- Instant feedback before confirming

### FR10: Best Long Weekends Auto-Suggest
- System computes the optimal set of Mondays and Fridays to skip
- Goal: maximize long weekends while keeping all subjects ≥75%
- Displayed as a suggestion list: "You can safely take these N long weekends"
- Greedy algorithm: prioritize Mon/Fri pairs, then standalone Mon or Fri

### FR11: Subject-Heaviness Warning
- When a date is selected/hovered, highlight which subject is most impacted
- Example: "Monday has 3 Math classes — skipping hits Math hardest"

---

## Non-Functional Requirements

### NFR1: Pure Client-Side
- No backend, no server, no database
- Everything runs in the browser, stored in localStorage
- Single HTML file or minimal file set

### NFR2: Offline Capable
- Works without internet after first load (no external API calls)

### NFR3: Minimal UI
- Light on UI, heavy on calculation
- No unnecessary chrome — functional and clean
- Dark mode preferred

### NFR4: Performance
- Calendar re-renders and attendance recalculations must feel instant
- No perceptible lag on toggle

### NFR5: Data Persistence
- All user data (timetable, attendance, absent days, semester dates) persists in localStorage
- Survives browser refresh and close
