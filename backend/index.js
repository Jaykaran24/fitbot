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
const { validateSignup, validateLogin, validateProfile, validateChat, validateFoodLog, validateNutritionGoals } = require('./middleware/validation');

const User = require('./models/User');
const ChatLog = require('./models/ChatLog');
const { FoodEntry, NutritionGoal } = require('./models/Food');
const { getOpenRouterReply } = require('./services/openrouter');
const { searchFood, getFoodDetails, calculateServingNutrition } = require('./services/openFoodFacts');
const { initializeLocalDatabase } = require('./services/localFoodDatabase');

// Import monitoring
const HealthCheckService = require('./monitoring/healthCheck');
const metricsCollector = require('./monitoring/metrics');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Initialize local food database
initializeLocalDatabase();

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
        "'unsafe-inline'" // Allow all inline script attributes for testing
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

// Enable CORS for all routes with permissive settings for deployment
app.use(cors({
  origin: true, // Allow all origins during initial deployment
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
}));

// Additional CORS headers for preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// General rate limiting
app.use(generalLimiter);

// Metrics collection middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    metricsCollector.recordRequest(req.method, req.route?.path || req.path, res.statusCode, responseTime);
  });
  
  next();
});

app.use(bodyParser.json({ limit: '10mb' }));

// Initialize Fit Bot AI
const fitBot = new FitBotAI();

// API root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'FitBot Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      chat: '/api/chat',
      food: '/api/food',
      nutrition: '/api/nutrition',
      health: '/health'
    }
  });
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
    
    // Track metrics
    metricsCollector.recordUserSignup();
    
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
    
    // Track metrics
    metricsCollector.recordUserLogin();
    
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
  const startTime = Date.now();
  console.log('=====================================');
  console.log(`🚀 New Chat Request - ${new Date().toISOString()}`);
  
  try {
    const { message, userData, useExternalAI } = req.body;
    console.log(`📝 Message: "${message}"`);
    console.log(`🔧 External AI Enabled: ${useExternalAI !== false}`);
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Track metrics
    metricsCollector.recordChatRequest();

    const shouldUseExternal = useExternalAI !== false;
    let source = 'local';
    let reply;

    // If external AI is enabled, bypass local AI and go directly to OpenRouter
    if (shouldUseExternal) {
      console.log('🌐 External AI enabled - bypassing local AI, going directly to OpenRouter');
      console.log(`📝 User Message: "${message}"`);
      console.log(`👤 User Profile:`, userData || req.user.profile || {});
      
      try {
        const openRouterReply = await getOpenRouterReply(message, userData || req.user.profile || {});
        if (openRouterReply) {
          console.log(`✅ OpenRouter Success - Response received: "${openRouterReply}"`);
          reply = openRouterReply;
          source = 'openrouter';
        } else {
          console.log('⚠️ OpenRouter returned empty response, falling back to local AI');
          reply = fitBot.processMessage(message, userData || req.user.profile || {});
        }
      } catch (apiError) {
        console.error('❌ OpenRouter API error:', apiError.message);
        console.log('🔄 Falling back to local AI response');
        reply = fitBot.processMessage(message, userData || req.user.profile || {});
      }
    } else {
      // External AI disabled - use local AI only
      console.log('🚫 External AI disabled - using local AI only');
      reply = fitBot.processMessage(message, userData || req.user.profile || {});
      console.log(`💭 Local AI Response: "${reply}"`);
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
    
    // Final response logging
    console.log(`📤 Final Response (${source}): "${reply}"`);
    console.log(`⏱️ Chat completion time: ${Date.now() - startTime} ms`);
    console.log('=====================================');
    
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

// Food API endpoints

// Test food search without authentication (for debugging)
app.post('/api/food/search/test', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }
    
    const foods = await searchFood(query.trim(), parseInt(limit));
    res.json({ products: foods });
  } catch (error) {
    console.error('Food search test error:', error);
    res.status(500).json({ error: 'Failed to search food database', details: error.message });
  }
});

// Search for food products
app.post('/api/food/search', verifyToken, async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }
    
    // Track metrics
    metricsCollector.recordFoodSearch();
    
    const foods = await searchFood(query.trim(), parseInt(limit));
    res.json({ products: foods }); // Changed to match frontend expectation
  } catch (error) {
    console.error('Food search error:', error);
    res.status(500).json({ error: 'Failed to search food database' });
  }
});

// Get detailed food information
app.get('/api/food/:barcode', verifyToken, async (req, res) => {
  try {
    const { barcode } = req.params;
    const food = await getFoodDetails(barcode);
    res.json({ food });
  } catch (error) {
    console.error('Food details error:', error);
    if (error.message === 'Product not found') {
      res.status(404).json({ error: 'Food product not found' });
    } else {
      res.status(500).json({ error: 'Failed to get food details' });
    }
  }
});

