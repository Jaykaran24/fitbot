const fs = require('fs');
require('dotenv').config({ path: './.env' });
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const FitBotAI = require('./fitbotAI');
const connectDB = require('./config/database');
const { generateToken, verifyToken } = require('./middleware/auth');
const User = require('./models/User');
const ChatLog = require('./models/ChatLog');
const { getOpenRouterReply } = require('./services/openrouter');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Fit Bot AI
const fitBot = new FitBotAI();

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Authentication endpoints
app.post('/api/auth/signup', async (req, res) => {
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

app.post('/api/auth/login', async (req, res) => {
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
app.post('/api/chat', verifyToken, async (req, res) => {
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
app.post('/api/profile', verifyToken, async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Fit Bot server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
}); 