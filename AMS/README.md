# 🏫 SchoolERP — Appointment & Visitor Management System

Full-stack school management platform built with **React 18 + Node.js + MongoDB**.

---

## 🏗️ Architecture

```
school-system/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.js           — 5 roles: admin, teacher, parent, receptionist, gatekeeper
│   │   │   ├── Appointment.js    — Full appointment lifecycle
│   │   │   ├── Visitor.js        — Visitor entry, photo, vehicle, badge, alert tracking
│   │   │   └── Notification.js   — Priority-based notifications
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── appointment.controller.js
│   │   │   ├── visitor.controller.js
│   │   │   └── notification.controller.js
│   │   ├── services/
│   │   │   ├── socket.service.js        — Socket.IO per-user rooms
│   │   │   ├── notification.service.js  — Notify by user / by role
│   │   │   └── visitorAlert.service.js  — CRON job: MISSING visitor alert
│   │   ├── middleware/
│   │   │   ├── auth.js     — JWT + role guard
│   │   │   └── upload.js   — Multer photo upload
│   │   ├── routes/index.js
│   │   ├── config/db.js
│   │   ├── config/seed.js  — Seeds 9 demo users
│   │   └── server.js
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx           — 7 demo account quick-login buttons
    │   │   ├── Layout.jsx          — Role-adaptive sidebar + real-time notification bell
    │   │   ├── Dashboard.jsx       — Stats, upcoming appointments, active visitors, missing alerts
    │   │   ├── BookAppointment.jsx — 3-step wizard: teacher → date/time → confirm
    │   │   ├── Appointments.jsx    — List + Detail with accept/decline/complete modals
    │   │   ├── RegisterVisitor.jsx — Webcam capture + file upload + vehicle + badge
    │   │   └── Visitors.jsx        — List + Detail with checkout and complete-meeting
    │   ├── components/common/UI.jsx  — Avatar, StatusBadge, Modal, Spinner, EmptyState, Alert
    │   ├── contexts/AuthContext.jsx
    │   └── utils/api.js             — Axios + Socket.IO singleton
    └── package.json
```

---

## ✅ Features

### 📅 Appointment Management (Module 1)
| Role | Can Do |
|---|---|
| Parent | Book appointment via 3-step wizard (select teacher → date/time → confirm), cancel |
| Teacher | Accept / Decline (with reason), Mark Complete → receptionist auto-notified |
| Receptionist | View all appointments, receive notification on meeting completion |
| Admin | Full access to all appointments |

**Flow:**
1. Parent selects teacher → picks date + 30-min slot → adds reason/message → sends
2. Teacher receives real-time notification → accepts (with optional note) or declines (with reason)
3. Parent notified of outcome instantly via Socket.IO
4. After meeting → Teacher marks **Complete** + adds summary → Receptionist gets immediate alert

### 👤 Visitor Management (Module 2)
| Role | Can Do |
|---|---|
| Receptionist | Register visitor (photo + vehicle + badge auto-generated), notify gatekeeper |
| Teacher / Host | Mark meeting as complete → gatekeeper notified |
| Gatekeeper | View active visitors, confirm checkout, receive MISSING alerts |
| Admin | Full access, view all stats |

**Flow:**
1. Receptionist registers visitor → webcam photo or file upload → vehicle number → expected duration
2. Gatekeeper receives instant notification with badge, vehicle, person-to-meet
3. After meeting → host marks **Complete** → Gatekeeper gets "Visitor Exiting" alert
4. **AUTO MISSING ALERT** (via cron every minute): if visitor not checked out 10 min after meeting completion → `visitor_missing` alert fires to gatekeeper + receptionist + admin with URGENT priority

**Auto-badge generation:** Format `VIS-DDMM-NNN` (e.g. `VIS-1704-001`)

### 🔔 Real-Time Notifications
- Socket.IO: every user gets notifications pushed instantly
- Priority levels: `low` / `normal` / `high` / `urgent`
- Urgent = red animated pulse dot + toast notification
- Missing visitor = full red banner on dashboard + toast

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB (local: `mongodb://localhost:27017` or Atlas)

### 1. Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

npm install
npm run seed     # Creates 9 demo users
npm run dev      # Starts on :5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm start        # Starts on :3000
```

---

## 🔑 Demo Accounts (password: `demo123`)

| Role | Email | Access |
|---|---|---|
| Admin | admin@school.com | Everything |
| Receptionist | reception@school.com | Appointments view, visitor registration & management |
| Gatekeeper | gate@school.com | Active visitors, checkout |
| Teacher (Maths) | ramesh@school.com | Own appointments, mark complete |
| Teacher (Science) | sunita@school.com | Own appointments, mark complete |
| Parent (Ravi) | ravi@parent.com | Book, view own appointments |
| Parent (Meena) | meena@parent.com | Book, view own appointments |

---

## 🔌 API Reference

### Auth
```
POST   /api/auth/login         → { token, user }
GET    /api/auth/profile       → { user }
GET    /api/users?role=teacher → users list
```

### Appointments
```
GET    /api/appointments              → list (role-filtered)
POST   /api/appointments              → create (parent only)
GET    /api/appointments/:id          → single
PATCH  /api/appointments/:id/accept   → teacher accepts
PATCH  /api/appointments/:id/decline  → teacher declines
PATCH  /api/appointments/:id/complete → teacher marks complete + notifies receptionist
PATCH  /api/appointments/:id/cancel   → parent cancels
GET    /api/appointments/stats        → dashboard counts + upcoming
```

### Visitors
```
GET    /api/visitors              → list (with filters: status, date, search)
POST   /api/visitors              → register (multipart/form-data, photo upload)
GET    /api/visitors/:id          → single visitor
PATCH  /api/visitors/:id/complete-meeting → mark meeting done + notify gatekeeper
PATCH  /api/visitors/:id/checkout          → check out visitor
GET    /api/visitors/stats                 → dashboard counts + active/missing
```

### Notifications
```
GET    /api/notifications          → list (50 most recent)
PATCH  /api/notifications/read     → mark all as read
PATCH  /api/notifications/:id/read → mark one as read
```

---

## 🗄️ MongoDB Collections

| Collection | Key Fields |
|---|---|
| `users` | name, email, role, subject, childName, avatarInitials |
| `appointments` | parent, teacher, date, startTime, status, meetingSummary, receptionistNotified |
| `visitors` | name, phone, photoUrl, vehicleNumber, badgeNumber, status, meetingCompletedAt, missingAlertSent |
| `notifications` | userId, type, priority, isRead, relatedId, relatedModel |

---

## ⚙️ Environment Variables

### Backend `.env`
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/school_management
JWT_SECRET=your_min_32_char_secret
FRONTEND_URL=http://localhost:3000
VISITOR_ALERT_MINUTES=10    # Minutes before MISSING alert fires
UPLOAD_PATH=./uploads
```

### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=http://localhost:5000
REACT_APP_ALERT_MINUTES=10
```

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Tailwind CSS 3, Socket.IO client, react-webcam |
| Backend | Node.js 18+, Express 4, Socket.IO 4, node-cron, Multer |
| Database | MongoDB 7+, Mongoose 8 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Fonts | Outfit (display), DM Sans (body) |
