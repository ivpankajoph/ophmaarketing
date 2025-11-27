# WhatsApp Business API Dashboard

## Overview
A complete WhatsApp Business API Dashboard built with React frontend and Node.js/Express backend. Features 16+ functional modules for managing WhatsApp Business communications, including AI-powered auto-reply and Facebook Lead Forms integration.

## Current State
**Status**: Fully Functional (Development Mode)

The application uses in-memory storage with JSON file storage for new features. All CRUD operations are functional and data persists during the session.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TailwindCSS, Shadcn/UI
- **Backend**: Node.js, Express, TypeScript
- **State Management**: React Query (TanStack Query)
- **UI Components**: Radix UI primitives
- **Flow Builder**: React Flow (@xyflow/react)
- **AI Integration**: OpenAI GPT-4o

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
│       │   ├── ai/                 # AI Agent pages
│       │   │   ├── AgentsPage.tsx  # AI agent management
│       │   │   ├── MapAgent.tsx    # Agent-form mapping
│       │   │   └── NewAgent.tsx    # Create new agent
│       │   ├── facebook/           # Facebook integration
│       │   │   ├── LeadForms.tsx   # Lead form sync
│       │   │   └── Leads.tsx       # Lead management
│       │   ├── templates/          # Template management
│       │   ├── settings/           # Settings pages
│       │   ├── automation/         # Automation subpages
│       │   ├── campaigns/          # Campaign subpages
│       │   └── reports/            # Reporting pages
│       └── components/       # Reusable UI components
├── server/                   # Backend Express server
│   ├── routes.ts            # API routes
│   ├── storage.ts           # In-memory data storage
│   ├── modules/             # New modular features
│   │   ├── aiAgents/        # AI Agent CRUD
│   │   ├── facebook/        # Facebook API integration
│   │   ├── mapping/         # Agent-Form mapping
│   │   ├── whatsapp/        # WhatsApp webhook
│   │   ├── openai/          # OpenAI integration
│   │   └── storage/         # JSON file adapter
│   └── index.ts             # Server entry point
├── data/                     # JSON data storage
│   ├── agents.json          # AI agents
│   ├── forms.json           # Facebook lead forms
│   ├── leads.json           # Lead data
│   └── mapping.json         # Agent-form mappings
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
12. **AI Agents** - Create and manage AI-powered chat agents with OpenAI
13. **Facebook Lead Forms** - Sync and manage Facebook lead forms
14. **Lead Management** - View and filter leads from Facebook forms
15. **Agent-Form Mapping** - Connect AI agents to lead forms for auto-reply
16. **WhatsApp Webhook** - Receive and respond to WhatsApp messages with AI

## API Endpoints

### Existing APIs
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

### New APIs (AI & Facebook)
- `GET/POST/PUT/DELETE /api/agents` - AI Agent CRUD
- `POST /api/agents/:id/test` - Test agent with message
- `POST /api/facebook/forms/sync` - Sync Facebook lead forms
- `GET /api/facebook/forms` - List synced forms
- `POST /api/facebook/forms/:formId/sync-leads` - Sync leads for form
- `GET /api/facebook/leads` - List all leads
- `GET/POST/PUT/DELETE /api/map-agent` - Agent-form mapping
- `GET /api/map-agent/form/:formId` - Get mapping by form
- `GET/POST /api/webhook/whatsapp` - WhatsApp webhook (verify & receive)
- `POST /api/webhook/whatsapp/send` - Send WhatsApp message
- `POST /api/leads/auto-reply/process-all` - Process all pending leads for auto-reply
- `POST /api/leads/auto-reply/process` - Process a single lead for auto-reply
- `POST /api/leads/auto-reply/send/:leadId` - Send manual reply to a lead

## Environment Variables
Required secrets for full functionality:
- `FB_ACCESS_TOKEN` - Facebook Graph API access token
- `WHATSAPP_TOKEN` - WhatsApp Business API token
- `PHONE_NUMBER_ID` - WhatsApp phone number ID (848441401690739)
- `FB_PAGE_ID` - Facebook page ID (118584934681142)
- `OPENAI_API_KEY` - OpenAI API key for AI agents
- `VERIFY_TOKEN` - WhatsApp webhook verification token

## Running the Application
The application runs on port 5000 with `npm run dev`.

## Recent Changes
- **Nov 27, 2025**: Added Lead Auto-Reply system - automatically sends WhatsApp messages to new leads using AI agents
- **Nov 27, 2025**: Fixed NewAgent.tsx to connect with backend API for creating agents
- **Nov 27, 2025**: Added AI Agent management with OpenAI integration
- **Nov 27, 2025**: Added Facebook Lead Forms sync and lead management
- **Nov 27, 2025**: Added Agent-Form mapping for automated responses
- **Nov 27, 2025**: Added WhatsApp webhook for receiving and auto-replying to messages
- **Nov 27, 2025**: New modular backend structure in server/modules/
- **Nov 27, 2025**: JSON file storage for new features (data/ directory)

## Auto-Reply System Flow
1. Sync Facebook Lead Forms via the dashboard
2. Create an AI Agent with custom instructions
3. Create a mapping between a Lead Form and an AI Agent
4. When leads are synced, the system automatically:
   - Checks if the lead has a phone number
   - Checks if an active agent mapping exists for the form
   - Generates a personalized welcome message using the AI agent
   - Sends the message via WhatsApp Business API
   - Tracks which leads have received auto-replies

## Development Notes
- Existing features use in-memory storage (data resets on server restart)
- New AI/Facebook features use JSON file storage (data persists)
- Designed to connect to real WhatsApp Business API with user credentials
- All forms include validation and error handling with toast notifications
- WhatsApp webhook URL: `https://your-domain/api/webhook/whatsapp`
