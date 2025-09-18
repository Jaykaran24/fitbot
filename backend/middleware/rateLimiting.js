const rateLimit = require('express-rate-limit');

// Auth rate limiter - 20 attempts per 10 seconds (for easy testing)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 1000, // 10 seconds
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20, // limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat rate limiter - 50 requests per 10 seconds (for easy testing)
const chatLimiter = rateLimit({
  windowMs: parseInt(process.env.CHAT_RATE_LIMIT_WINDOW_MS) || 10 * 1000, // 10 seconds
  max: parseInt(process.env.CHAT_RATE_LIMIT_MAX_REQUESTS) || 50, // limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many chat requests, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter - 200 requests per 10 seconds (for easy testing)
const generalLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  chatLimiter,
  generalLimiter,
};
