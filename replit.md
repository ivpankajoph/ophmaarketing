# WhatsApp Business API Dashboard

## Overview
A complete WhatsApp Business API Dashboard built with React frontend and Node.js/Express backend. Features 13 functional modules for managing WhatsApp Business communications.

## Current State
**Status**: Fully Functional (Development Mode)

The application uses in-memory storage with dummy data for demonstration. All CRUD operations are functional and data persists during the session.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TailwindCSS, Shadcn/UI
- **Backend**: Node.js, Express, TypeScript
- **State Management**: React Query (TanStack Query)
- **UI Components**: Radix UI primitives
- **Flow Builder**: React Flow (@xyflow/react)

## Project Structure
```
├── client/                    # Frontend React application
│   └── src/
│       ├── pages/            # Page components
│       │   ├── dashboard.tsx       # Main dashboard with stats
│       │   ├── inbox.tsx           # Message inbox
│       │   ├── contacts.tsx        # Contact CRM
│       │   ├── campaigns.tsx       # Campaign management
│       │   ├── automation.tsx      # Automation flow builder
│       │   ├── templates/          # Template management
│       │   ├── settings/           # Settings pages
│       │   ├── automation/         # Automation subpages
│       │   ├── campaigns/          # Campaign subpages
│       │   └── reports/            # Reporting pages
│       └── components/       # Reusable UI components
├── server/                   # Backend Express server
│   ├── routes.ts            # API routes
│   ├── storage.ts           # In-memory data storage
│   └── index.ts             # Server entry point
└── shared/                   # Shared types and schemas
    └── schema.ts            # Database schema definitions
```

## Key Features
1. **Dashboard** - Real-time messaging statistics and activity charts
2. **Inbox** - Conversation view with message sending
3. **Contacts CRM** - Contact management with tags and filtering
4. **Campaigns** - Broadcast creation, scheduling, and reporting
5. **Automation** - Visual flow builder for chatbot logic
6. **Keywords** - Auto-reply rules for incoming messages
7. **Templates** - Message template management (WhatsApp approved)
8. **Team Members** - User and role management
9. **Billing** - Credits and transaction history
10. **WhatsApp API** - API credentials configuration
11. **Reports** - Delivery, campaign, and agent performance

## API Endpoints
- `GET/POST /api/contacts` - Contact management
- `GET/POST /api/messages` - Message operations
- `GET/POST /api/campaigns` - Campaign CRUD
- `POST /api/campaigns/:id/send` - Send campaign
- `GET/POST /api/templates` - Template management
- `GET/POST /api/automations` - Automation rules
- `GET/POST /api/team-members` - Team management
- `GET/POST /api/settings/whatsapp` - WhatsApp API config
- `GET/POST /api/billing` - Billing and credits
- `GET /api/dashboard/stats` - Dashboard statistics

## Running the Application
The application runs on port 5000 with `npm run dev`.

## Recent Changes
- **Nov 27, 2025**: Updated all frontend pages to use React Query for API integration
- Connected Dashboard, Contacts, Inbox, Campaigns, Templates, Settings pages to live APIs
- Added full CRUD operations for contacts, campaigns, templates, team members
- Implemented billing credits system with transactions

## Development Notes
- Uses in-memory storage (data resets on server restart)
- Designed to connect to real WhatsApp Business API with user credentials
- All forms include validation and error handling with toast notifications
