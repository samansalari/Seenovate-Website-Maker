# Dyad Web Server

Backend API server for the web deployment of Dyad on Railway.

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database

### Local Development

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your database URL and API keys:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/dyad
   JWT_SECRET=your-secret-key
   OPENAI_API_KEY=sk-...
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run migrations:
   ```bash
   npm run db:migrate
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

Server runs at http://localhost:3001

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)

### Apps
- `GET /api/apps` - List user's apps
- `POST /api/apps` - Create new app
- `GET /api/apps/:id` - Get app details
- `PATCH /api/apps/:id` - Update app
- `DELETE /api/apps/:id` - Delete app
- `POST /api/apps/:id/favorite` - Toggle favorite

### Chats
- `GET /api/chats/app/:appId` - List chats for an app
- `POST /api/chats` - Create new chat
- `GET /api/chats/:id` - Get chat with messages
- `PATCH /api/chats/:id` - Update chat
- `DELETE /api/chats/:id` - Delete chat

### Streaming
- `POST /api/stream/:chatId` - Stream AI response (SSE)

### Settings
- `GET /api/settings` - Get user settings
- `PATCH /api/settings` - Update settings
- `GET /api/settings/providers` - List available AI providers

### Files
- `GET /api/files/app/:appId` - List app files
- `GET /api/files/app/:appId/*` - Read file
- `PUT /api/files/app/:appId/*` - Write file
- `DELETE /api/files/app/:appId/*` - Delete file

### Prompts
- `GET /api/prompts` - List prompts
- `POST /api/prompts` - Create prompt
- `GET /api/prompts/:id` - Get prompt
- `PATCH /api/prompts/:id` - Update prompt
- `DELETE /api/prompts/:id` - Delete prompt

## Railway Deployment

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-set with Railway Postgres addon)
- `JWT_SECRET` - Secret for JWT tokens (generate a secure random string)
- `PORT` - Server port (auto-set by Railway)

### Optional Environment Variables (at least one AI provider required)
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key  
- `GOOGLE_API_KEY` - Google AI API key

### Storage
Configure a Railway Volume mounted at `/app/data` for persistent file storage.

## Database

Uses PostgreSQL with Drizzle ORM. Migrations run automatically on server start.

To generate new migrations after schema changes:
```bash
npm run db:generate
```

## Architecture

This server provides the backend functionality that was previously handled by Electron IPC:
- Express REST API endpoints
- Server-Sent Events (SSE) for AI streaming
- PostgreSQL for data persistence
- File storage abstraction for Railway volumes
- JWT-based authentication

