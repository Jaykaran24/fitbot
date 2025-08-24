# FitBot - AI Nutrition Assistant

FitBot is an intelligent chatbot that helps users track their daily nutrient intake and provides personalized fitness and nutrition advice based on BMI and activity levels.

## Features

- 🤖 **AI-Powered Chat**: Get personalized nutrition and fitness advice
- 📊 **BMI & BMR Calculations**: Automatic health metrics calculation
- 👤 **User Profiles**: Save personal information for customized recommendations
- 🔐 **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🚀 **External AI Integration**: Fallback to OpenRouter/DeepSeek for advanced queries

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fitbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

### Required
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens (min 32 characters)

### Optional
- `OPENROUTER_API_KEY`: For external AI fallback
- `DEEPSEEK_API_KEY`: Alternative AI service
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user

### Profile
- `POST /api/profile` - Create/update user profile
- `GET /api/profile` - Get user profile

### Chat
- `POST /api/chat` - Send message to AI assistant
- `GET /api/chat/history` - Get chat history

## Development

### Scripts
```bash
npm run dev          # Start development server with nodemon
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run lint         # Check code style
npm run lint:fix     # Fix code style issues
npm run format       # Format code with Prettier
npm run validate     # Run linting and tests
```

### Code Structure
```
fitbot/
├── config/          # Database and configuration
├── middleware/      # Express middleware (auth, validation, etc.)
├── models/          # MongoDB models
├── public/          # Static frontend files
├── services/        # External API services
├── tests/           # Test files
├── utils/           # Utility functions
├── fitbotAI.js      # Core AI logic
└── index.js         # Main server file
```

## Testing

Run the test suite:
```bash
npm test
```

For coverage report:
```bash
npm run test:coverage
```

## Security Features

- **Rate Limiting**: Prevents abuse of auth and chat endpoints
- **Input Validation**: Validates all user inputs
- **Password Security**: Bcrypt hashing with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **CORS Protection**: Configurable allowed origins
- **Helmet Security**: Security headers middleware

## Production Deployment

See `PRODUCTION_ROADMAP.md` for detailed production readiness steps.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm run validate`
4. Submit a pull request

## License

ISC License

## Support

For questions or issues, please open a GitHub issue.
