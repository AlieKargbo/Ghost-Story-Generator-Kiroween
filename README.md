# Ghost Story Generator

An interactive web application that enables collaborative storytelling with an AI co-author and dynamic atmospheric audio generation.

### AI Horror Generation
The AI analyzes your story context and generates contextually-relevant horror elements:
```typescript
const horrorElement = await aiCoAuthor.generateHorrorElement(context);
// "The door they had just entered through was now bricked up..."
```
### Dynamic Audio
Audio responds to story keywords and mood:
```typescript
audioEngine.analyzeMood(text);  // Detects: horror, tense, calm
audioEngine.detectSoundEffects(text);  // Triggers: scream, thunder, etc.
audioEngine.updateSoundscape(moodTags);  // Adjusts ambient layers
```

### Offline Resilience
```typescript
// Queue segments when offline
if (!socket.connected) {
  offlineQueue.enqueue(sessionId, content);
}
// Auto-sync when reconnected
onReconnect(() => offlineQueue.syncAll());
```

## Project Structure

```
ghost-story-generator/
├── backend/              # Node.js/Express backend server
│   ├── src/
│   │   ├── models/      # Data models
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic services
│   │   ├── types/       # TypeScript type definitions
│   │   ├── utils/       # Utility functions
│   │   └── __tests__/   # Backend tests
│   └── package.json
├── frontend/            # React frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # Frontend services
│   │   ├── hooks/       # Custom React hooks
│   │   ├── assets/      # Static assets
│   │   └── __tests__/   # Frontend tests
│   └── package.json
└── shared/              # Shared types and interfaces
    └── types.ts
```

## Current Architecture

**Storage:** In-memory (sessions reset on server restart)
**Production TODO:** Integrate DatabaseRepository for persistence

```
┌─────────────┐      WebSocket      ┌─────────────┐
│   Frontend  │◄───────────────────►│   Backend   │
│   (React)   │                     │  (Express)  │
└─────────────┘                     └─────────────┘
       │                                    │
       ▼                                    ▼
┌─────────────┐                     ┌─────────────┐
│ Audio Engine│                     │ AI Co-Author│
│  (Tone.js)  │                     │  (OpenAI)   │
└─────────────┘                     └─────────────┘
```

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express
- **WebSocket**: Socket.io
- **Database**: PostgreSQL (pg)
- **Cache**: Redis (ioredis)
- **Testing**: Jest, fast-check (property-based testing)
- **Build**: TypeScript Compiler (tsc)

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Audio**: Tone.js (Web Audio API abstraction)
- **WebSocket**: Socket.io-client
- **Testing**: Jest, fast-check, React Testing Library

### Code Quality
- **Linting**: ESLint with Airbnb style guide
- **Formatting**: Prettier (2-space indentation)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL
- Redis

### Installation

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

### Development

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

### Testing

Run backend tests:
```bash
cd backend
npm test
```

Run frontend tests:
```bash
cd frontend
npm test
```

### Building for Production

Build backend:
```bash
cd backend
npm run build
```

Build frontend:
```bash
cd frontend
npm run build
```

## Features

- **Collaborative Storytelling**: Multiple users can contribute to a ghost story in real-time
- **AI Co-Author**: AI periodically adds unexpected horror elements to keep the narrative engaging
- **Dynamic Audio**: Atmospheric sounds that respond to story content and mood
- **Real-time Synchronization**: WebSocket-based real-time updates for all participants
- **Story Export**: Export completed stories in text or HTML format

## License

ISC

## 👏 Acknowledgments

Built for the Kiroween 2025 Hackathon