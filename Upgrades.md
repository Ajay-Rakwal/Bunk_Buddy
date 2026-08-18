# Future Upgrades

## Priority: High

### U1: Day-by-Day Attendance Tracker
Instead of just projecting, let the user log attendance daily.
- Each day shows the timetable for that day
- User checks off which classes they actually attended
- Replaces the manual "attended/total" input with real tracked data
- Historical accuracy instead of estimation

### U2: Undo/History
- Track history of absent-date toggles
- Let user undo last N changes
- See how projections changed over time

### U3: Holiday Calendar Integration
- Pre-load national/regional holidays
- Let user add college-specific holidays (exam days, fests)
- Auto-exclude from calculations

---

## Priority: Medium

### U4: Export/Import Data
- Export all data as JSON for backup
- Import on another device/browser
- Useful when switching browsers or clearing cache

### U5: Push Notification Reminders
- "You haven't opened the app in 3 days — your attendance is being marked present"
- "You can skip tomorrow (Friday) and still stay above 75%"
- Uses browser Notification API — no server needed

### U6: Semester Comparison
- Archive past semester data
- Compare attendance patterns across semesters
- "You bunked 12 Mondays last sem vs 8 this sem"

### U7: Subject-Specific Target
- Some subjects might need 80% (labs), others 75% (theory)
- Let user set per-subject minimum thresholds

---

## Priority: Low (Fun)

### U8: Bunk Streak Counter
- "Current present streak: 14 days 🔥"
- "Longest bunk streak: 3 days"
- Gamification of attendance management

### U9: Timetable Screenshot OCR (Revisited)
- If the app proves useful, invest in OCR for timetable parsing
- Use Tesseract.js (client-side, no server)
- Only worth doing after manual input proves tedious to users

### U10: PWA / Installable App
- Add a manifest.json and service worker
- User can install it as a home screen app on phone
- Works fully offline

### U11: Shared Timetable
- One person enters the timetable, generates a share link
- Classmates import it — no re-entry
- Just a URL-encoded JSON, no server needed

### U12: "What If" Mode
- Separate sandbox mode for hypothetical scenarios
- "What if I skip every Monday for the rest of the semester?"
- Doesn't affect actual tracked data
