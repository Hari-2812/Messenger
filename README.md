# WhatsApp Bulk Campaign Manager

A full-stack MVP for managing WhatsApp bulk messaging campaigns with a mock provider (Meta API ready architecture).

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, Axios, React Router  
**Backend:** Node.js, Express, MongoDB, Mongoose, JWT, Bcrypt

## Features

- Login with JWT authentication
- Dashboard with stats and recent campaigns
- Contacts management + CSV import
- Message templates with variable replacement (`{{name}}`, `{{phone}}`, `{{email}}`)
- Campaign creation, preview, and bulk send
- Message logs with campaign filtering
- Mock WhatsApp provider (swap for Meta API later)

## Prerequisites

- Node.js 18+
- MongoDB running locally on `mongodb://127.0.0.1:27017`

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm run seed
npm run dev
```

Server runs on **http://localhost:5000**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs on **http://localhost:5173**

### 3. Login

| Email | Password |
|-------|----------|
| admin@campaign.com | admin123 |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/contacts | List contacts |
| POST | /api/contacts | Create contact |
| PUT | /api/contacts/:id | Update contact |
| DELETE | /api/contacts/:id | Delete contact |
| POST | /api/contacts/import | Import CSV |
| GET | /api/templates | List templates |
| POST | /api/templates | Create template |
| PUT | /api/templates/:id | Update template |
| DELETE | /api/templates/:id | Delete template |
| GET | /api/campaigns | List campaigns |
| POST | /api/campaigns | Create/send campaign |
| POST | /api/campaigns/preview | Preview messages |
| POST | /api/campaigns/:id/send | Send draft campaign |
| GET | /api/logs | Message logs |
| GET | /api/logs/dashboard | Dashboard stats |

## CSV Import Format

```csv
Name,Phone,Email
Hari,919999999999,hari@gmail.com
Ravi,918888888888,ravi@gmail.com
```

Duplicate phone numbers are skipped automatically.

## Template Variables

```
Hello {{name}}

Welcome to our program.
Your number: {{phone}}
Email: {{email}}
```

## Project Structure

```
Messenger/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/whatsappProvider.js
│   ├── server.js
│   └── seed.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   └── ...
├── sample-contacts.csv
└── README.md
```

## Mock WhatsApp Provider

Located at `backend/services/whatsappProvider.js`. Replace `sendMessage()` with Meta WhatsApp Business API when ready.

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/whatsapp_campaign
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
```
