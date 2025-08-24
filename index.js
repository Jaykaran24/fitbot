require('dotenv').config({ path: './.env' });

// Validate environment variables before starting
const { validateEnvironment } = require('./utils/envValidator');
validateEnvironment();

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');

const FitBotAI = require('./fitbotAI');
const connectDB = require('./config/database');
const { generateToken, verifyToken } = require('./middleware/auth');
const { globalErrorHandler } = require('./middleware/errorHandler');
const { authLimiter, chatLimiter, generalLimiter } = require('./middleware/rateLimiting');
const { validateSignup, validateLogin, validateProfile, validateChat } = require('./middleware/validation');

const User = require('./models/User');
const ChatLog = require('./models/ChatLog');
const { getOpenRouterReply } = require('./services/openrouter');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", // Allow inline scripts for onclick handlers
        "https://cdnjs.cloudflare.com" // For Font Awesome
      ],
      scriptSrcAttr: [
        "'unsafe-hashes'",
        "'sha256-7D4OnRgLor9G48wlkm6NUsKU/p4hUGd3fwTQ6bRSkM8='", // showSignup()
        "'sha256-vs4Ai6/4DL/jsAXmXc7ATjXJvTYFX0IEXLdBMuXXVVM='", // showLogin()
        "'sha256-jLce0FJZHjAZi0FFNSt3pVWU0SFmpBBj9uwrNuFzn3Q='", // showProfile()
        "'sha256-mxqgBLcP6wgRQOjHETJ0fhNDwEJ8u2VVjo+ZlAWFeMg='", // logout()
        "'sha256-EOPWvc/cgFzQC85gXxLfaFVJT1jjcNPeN23DiNU6r+4='", // sendMessage()
        "'sha256-bfhnJg5KmK2OTc7cUTKC9uT7Dl00nAtKYNk5Tjc9Ni4='", // closeProfile()
        "'sha256-07ZIXKHMSc3Hda9x9r5CcgzKbnKgFKJbrm02nzwldi0='"  // editProfile()
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // Allow inline styles
        "https://cdnjs.cloudflare.com" // For Font Awesome
      ],
      fontSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com" // For Font Awesome fonts
      ],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// General rate limiting
app.use(generalLimiter);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Fit Bot AI
const fitBot = new FitBotAI();

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Authentication endpoints
app.post('/api/auth/signup', authLimiter, validateSignup, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user._id);
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

app.post('/api/auth/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = generateToken(user._id);
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Chat endpoint
app.post('/api/chat', chatLimiter, verifyToken, validateChat, async (req, res) => {
  try {
    const { message, userData, useExternalAI } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const shouldUseExternal = useExternalAI !== false;
    let source = 'local';

    // Process message with our offline AI
    let reply = fitBot.processMessage(message, userData || req.user.profile || {});

    // If offline AI returns default response, try OpenRouter fallback
    if (reply === fitBot.defaultResponse && shouldUseExternal) {
      try {
        const openRouterReply = await getOpenRouterReply(message, userData || req.user.profile || {});
        if (openRouterReply) {
          reply = openRouterReply;
          source = 'openrouter';
        }
      } catch (apiError) {
        console.error('OpenRouter API error:', apiError.message);
        // keep reply as default if OpenRouter fails
      }
    }
    
    // Save chat log to database
    try {
      let chatLog = await ChatLog.findOne({ userId: req.user._id });
      
      if (!chatLog) {
        chatLog = new ChatLog({ userId: req.user._id, messages: [] });
      }
      
      // Add user message
      chatLog.messages.push({
        sender: 'user',
        content: message,
        timestamp: new Date()
      });
      
      // Add bot reply
      chatLog.messages.push({
        sender: 'bot',
        content: reply,
        timestamp: new Date()
      });
      
      await chatLog.save();
    } catch (dbError) {
      console.error('Error saving chat log:', dbError);
      // Don't fail the request if chat logging fails
    }
    
    res.json({ reply, source });
  } catch (error) {
    console.error('Fit Bot AI error:', error);
    res.status(500).json({ error: 'Failed to process message.' });
  }
});

// Endpoint to set user profile
app.post('/api/profile', verifyToken, validateProfile, async (req, res) => {
  try {
    const { weight, height, age, gender, activityLevel } = req.body;
    
    // Validate required fields
    if (!weight || !height || !age || !gender || !activityLevel) {
      return res.status(400).json({ 
        error: 'All fields are required: weight (kg), height (cm), age, gender, activityLevel' 
      });
    }

    // Validate activity level
    const validActivityLevels = ['sedentary', 'lightlyActive', 'moderatelyActive', 'veryActive', 'extremelyActive'];
    if (!validActivityLevels.includes(activityLevel)) {
      return res.status(400).json({ 
        error: 'Invalid activity level. Must be one of: ' + validActivityLevels.join(', ') 
      });
    }

    // Update user profile in database
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        profile: { weight, height, age, gender, activityLevel },
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Calculate and return initial stats
    const bmi = fitBot.calculateBMI(weight, height);
    const bmr = fitBot.calculateBMR(weight, height, age, gender);
    const dailyCalories = fitBot.calculateDailyCalories(bmr, activityLevel);
    
    res.json({
      message: 'Profile updated successfully',
      profile: updatedUser.profile,
      stats: {
        bmi: parseFloat(bmi),
        dailyCalories
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get chat history
app.get('/api/chat/history', verifyToken, async (req, res) => {
  try {
    const chatLog = await ChatLog.findOne({ userId: req.user._id });
    
    if (!chatLog) {
      return res.json({ messages: [] });
    }
    
    res.json({ messages: chatLog.messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Get user profile
app.get('/api/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ profile: user.profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Fit Bot server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