// Log food entry
app.post('/api/food/log', verifyToken, validateFoodLog, async (req, res) => {
  try {
    const { foodId, foodName, brand, imageUrl, mealType, servingAmount, servingUnit, nutrition } = req.body;
    
    if (!foodName || !mealType || !servingAmount || !nutrition) {
      return res.status(400).json({ 
        error: 'Required fields: foodName, mealType, servingAmount, nutrition' 
      });
    }
    
    const foodEntry = new FoodEntry({
      userId: req.user._id,
      date: new Date(),
      mealType,
      food: {
        id: foodId,
        name: foodName,
        brand: brand || '',
        imageUrl: imageUrl || null
      },
      nutrition,
      servingSize: {
        amount: servingAmount,
        unit: servingUnit || 'g'
      }
    });
    
    await foodEntry.save();
    
    // Track metrics
    metricsCollector.recordFoodEntry();
    
    res.json({ message: 'Food logged successfully', entry: foodEntry });
  } catch (error) {
    console.error('Food logging error:', error);
    res.status(500).json({ error: 'Failed to log food entry' });
  }
});

// Get daily food log
app.get('/api/food/log/:date?', verifyToken, async (req, res) => {
  try {
    const date = req.params.date ? new Date(req.params.date) : new Date();
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    const entries = await FoodEntry.find({
      userId: req.user._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: 1 });
    
    // Calculate daily totals
    const dailyTotals = entries.reduce((totals, entry) => {
      totals.energy += entry.nutrition.energy || 0;
      totals.protein += entry.nutrition.protein || 0;
      totals.fat += entry.nutrition.fat || 0;
      totals.carbohydrates += entry.nutrition.carbohydrates || 0;
      totals.fiber += entry.nutrition.fiber || 0;
      totals.sugar += entry.nutrition.sugar || 0;
      totals.sodium += entry.nutrition.sodium || 0;
      return totals;
    }, {
      energy: 0,
      protein: 0,
      fat: 0,
      carbohydrates: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    });
    
    // Group by meal type
    const mealGroups = {
      breakfast: entries.filter(e => e.mealType === 'breakfast'),
      lunch: entries.filter(e => e.mealType === 'lunch'),
      dinner: entries.filter(e => e.mealType === 'dinner'),
      snack: entries.filter(e => e.mealType === 'snack')
    };
    
    res.json({ 
      date: startOfDay.toISOString().split('T')[0],
      dailyTotals,
      mealGroups,
      totalEntries: entries.length
    });
  } catch (error) {
    console.error('Food log retrieval error:', error);
    res.status(500).json({ error: 'Failed to get food log' });
  }
});

// Set nutrition goals
app.post('/api/nutrition/goals', verifyToken, validateNutritionGoals, async (req, res) => {
  try {
    const { calories, protein, fat, carbohydrates, fiber, sodium, goalType, weeklyWeightGoal } = req.body;
    
    if (!calories) {
      return res.status(400).json({ error: 'Daily calorie goal is required' });
    }
    
    const goals = await NutritionGoal.findOneAndUpdate(
      { userId: req.user._id },
      {
        dailyGoals: { calories, protein, fat, carbohydrates, fiber, sodium },
        goalType: goalType || 'maintain',
        weeklyWeightGoal: weeklyWeightGoal || 0,
        activityLevel: req.user.profile?.activityLevel || 'moderatelyActive'
      },
      { upsert: true, new: true }
    );
    
    res.json({ message: 'Nutrition goals updated successfully', goals });
  } catch (error) {
    console.error('Nutrition goals error:', error);
    res.status(500).json({ error: 'Failed to update nutrition goals' });
  }
});

// Get nutrition goals
app.get('/api/nutrition/goals', verifyToken, async (req, res) => {
  try {
    const goals = await NutritionGoal.findOne({ userId: req.user._id });
    
    if (!goals) {
      // Calculate default goals based on user profile
      if (req.user.profile) {
        const { weight, height, age, gender, activityLevel } = req.user.profile;
        const fitBot = new FitBotAI();
        const bmr = fitBot.calculateBMR(weight, height, age, gender);
        const dailyCalories = fitBot.calculateDailyCalories(bmr, activityLevel);
        
        const defaultGoals = {
          calories: dailyCalories,
          protein: Math.round(weight * 1.6), // 1.6g per kg
          fat: Math.round(dailyCalories * 0.25 / 9), // 25% of calories
          carbohydrates: Math.round((dailyCalories - (weight * 1.6 * 4) - (dailyCalories * 0.25)) / 4),
          fiber: 25, // General recommendation
          sodium: 2300 // mg, general recommendation
        };
        
        return res.json({ 
          dailyGoals: defaultGoals,
          goalType: 'maintain',
          weeklyWeightGoal: 0,
          activityLevel,
          isDefault: true
        });
      }
      
      return res.status(404).json({ error: 'No nutrition goals set and no profile available' });
    }
    
    res.json(goals);
  } catch (error) {
    console.error('Get nutrition goals error:', error);
    res.status(500).json({ error: 'Failed to get nutrition goals' });
  }
});

