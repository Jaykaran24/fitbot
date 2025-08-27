FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy package.json
COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Create directories
RUN mkdir -p uploads logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "index.js"]
