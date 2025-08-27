# FitBot AI - Full Stack Nutrition Tracking Application

A modern, scalable AI-powered nutrition tracking application with separated frontend and backend architecture.

## 🏗️ Project Structure

```
fitbot/
├── backend/                    # API Server (Node.js + Express)
│   ├── config/                 # Database configuration
│   ├── middleware/             # Auth, validation, rate limiting
│   ├── models/                 # MongoDB models
│   ├── services/               # AI services, food APIs
│   ├── utils/                  # Utilities and validators
│   ├── monitoring/             # Health checks and metrics
│   ├── database/               # Food database files
│   └── README.md               # Backend documentation
│
├── frontend/                   # Web Interface (HTML/CSS/JS)
│   ├── index.html              # Main application UI
│   ├── script.js               # Frontend logic and API calls
│   ├── styles.css              # Application styling
│   └── README.md               # Frontend documentation
│
├── docker-compose.fullstack.yml # Full stack deployment
├── package.json                # Root project scripts
└── README.md                   # This file
```

## 🚀 Quick Start

### Development Mode (Recommended)
```bash
# Install dependencies for both services
npm run install:all

# Start both frontend and backend simultaneously
npm run dev:all
```

### Individual Services
```bash
# Backend only (API server)
npm run start:backend    # http://localhost:3000

# Frontend only (web interface)  
npm run start:frontend   # http://localhost:3001
```

### Docker Deployment
```bash
# Full stack with Docker
docker-compose -f docker-compose.fullstack.yml up --build
```

## 📱 Application URLs

- **Frontend (Web App)**: http://localhost:3001
- **Backend (API)**: http://localhost:3000
- **API Documentation**: http://localhost:3000 (JSON endpoints list)

## ✨ Features

- **User Authentication**: Secure JWT-based auth system
- **AI Nutrition Chat**: OpenRouter GPT-3.5-turbo integration
- **Food Database**: 22+ local Indian foods + OpenFoodFacts API
- **Nutrition Tracking**: Daily calorie and macro tracking
- **BMI Calculator**: Health metrics calculation
- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Live nutrition dashboard

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT + bcrypt
- **AI Integration**: OpenRouter API
- **Food Data**: OpenFoodFacts API + Local database

### Frontend  
- **Languages**: HTML5, CSS3, Vanilla JavaScript
- **Architecture**: SPA (Single Page Application)
- **Styling**: Custom CSS with responsive design
- **API Communication**: Fetch API

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start both services in development mode |
| `npm run start:backend` | Start backend API server |
| `npm run start:frontend` | Start frontend web server |
| `npm run install:all` | Install dependencies for both services |
| `npm run build` | Build for production deployment |
| `npm run up` | Start with Docker Compose |
| `npm test` | Run backend tests |

## 🔧 Configuration

### Environment Variables
Backend requires these environment variables (see `backend/.env.example`):

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
OPENROUTER_API_KEY=your-api-key
PORT=3000
```

### API Configuration
Frontend automatically connects to:
- Development: `http://localhost:3000/api`
- Production: Configure in `frontend/script.js`

## 🚢 Deployment

### Development
```bash
npm run dev:all
```

### Production (Docker)
```bash
docker-compose -f docker-compose.fullstack.yml up --build
```

### Manual Production
1. Deploy backend to Node.js hosting (Heroku, DigitalOcean, etc.)
2. Deploy frontend to static hosting (Netlify, Vercel, etc.)
3. Update frontend API URLs

## 📁 Cleanup

Unused files have been moved to `/trash` folder and can be safely deleted:
- Old configuration files
- Legacy deployment scripts  
- Development artifacts
- Phase documentation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 👨‍💻 Author

**Jay Karan Chaturvedi**
- Email: jay@example.com
- GitHub: [@0808cs231093ies-dev](https://github.com/0808cs231093ies-dev)

---

**Version**: 1.0.0  
**Last Updated**: August 27, 2025
