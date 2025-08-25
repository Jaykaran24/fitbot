const mongoose = require('mongoose');

const foodEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true
  },
  food: {
    id: String, // Open Food Facts product code
    name: {
      type: String,
      required: true
    },
    brand: String,
    imageUrl: String
  },
  nutrition: {
    energy: {
      type: Number,
      required: true
    },
    protein: Number,
    fat: Number,
    carbohydrates: Number,
    fiber: Number,
    sugar: Number,
    sodium: Number,
    salt: Number,
    saturatedFat: Number
  },
  servingSize: {
    amount: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['g', 'ml', 'oz', 'cup', 'piece', 'slice'],
      default: 'g'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
foodEntrySchema.index({ userId: 1, date: 1 });
foodEntrySchema.index({ userId: 1, mealType: 1 });

const nutritionGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  dailyGoals: {
    calories: {
      type: Number,
      required: true
    },
    protein: Number,
    fat: Number,
    carbohydrates: Number,
    fiber: Number,
    sodium: Number
  },
  goalType: {
    type: String,
    enum: ['maintain', 'lose', 'gain'],
    default: 'maintain'
  },
  weeklyWeightGoal: {
    type: Number, // kg per week (positive for gain, negative for loss)
    default: 0
  },
  activityLevel: {
    type: String,
    enum: ['sedentary', 'lightlyActive', 'moderatelyActive', 'veryActive', 'extremelyActive'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
nutritionGoalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const FoodEntry = mongoose.model('FoodEntry', foodEntrySchema);
const NutritionGoal = mongoose.model('NutritionGoal', nutritionGoalSchema);

module.exports = { FoodEntry, NutritionGoal };
