# WhatsApp Business API Dashboard

## Overview
A complete WhatsApp Business API Dashboard built with React frontend and Node.js/Express backend. Features 16+ functional modules for managing WhatsApp Business communications, including AI-powered auto-reply and Facebook Lead Forms integration.

## Current State
**Status**: Fully Functional (Development Mode)

The application uses MongoDB (Atlas) for data persistence in the new modular features. All CRUD operations are functional and data persists across server restarts.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TailwindCSS, Shadcn/UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB Atlas (mongoose ODM)
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
│       │   │   ├── NewAgent.tsx    # Create new agent
│       │   │   └── AgentReports.tsx # AI lead qualification reports
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
│   │   ├── broadcast/       # Broadcast messaging module
│   │   ├── facebook/        # Facebook API integration
│   │   ├── leadAutoReply/   # Lead auto-reply system
│   │   ├── mapping/         # Agent-Form mapping
│   │   ├── whatsapp/        # WhatsApp webhook
│   │   ├── openai/          # OpenAI integration
│   │   ├── aiAnalytics/     # AI lead qualification tracking
│   │   └── storage/         # MongoDB adapter + JSON fallback
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
7. **Templates** - Message template management with Meta sync and approval
8. **Team Members** - User and role management
9. **Billing** - Credits and transaction history
10. **WhatsApp API** - API credentials configuration
11. **Reports** - Delivery, campaign, and agent performance
12. **AI Agents** - Create and manage AI-powered chat agents with OpenAI
13. **24-Hour Window Inbox** - Show customers within 24-hour window for free-form messaging
14. **Facebook Lead Forms** - Sync and manage Facebook lead forms
15. **Lead Management** - View and filter leads from Facebook forms
16. **Agent-Form Mapping** - Connect AI agents to lead forms for auto-reply
17. **WhatsApp Webhook** - Receive and respond to WhatsApp messages with AI
18. **Broadcast Messaging** - Enhanced bulk messaging with Template/Custom/AI Agent options
19. **Excel/CSV Import** - Import contacts from Excel or CSV files
20. **Broadcast Lists** - Save and manage contact lists for repeated broadcasts
21. **Schedule Messages** - Schedule broadcasts for future delivery
22. **Meta Template Sync** - Sync templates from Meta Business Suite
23. **Template Approval** - Submit templates to Meta for approval with guidelines
24. **Campaign Reports** - Section-wise messages, replies, costs, template performance
25. **User Engagement Report** - Top users by engagement % (maximum to minimum)
26. **AI Agent Reports** - Track lead qualification (Interested/Not Interested/Pending) from AI conversations

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

### Broadcast APIs
- `GET/POST/PUT/DELETE /api/broadcast/lists` - Broadcast list management
- `GET /api/broadcast/lists/:id` - Get specific broadcast list
- `POST /api/broadcast/import-excel` - Import contacts from Excel file
- `POST /api/broadcast/import-csv` - Import contacts from CSV file
- `GET /api/broadcast/export-contacts` - Export contacts to Excel
- `GET/POST/PUT/DELETE /api/broadcast/schedules` - Scheduled message management
- `POST /api/broadcast/send` - Send broadcast to multiple contacts
- `POST /api/broadcast/send-single` - Send message to single contact
- `POST /api/broadcast/send-to-list/:listId` - Send broadcast to saved list

### Template Sync APIs
- `POST /api/templates/sync-meta` - Sync templates from Meta Business Suite
- `POST /api/templates/:id/submit-approval` - Submit template to Meta for approval

