# WhatsApp Business API Dashboard

## Overview
A comprehensive WhatsApp Business API Dashboard designed to streamline WhatsApp Business communications. It offers over 16 functional modules, including advanced AI-powered auto-reply capabilities and seamless integration with Facebook Lead Forms. The project aims to provide businesses with a powerful tool for managing customer interactions, automating responses, and leveraging AI for lead qualification and engagement.

## User Preferences
I prefer clear and concise explanations. When proposing changes, please outline the impact on existing functionalities and the overall architecture. I appreciate iterative development and prefer to review changes in smaller, manageable increments. Ensure all new features are thoroughly tested and documented. Do not make changes to the folder `shared`.

## System Architecture
The application is built with a modern tech stack, featuring a React + TypeScript frontend utilizing Vite, TailwindCSS, and Shadcn/UI for a robust and responsive user interface. The backend is powered by Node.js and Express, written in TypeScript, providing a scalable API layer. Data persistence for new modular features is managed using MongoDB Atlas with Mongoose ODM, while older features may still rely on in-memory storage. State management on the frontend is handled by React Query (TanStack Query), and UI components are built with Radix UI primitives. A visual flow builder for automation is implemented using React Flow. AI capabilities are integrated via the OpenAI GPT-4o API.

The system incorporates a modular backend structure, allowing for independent development and deployment of features such as AI Agents, Broadcast messaging, Facebook integration, and lead auto-reply systems. Key architectural decisions include:
- **UI/UX**: Emphasis on a clean, modern interface using Shadcn/UI and TailwindCSS.
- **Technical Implementations**:
    - AI Agents for automated chat responses and lead qualification.
    - Integration with Facebook Lead Forms for lead ingestion and automated follow-up.
    - Visual flow builder for creating complex automation workflows.
    - Comprehensive broadcast messaging with support for various message types and scheduling.
    - Robust template management with Meta sync and approval workflows.
    - Real-time reporting and analytics for messaging, campaigns, and AI agent performance.
- **System Design**: The system is designed to connect to the official WhatsApp Business API, supporting webhooks for incoming messages and API calls for sending messages. An auto-reply system orchestrates the process of syncing leads, creating AI agents, mapping agents to forms, and sending personalized WhatsApp messages to leads.

## External Dependencies
- **MongoDB Atlas**: Cloud-hosted NoSQL database for data persistence.
- **OpenAI API**: For AI agent functionalities, specifically GPT-4o.
- **Google Gemini API**: For AI agent functionalities using Gemini models.
- **Facebook Graph API**: For syncing Facebook Lead Forms and managing leads.
- **WhatsApp Business API**: For sending and receiving WhatsApp messages.
- **Meta Business Suite**: For syncing and approving message templates.

## Recent Changes (December 5, 2025)
- **Gemini AI Support**: Added Google Gemini as an alternative AI provider for AI agents.
  - **Gemini Models**: gemini-2.0-flash-exp (Gemini 2.0 Experimental), gemini-1.5-flash (Gemini 1.5 Flash), gemini-1.5-pro (Gemini 1.5 Pro), gemini-exp-1206 (Gemini Experimental).
  - **Unified AI Service**: New `server/modules/ai/ai.service.ts` routes requests to OpenAI or Gemini based on model selection.
  - **Gemini Service**: New `server/modules/gemini/gemini.service.ts` handles Gemini API calls using @google/genai SDK.
  - **Agent Creation UI**: Updated NewAgent page to display both OpenAI and Gemini model options in a categorized dropdown.
  - **Settings**: Added Gemini API key configuration tab in Settings > API Credentials.
- **Real-Time Reports System**: All report pages now fetch real data from MongoDB with day-wise and month-wise breakdowns.
  - **Reports Service**: New `server/modules/reports/reports.service.ts` provides aggregated metrics from MongoDB collections.
  - **AI Agent Performance**: Shows actual agent usage stats including chats handled, messages generated, and response times.
  - **Customer Replies**: Displays incoming messages with basic sentiment analysis (positive/negative/neutral).
  - **User Engagement**: Shows engagement scores based on read rates and reply rates per user.
  - **Spending Report**: Calculates estimated costs based on message categories (marketing/utility/service).
  - **API Endpoints**: GET `/api/reports/ai-agents`, `/api/reports/customer-replies`, `/api/reports/user-engagement`, `/api/reports/spending`.
