# WhatsApp Business API Dashboard

## Overview
A comprehensive WhatsApp Business API Dashboard designed to streamline WhatsApp Business communications. It offers over 16 functional modules, including advanced AI-powered auto-reply capabilities and seamless integration with Facebook Lead Forms. The project aims to provide businesses with a powerful tool for managing customer interactions, automating responses, and leveraging AI for lead qualification and engagement, ultimately enhancing market potential through efficient communication.

## User Preferences
I prefer clear and concise explanations. When proposing changes, please outline the impact on existing functionalities and the overall architecture. I appreciate iterative development and prefer to review changes in smaller, manageable increments. Ensure all new features are thoroughly tested and documented. Do not make changes to the folder `shared`.

## System Architecture
The application is built with a modern tech stack, featuring a React + TypeScript frontend utilizing Vite, TailwindCSS, and Shadcn/UI for a robust and responsive user interface. The backend is powered by Node.js and Express, written in TypeScript, providing a scalable API layer. Data persistence for new modular features is managed using MongoDB Atlas with Mongoose ODM. State management on the frontend is handled by React Query (TanStack Query), and UI components are built with Radix UI primitives. A visual flow builder for automation is implemented using React Flow. AI capabilities are integrated via the OpenAI GPT-4o API and Google Gemini API.

The system incorporates a modular backend structure, allowing for independent development and deployment of features such as AI Agents, Broadcast messaging, Facebook integration, and lead auto-reply systems. Key architectural decisions include:
- **UI/UX**: Emphasis on a clean, modern interface using Shadcn/UI and TailwindCSS.
- **Technical Implementations**:
    - AI Agents for automated chat responses and lead qualification, with support for OpenAI and Gemini models.
    - Integration with Facebook Lead Forms for lead ingestion and automated follow-up.
    - Visual flow builder for creating complex automation workflows.
    - Comprehensive broadcast messaging with support for various message types and scheduling.
    - Robust template management with Meta sync and approval workflows.
    - Real-time reporting and analytics for messaging, campaigns, and AI agent performance.
    - Multi-tenant SaaS architecture with secure credential isolation per user, including AES-256-GCM encryption for API keys.
    - Contact blocking system with webhook filtering.
    - Automated AI agent assignment based on pre-filled text mappings and conversation history persistence.
    - **User Management with RBAC**: Role-based access control system with four roles (Super Admin, Sub Admin, Manager, User). Admins can create users with auto-generated credentials, assign roles, and control page-level access. System users authenticate through the same login with PBKDF2 password hashing. Protected API endpoints use requireAuth and requireAdmin middleware. Email notifications are sent via Zoho SMTP when users are created or passwords are reset.
- **System Design**: The system is designed to connect to the official WhatsApp Business API, supporting webhooks for incoming messages and API calls for sending messages. An auto-reply system orchestrates the process of syncing leads, creating AI agents, mapping agents to forms, and sending personalized WhatsApp messages to leads.

## External Dependencies
- **MongoDB Atlas**: Cloud-hosted NoSQL database for data persistence.
- **OpenAI API**: For AI agent functionalities, specifically GPT-4o and other OpenAI models.
- **Google Gemini API**: For AI agent functionalities, supporting various Gemini models.
- **Facebook Graph API**: For syncing Facebook Lead Forms, managing leads, and fetching template status.
- **WhatsApp Business API**: For sending and receiving WhatsApp messages.
- **Meta Business Suite**: For syncing and approving message templates.

## Recent Changes (December 2025)
- **Gemini AI Migration**: AI agents now primarily use Google Gemini (gemini-2.5-flash) with GOOGLE_API_KEY environment variable.
- **AI Analytics Bug Fixes**: Added null safety guards to prevent crashes when phone numbers are undefined or malformed.
- **Prefilled Text Mapping Fix**: Aligned MongoDB schema field from `text` to `prefilledText` to match service layer.
- **WhatsApp Type Safety**: Fixed type errors in controller/service for userId handling with proper null checks.
- **Contact Analytics**: System tracks 112+ contacts with interest level classification (interested/neutral/not interested).