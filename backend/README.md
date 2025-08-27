# FitBot Backend API

RESTful API server for FitBot nutrition tracking application.

## Features

- User authentication (JWT)
- AI nutrition chat (OpenRouter + local AI)
- Food database integration
- Nutrition tracking and goals
- Health monitoring endpoints
- Rate limiting and security

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## API Endpoints

- `GET /` - API information
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/chat` - AI chat
- `GET /api/food/search` - Search foods
- `POST /api/nutrition/log` - Log food entry
- `GET /health` - Health check

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `OPENROUTER_API_KEY` - OpenRouter API key

## Docker

```bash
# Build and run
docker-compose up --build
```

Server runs on http://localhost:3000
