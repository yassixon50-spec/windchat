# Windchat

Real-time messaging application built with React, Node.js, Socket.io, and PostgreSQL.

## Features

- 💬 Real-time messaging with Socket.io
- 👥 Private and group chats
- 📎 File uploads (images, videos, audio, documents)
- 🎤 Voice and video messages
- 😀 Emoji and GIF support
- 🔔 Push notifications
- 🌙 Dark/Light theme
- 📱 Mobile responsive
- 🔒 JWT authentication

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Socket.io Client
- React Router

**Backend:**
- Node.js + Express
- TypeScript
- Socket.io
- Prisma ORM
- PostgreSQL
- JWT Authentication

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Development Setup

1. **Clone the repository**
```bash
git clone <repo-url>
cd windchat
```

2. **Start PostgreSQL** (using Docker)
```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. **Setup Server**
```bash
cd server
cp .env.example .env
# Edit .env with your settings
npm install
npm run generate
npm run migrate
npm run dev
```

4. **Setup Client** (new terminal)
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

5. Open http://localhost:5173

### Production Deployment

**Using Docker Compose:**
```bash
# Copy and edit environment file
cp .env.example .env
# Edit .env with production values

# Build and start
docker-compose up -d --build
```

**Manual Deployment:**

Server:
```bash
cd server
npm ci
npm run build
npm run migrate:prod
npm run start:prod
```

Client:
```bash
cd client
npm ci
npm run build
# Serve dist/ folder with nginx or any static server
```

## Environment Variables

### Server (.env)
```
DATABASE_URL=postgresql://user:pass@host:5432/windchat
JWT_SECRET=your-secret-min-32-chars
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.com
```

### Client (.env)
```
VITE_API_URL=https://api.your-domain.com/api
VITE_SOCKET_URL=https://api.your-domain.com
```

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `GET /api/chats` - Get user's chats
- `POST /api/chats` - Create private chat
- `POST /api/chats/group` - Create group chat
- `GET /api/chats/:id/messages` - Get messages
- `POST /api/chats/:id/messages` - Send message
- `POST /api/upload` - Upload file
- `GET /api/users/search` - Search users

## License

MIT