- **Key Files**: 
  - `server/modules/gemini/gemini.service.ts` - Gemini API integration
  - `server/modules/ai/ai.service.ts` - Unified AI routing service
  - `server/modules/reports/reports.service.ts` - Reports aggregation service
  - `server/modules/reports/reports.routes.ts` - Reports API endpoints
  - `client/src/pages/ai/NewAgent.tsx` - Agent creation with Gemini models
  - `client/src/pages/settings/WebhookAPI.tsx` - Gemini API key configuration

## Previous Changes (December 4, 2025)
- **Template Sync with Meta/Facebook**: Template management now uses per-user credentials from database.
  - **Meta Graph API Integration**: `/api/templates/sync-meta` endpoint fetches templates from Meta using user's businessAccountId (WABA ID) and whatsappToken.
  - **Template Schema Extended**: Added language, metaTemplateId, metaStatus, rejectionReason, lastSyncedAt fields to templates.
  - **TemplateStatus Page**: Now fetches real data from API instead of static mock data. Shows approval/pending/rejected counts from actual Meta status.
  - **ManageTemplates Page**: Added language column, displays metaStatus instead of local status, Submit button only shows for un-submitted templates.
  - **Duplicate Submission Prevention**: Backend guards prevent re-submitting already approved/rejected/submitted templates to Meta.
- **Contact Blocking System**: Full contact blocking functionality with multi-tenant isolation.
  - **Blocked Contacts Schema**: MongoDB `blocked_contacts` collection with userId, phone, name, reason, blockedAt, isActive fields. Unique index on (userId, phone) for tenant isolation.
  - **Block/Delete UI**: Inbox dropdown menu with "Block Contact" and "Delete Contact" options. Confirmation dialogs prevent accidental actions.
  - **Webhook Filtering**: Blocked contacts are filtered at the webhook level using user-scoped checks. Messages from blocked contacts are silently ignored.
  - **Blocked Contacts Report**: New report page at `/reports/blocked` showing all blocked contacts with search, stats, and unblock functionality.
  - **API Endpoints**: POST `/api/contacts/block`, POST `/api/contacts/unblock`, DELETE `/api/contacts/:contactId`, GET `/api/contacts/blocked`.
- **Multi-Tenant SaaS Implementation**: Complete multi-tenant architecture with secure credential isolation per user.
  - **Authentication System**: Session-based authentication with bcrypt password hashing. Default admin user (admin@whatsapp.com/admin123) created on startup.
  - **AES-256-GCM Encryption**: User-specific API keys (WhatsApp, Facebook, OpenAI) are encrypted at rest using AES-256-GCM with unique IVs.
  - **Credentials Service**: New MongoDB collection `user_credentials` stores encrypted API keys per user. API endpoints for save/retrieve credentials.
  - **Strict Tenant Isolation**: User-facing endpoints (/send, /send-template, /media) require authentication AND user-scoped credentials. Returns 403 if credentials not configured.
  - **Webhook Multi-Tenancy**: Inbound webhooks resolve tenant by phone_number_id lookup, then use that tenant's credentials for AI responses.
  - **OpenAI Service**: Updated to support per-user API keys for AI agents.
  - **Settings UI**: API Credentials page allows users to configure their own WhatsApp, Facebook, and OpenAI API keys securely.
- **Key Files**: 
  - `server/modules/contacts/contacts.routes.ts` - Contact blocking/unblocking APIs
  - `server/modules/encryption/encryption.service.ts` - AES-256-GCM encryption utilities
  - `server/modules/credentials/` - Credential storage and retrieval
  - `server/modules/whatsapp/whatsapp.service.ts` - Centralized WhatsApp service with tenant support
  - `server/modules/auth/` - Authentication with session management
  - `client/src/pages/reports/BlockedContacts.tsx` - Blocked contacts report page