### AI Analytics APIs
- `GET /api/ai-analytics/qualifications` - List all lead qualifications
- `GET /api/ai-analytics/qualifications/:id` - Get specific qualification
- `PUT /api/ai-analytics/qualifications/:id` - Update qualification (category/notes)
- `DELETE /api/ai-analytics/qualifications/:id` - Delete qualification
- `GET /api/ai-analytics/qualifications/stats` - Get summary statistics
- `GET /api/ai-analytics/qualifications/report` - Get detailed report by source/campaign/agent

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
- **Nov 29, 2025**: Fixed imported contacts not showing in contact list - contacts now saved to MongoDB
- **Nov 29, 2025**: Added ImportedContact MongoDB schema with proper persistence
- **Nov 29, 2025**: Updated Contacts page to show both regular and imported contacts
- **Nov 29, 2025**: Added /api/broadcast/imported-contacts endpoint for fetching saved contacts
- **Nov 29, 2025**: Fixed CSV import to accept Mobile/Name columns (case-insensitive header mapping)
- **Nov 29, 2025**: Added scientific notation handling for phone numbers from Excel
- **Nov 29, 2025**: Fixed time display in 24-Hour Window Inbox (now shows "X hr Y min ago" format)
- **Nov 29, 2025**: Added message sorting in inbox (newest messages at top)
- **Nov 29, 2025**: Added BroadcastLog MongoDB schema for proper data persistence
- **Nov 29, 2025**: Improved error handling with detailed import validation feedback
- **Nov 28, 2025**: Fixed Campaign/Broadcast page - button click now working, contact selection fixed, template selection fixed
- **Nov 28, 2025**: Added comprehensive message logging to MongoDB for all broadcast messages
- **Nov 28, 2025**: Created Broadcast Reports page with filters, search, export CSV, and pagination
- **Nov 28, 2025**: Fixed checkbox handling to properly handle "indeterminate" state
- **Nov 28, 2025**: Added pagination to /api/broadcast/logs endpoint for performance
- **Nov 28, 2025**: Migrated storage layer from JSON files to MongoDB Atlas for better scalability and data persistence
- **Nov 28, 2025**: Updated all modular services (aiAgents, facebook, mapping, broadcast, aiAnalytics, leadAutoReply) to async/await for MongoDB
- **Nov 28, 2025**: Added mongodb.adapter.ts with mongoose connection and collection management
- **Nov 27, 2025**: Added AI Agent Reports page for tracking lead qualification (Interested/Not Interested/Pending) from AI conversations
- **Nov 27, 2025**: Added AI Analytics backend module with automatic keyword-based lead classification
- **Nov 27, 2025**: Integrated AI qualification tracking with WhatsApp webhook for automatic lead scoring
- **Nov 27, 2025**: Added 24-Hour Window Inbox page for customers within messaging window with Select All, Download, and bulk messaging options
- **Nov 27, 2025**: Updated navigation sidebar with 24-Hour Window option before Inbox
- **Nov 27, 2025**: Enhanced regular Inbox with Export List feature for leads outside 24-hour window
- **Nov 27, 2025**: Enhanced Manage Templates with Sync META Templates button and template rules/guidelines
- **Nov 27, 2025**: Added Submit for Approval functionality for templates to Meta Business Suite
- **Nov 27, 2025**: Enhanced Campaign Reports with section-wise stats, replies, costs, template performance tabs
- **Nov 27, 2025**: Added User Engagement Report showing top users by engagement % (maximum to minimum)
- **Nov 27, 2025**: Added comprehensive Broadcast Messaging module with Template/Custom/AI Agent options
- **Nov 27, 2025**: Added Excel/CSV import functionality for contacts
- **Nov 27, 2025**: Added Broadcast Lists to save and reuse contact groups
- **Nov 27, 2025**: Added Scheduled Messages for future delivery
- **Nov 27, 2025**: Updated all campaign pages (Broadcast, Single, Schedule, SelectedContacts) with AI Agent integration
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
- New AI/Facebook features use MongoDB Atlas for persistent storage
- MongoDB connection is initialized at server startup via connectToMongoDB()
- Designed to connect to real WhatsApp Business API with user credentials
- All forms include validation and error handling with toast notifications
- WhatsApp webhook URL: `https://your-domain/api/webhook/whatsapp`
