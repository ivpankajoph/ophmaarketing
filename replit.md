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
- **Facebook Graph API**: For syncing Facebook Lead Forms and managing leads.
- **WhatsApp Business API**: For sending and receiving WhatsApp messages.
- **Meta Business Suite**: For syncing and approving message templates.

## Recent Changes (November 29, 2025)
- **24-Hour Window Inbox Contact Names**: Fixed contact name enrichment to properly display imported contact names instead of auto-generated "WhatsApp XXX" names. The fix filters out auto-generated names when building the phone-to-name lookup maps, allowing real names from imported contacts to be displayed via last-10-digit phone matching.
- **AI Agent Reports**: Fixed date formatting to safely handle invalid/undefined timestamps, preventing runtime errors.
- **Facebook Lead Forms Sync**: Enhanced form lookup to search by both internal ID and Facebook Form ID, resolving "form not found" errors during lead synchronization.