## Previous Changes (December 3, 2025)
- **Broadcast Scheduling Fix**: Fixed scheduled broadcasts not sending at the scheduled time. The `scheduled_broadcasts` MongoDB collection was missing from the model registry. Added proper schema with fields for campaignName, contacts, message type, scheduledAt, status (scheduled/sending/sent/failed/cancelled), and counts.
- **Scheduled Broadcasts UI**: Added new section in Broadcast page to view and manage all scheduled broadcasts. Users can see status, scheduled time, recipient count, and cancel or delete scheduled broadcasts.
- **Scheduler Implementation**: Server-side scheduler runs every 30 seconds checking for due broadcasts. When a broadcast's scheduled time arrives, it automatically processes all recipients and sends messages.
- **Cancel/Delete API**: Added PUT `/api/broadcast/scheduled-broadcasts/:id/cancel` to cancel pending broadcasts and DELETE `/api/broadcast/scheduled-broadcasts/:id` to remove them. Proper 404 handling when broadcast not found.

## Previous Changes (December 2, 2025)
- **Real-Time Reports System**: All report pages now display real calculated data from actual system usage - no static/mock data. Campaign reports show performance by campaign with sent/delivered/read/replied metrics. Delivery reports provide daily/hourly breakdowns with delivery rates and failure tracking.
- **Report API Endpoints**: Added `/api/reports/campaigns` and `/api/reports/delivery` endpoints that calculate metrics from messages, campaigns, and broadcast_logs collections with configurable date ranges.
- **WhatsApp Leads Page**: New inbox page for managing messages from unknown contacts (not in contact list). Unlike the 24-Hour Window, there's no expiration constraint. Supports the same features as other inbox pages including bulk messaging, AI agent assignment, and conversation management.
- **Pre-filled Text Mappings**: New feature to automatically assign AI agents based on what unknown users first text. When a new contact sends a message matching a pre-filled text pattern, the assigned AI agent will automatically respond and handle the conversation.
- **Backend Pre-filled Text API**: MongoDB collection `prefilled_text_mappings` stores text-to-agent mappings. Webhook checks for matches before falling back to lead-form or active agents.
- **Message Alignment Fix**: Fixed message alignment bug so outbound messages appear on the right and inbound messages on the left in all inbox pages.

## Previous Changes (November 29, 2025)
- **Auto-Reply Control**: After sending a "Thanks for your feedback" auto-reply to button responses, the AI will not automatically respond to subsequent messages. Users must manually select an agent in the 24-Hour Window Inbox to re-enable AI responses for that contact. This prevents unwanted automated follow-ups.
- **AI Model Options**: Added more OpenAI model options with friendly display names (Bot 1 through Bot 4). Bot 1 is gpt-4o (Most Intelligent), Bot 2 is gpt-4o-mini (Smart & Fast), Bot 3 is gpt-4-turbo (Premium), Bot 4 is gpt-3.5-turbo (Economy). Default model is Bot 1.
- **AI Agent Persistence Per Contact**: Implemented contact-to-agent assignment system. When an AI agent is selected to respond in the 24-Hour Window Inbox, that agent is now permanently assigned to the contact. All subsequent webhook responses use the assigned agent with full conversation history. Uses MongoDB `contact_agents` collection to persist assignments.
- **Conversation History for AI Agents**: AI agents now receive past conversation history when generating responses. The system stores up to 20 messages per contact-agent assignment in MongoDB, ensuring context-aware responses. Webhook handler checks for assigned agents first, then falls back to lead-form mapping.
- **Notification Sound Fix**: Improved audio unlock logic to mark audio as unlocked immediately after user interaction (click/keydown/touchstart), regardless of whether the initial play() succeeds. This ensures notification beeps work even on browsers with strict autoplay restrictions.
- **AI Agent Instructions Fix**: Fixed field mismatch between MongoDB schema and application code. MongoDB now stores both `systemPrompt` and `instructions` fields, with the OpenAI service supporting fallback from `systemPrompt` to `instructions` for backward compatibility. Agents now correctly follow their configured instructions.
- **24-Hour Window Inbox Contact Names**: Fixed contact name enrichment to properly display imported contact names instead of auto-generated "WhatsApp XXX" names. The fix filters out auto-generated names when building the phone-to-name lookup maps, allowing real names from imported contacts to be displayed via last-10-digit phone matching.
- **AI Agent Reports**: Fixed date formatting to safely handle invalid/undefined timestamps, preventing runtime errors.
- **Facebook Lead Forms Sync**: Enhanced form lookup to search by both internal ID and Facebook Form ID, resolving "form not found" errors during lead synchronization.