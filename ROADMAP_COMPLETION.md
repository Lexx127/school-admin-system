# Agape Planning Report v2 - Completion Checklist

Last updated: 2026-03-31

## Overall Status

- Core roadmap implementation is complete across phases 1-9.
- Remaining items are school-policy confirmations (cycle rules, official term dates, public holiday dataset), not missing engineering work.

## Phase-by-Phase Status

### Phase 1 - Immediate Bug Fixes
- [x] Attendance restricted to homeroom teachers in backend (`backend/routers/attendance.py`)
- [x] Attendance tab hidden for non-homeroom teachers (`frontend/app/teacher/page.js`)
- [x] Teacher class-loading `Not Found` flow hardened (`frontend/app/teacher/page.js`, `backend/routers/users.py`)
- [x] Assignment count behavior aligned toward enrolment semantics (`backend/routers/homework.py`)

### Phase 2 - Teacher Assignment System
- [x] Assignment endpoints implemented (`backend/routers/classes.py`)
- [x] Homeroom assignment endpoint implemented (`backend/routers/classes.py`)
- [x] CSV bulk assignment implemented (`backend/routers/classes.py`)
- [x] Admin matrix + CSV UI implemented (`frontend/app/admin/page.js`)
- [x] Staff form includes `employee_number` and `department` (`frontend/app/admin/page.js`)

### Phase 3 - Password Change
- [x] `PUT /auth/change-password` (`backend/main.py`)
- [x] Change password UI on dashboards (admin/teacher/student/parent/principal pages)

### Phase 4 - School Terms and Calendar Days
- [x] `SchoolTerm` and `SchoolCalendarDay` models (`backend/models.py`)
- [x] Term create/list + day update APIs (`backend/routers/calendar.py`)
- [x] Auto-generation of term calendar days (`backend/routers/calendar.py`)
- [x] Attendance summary calculations term-aware (`backend/routers/attendance.py`)

### Phase 5 - Student Subject Enrolment
- [x] `StudentSubjectEnrolment` model + APIs (`backend/models.py`, `backend/routers/enrolments.py`)
- [x] Admin enrolment UI (`frontend/app/admin/page.js`)
- [x] Homework visibility enrolment-aware (`backend/routers/homework.py`)
- [x] Grade entry validates enrolment (`backend/routers/grades.py`)

### Phase 6 - Timetable System
- [x] `TimetableSlot` model + APIs (`backend/models.py`, `backend/routers/timetable.py`)
- [x] Teacher + class conflict detection (`backend/routers/timetable.py`)
- [x] Student year-level view endpoint with enrolment highlight flag (`backend/routers/timetable.py`)
- [x] Student UI shows enrolled vs alternative subjects (`frontend/app/student/page.js`)

### Phase 7 - Calendar Frontend
- [x] FullCalendar dependency installed (`frontend/package.json`)
- [x] Shared calendar drawer implemented (`frontend/components/GlobalCalendarDrawer.js`)
- [x] 7-day strip + week/month/term modes + term selector (`frontend/components/GlobalCalendarDrawer.js`)
- [x] Mounted globally for all dashboards (`frontend/app/layout.js`)

### Phase 8 - Attendance Excel Export
- [x] Weekly attendance export (`backend/routers/exports.py`)
- [x] Termly attendance export (`backend/routers/exports.py`)
- [x] Alias endpoints match report naming (`/attendance/export/weekly`, `/attendance/export/termly`)
- [x] Holiday-aware Excel marking (`H` + grey) using `SchoolCalendarDay` (`backend/routers/exports.py`)

### Phase 9 - Production Readiness
- [x] Frontend API URL env-driven (`frontend/lib/api.js`)
- [x] Hardcoded frontend API URLs removed from major dashboards
- [x] CORS origins env-driven (`backend/main.py`, `CORS_ORIGINS`)
- [x] Cookie security/samesite env-driven (`backend/main.py`, `COOKIE_SECURE`, `COOKIE_SAMESITE`)
- [x] Deployment/setup README added (`README.md`)

## Equivalent/Not-Exact Naming Notes

These are behavior-complete but use different endpoint paths than the report's wording:

1. Teacher assignment create
   - Report: `POST /users/admin/assign/class-subject`
   - Implemented: `POST /classes/{class_id}/subjects`
   - Reason: same operation, scoped by class in REST style.

2. Teacher assignment delete
   - Report: `DELETE /users/admin/assign/class-subject/{id}`
   - Implemented: `DELETE /classes/subjects/{class_subject_id}`
   - Reason: same target resource (`ClassSubject`) with different path prefix.

3. Homeroom teacher assignment
   - Report: `PUT /users/admin/classes/{id}/homeroom-teacher`
   - Implemented: `PUT /classes/{class_id}/homeroom`
   - Reason: same write action, shorter naming.

4. Subject list endpoint
   - Report: `GET /users/subjects/all`
   - Implemented: `GET /classes/all-subjects`
   - Reason: same data payload used by assignment UIs.

5. Staff with assignment context
   - Report: `GET /users/admin/staff/all`
   - Implemented by composition:
     - `GET /users/staff/all` (staff listing)
     - `GET /classes/all-assignments` (assignment matrix data)
   - Reason: split into two focused endpoints rather than one aggregated endpoint.

