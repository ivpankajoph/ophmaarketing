# WhatsApp + Facebook Lead Ads + AI Agents System

## Overview
A full-stack system integrating WhatsApp Business API, Facebook Lead Ads, and AI Agents with OpenAI. Features webhook-based message handling, automated AI responses, lead synchronization, and agent-form mapping.

## Current State
**Status**: Fully Functional (Development Mode)

The application uses JSON file-based storage (in `data/` folder) with a storage abstraction layer. Ready for production database migration (MongoDB, PostgreSQL). All CRUD operations persist between sessions.

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

### New Integration Modules
1. **Dashboard** - Overview stats for forms, leads, agents, and messages
2. **AI Agents** - Create and manage AI agents with custom prompts using OpenAI
3. **Facebook Lead Ads** - Sync forms and leads from Facebook
4. **Agent-Form Mapping** - Assign AI agents to Facebook forms for automated handling
5. **WhatsApp Messages** - Webhook-based message handling with AI responses

### Original Modules
6. **Inbox** - Conversation view with message sending
7. **Contacts CRM** - Contact management with tags and filtering
8. **Campaigns** - Broadcast creation, scheduling, and reporting
9. **Automation** - Visual flow builder for chatbot logic
10. **Templates** - Message template management (WhatsApp approved)
11. **Team Members** - User and role management
12. **Billing** - Credits and transaction history

## API Endpoints

### New Integration APIs
- `GET /api/dashboard` - Dashboard stats (forms, leads, agents, messages)
- `GET/POST /api/agents` - AI Agent CRUD
- `PUT/DELETE /api/agents/:id` - Update/delete agent
- `POST /api/agents/:id/test` - Test agent with message
- `POST /api/agents/chat` - Chat with default agent
- `GET/POST /api/facebook/forms` - List/sync forms
- `POST /api/facebook/syncForms` - Sync forms from Facebook
- `GET /api/facebook/leads` - List leads
- `POST /api/facebook/syncLeads` - Sync leads from Facebook
- `GET/POST/DELETE /api/map-agent` - Agent-form mappings
- `GET /api/conversations` - WhatsApp conversations
- `POST /api/messages/send` - Send WhatsApp message
- `GET/POST /api/webhook/whatsapp` - WhatsApp webhook

### Original APIs
- `GET/POST /api/contacts` - Contact management
- `GET/POST /api/campaigns` - Campaign CRUD
- `POST /api/campaigns/:id/send` - Send campaign
- `GET/POST /api/templates` - Template management
- `GET/POST /api/automations` - Automation rules
- `GET/POST /api/team-members` - Team management
- `GET/POST /api/settings/whatsapp` - WhatsApp API config
- `GET/POST /api/billing` - Billing and credits

## Environment Variables
```env
# WhatsApp Business API
WHATSAPP_TOKEN=your_whatsapp_access_token
PHONE_NUMBER_ID=your_phone_number_id
VERIFY_TOKEN=your_webhook_verify_token

# Facebook Lead Ads
FB_ACCESS_TOKEN=your_facebook_access_token
FB_PAGE_ID=your_facebook_page_id

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

## Running the Application
The application runs on port 5000 with `npm run dev`.

## Recent Changes
- **Nov 27, 2025**: Added WhatsApp + Facebook Lead Ads + AI Agents integration
  - Storage abstraction layer with JSON adapter (ready for MongoDB/PostgreSQL)
  - AI Agents module with OpenAI integration
  - Facebook Lead Ads sync (forms and leads)
  - Agent-Form mapping for automated lead handling
  - WhatsApp webhook for message handling
  - New dashboard with integration stats

## Development Notes
- Uses JSON file storage in `data/` folder (persists between restarts)
- Storage abstraction allows easy migration to MongoDB or PostgreSQL
- Simulated responses when API keys not configured
- All forms include validation and error handling with toast notifications