// Get daily nutrition summary
app.get('/api/nutrition/daily/:date?', verifyToken, async (req, res) => {
  try {
    const date = req.params.date ? new Date(req.params.date) : new Date();
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    const entries = await FoodEntry.find({
      userId: req.user._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: 1 });
    
    // Calculate daily totals
    const totalNutrition = entries.reduce((totals, entry) => {
      totals.energy += entry.nutrition.energy || 0;
      totals.protein += entry.nutrition.protein || 0;
      totals.fat += entry.nutrition.fat || 0;
      totals.carbohydrates += entry.nutrition.carbohydrates || 0;
      totals.fiber += entry.nutrition.fiber || 0;
      totals.sugar += entry.nutrition.sugar || 0;
      totals.sodium += entry.nutrition.sodium || 0;
      return totals;
    }, {
      energy: 0,
      protein: 0,
      fat: 0,
      carbohydrates: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    });
    
    // Group by meal type with foods and calories
    const mealBreakdown = {
      breakfast: {
        foods: entries.filter(e => e.mealType === 'breakfast').map(e => ({
          id: e._id,
          name: e.food.name,
          calories: e.nutrition.energy || 0,
          servingSize: e.servingSize
        })),
        totalCalories: entries.filter(e => e.mealType === 'breakfast')
          .reduce((sum, e) => sum + (e.nutrition.energy || 0), 0)
      },
      lunch: {
        foods: entries.filter(e => e.mealType === 'lunch').map(e => ({
          id: e._id,
          name: e.food.name,
          calories: e.nutrition.energy || 0,
          servingSize: e.servingSize
        })),
        totalCalories: entries.filter(e => e.mealType === 'lunch')
          .reduce((sum, e) => sum + (e.nutrition.energy || 0), 0)
      },
      dinner: {
        foods: entries.filter(e => e.mealType === 'dinner').map(e => ({
          id: e._id,
          name: e.food.name,
          calories: e.nutrition.energy || 0,
          servingSize: e.servingSize
        })),
        totalCalories: entries.filter(e => e.mealType === 'dinner')
          .reduce((sum, e) => sum + (e.nutrition.energy || 0), 0)
      },
      snack: {
        foods: entries.filter(e => e.mealType === 'snack').map(e => ({
          id: e._id,
          name: e.food.name,
          calories: e.nutrition.energy || 0,
          servingSize: e.servingSize
        })),
        totalCalories: entries.filter(e => e.mealType === 'snack')
          .reduce((sum, e) => sum + (e.nutrition.energy || 0), 0)
      }
    };
    
    res.json({
      date: startOfDay.toISOString().split('T')[0],
      totalNutrition,
      mealBreakdown,
      totalEntries: entries.length
    });
  } catch (error) {
    console.error('Daily nutrition error:', error);
    res.status(500).json({ error: 'Failed to get daily nutrition data' });
  }
});

// Delete food entry
app.delete('/api/food/log/:entryId', verifyToken, async (req, res) => {
  try {
    const { entryId } = req.params;
    
    const entry = await FoodEntry.findOneAndDelete({
      _id: entryId,
      userId: req.user._id
    });
    
    if (!entry) {
      return res.status(404).json({ error: 'Food entry not found' });
    }
    
    res.json({ message: 'Food entry deleted successfully' });
  } catch (error) {
    console.error('Food entry deletion error:', error);
    res.status(500).json({ error: 'Failed to delete food entry' });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthCheck = await HealthCheckService.performHealthCheck();
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint (protected)
app.get('/metrics', verifyToken, (req, res) => {
  // Only allow admin access in production
  if (process.env.NODE_ENV === 'production' && req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.json(metricsCollector.getMetrics());
});

// Readiness probe
app.get('/ready', async (req, res) => {
  try {
    const dbCheck = await HealthCheckService.checkDatabase();
    if (dbCheck.status === 'healthy') {
      res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({ status: 'not ready', error: dbCheck.message });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

// Liveness probe
app.get('/live', (req, res) => {
  res.status(200).json({ 
    status: 'alive', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Fit Bot server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
