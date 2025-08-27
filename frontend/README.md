# FitBot Frontend

Web interface for FitBot AI nutrition tracking application.

## Features

- User authentication interface
- AI nutrition chat interface
- Food logging and search
- Daily nutrition dashboard
- Responsive design

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (with live reload)
npm start

# Or serve with Python
npm run serve
```

## API Configuration

The frontend connects to the backend API at:
- Development: `http://localhost:3000/api`
- Production: Configure in `script.js`

## File Structure

- `index.html` - Main application page
- `script.js` - Application logic and API calls
- `styles.css` - Application styling
- `test-food.html` - Food search testing page

## Development

The app uses vanilla HTML/CSS/JavaScript for simplicity and compatibility.

## Docker

```bash
# Build and run
docker build -t fitbot-frontend .
docker run -p 3001:80 fitbot-frontend
```

Frontend runs on http://localhost:3001
