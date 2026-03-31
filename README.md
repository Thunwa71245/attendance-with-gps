# attendance-with-gps

QR Code attendance system with login, check-in scanning, location security, dashboard, and Google Apps Script integration.

Core pages:
- `login.html` for student/admin login
- `scan.html` for QR scanning and attendance submission
- `teacher.html` for room QR generation
- `dashboard.html` for attendance reporting
- `config.html` for local system configuration

Configuration:
- Default API endpoint is defined in `api-config.js`
- Local overrides can be saved from `config.html` via `localStorage`
