const { body, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Auth validation rules
const validateSignup = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Profile validation rules
const validateProfile = [
  body('weight')
    .isFloat({ min: 20, max: 300 })
    .withMessage('Weight must be between 20 and 300 kg'),
  body('height')
    .isFloat({ min: 100, max: 250 })
    .withMessage('Height must be between 100 and 250 cm'),
  body('age')
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120 years'),
  body('gender')
    .isIn(['male', 'female'])
    .withMessage('Gender must be either male or female'),
  body('activityLevel')
    .isIn(['sedentary', 'lightlyActive', 'moderatelyActive', 'veryActive', 'extremelyActive'])
    .withMessage('Invalid activity level'),
  handleValidationErrors
];

// Chat validation rules
const validateChat = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('useExternalAI')
    .optional()
    .isBoolean()
    .withMessage('useExternalAI must be a boolean'),
  handleValidationErrors
];

// Food logging validation rules
const validateFoodLog = [
  body('foodName')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Food name is required and must be less than 200 characters'),
  body('mealType')
    .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
    .withMessage('Meal type must be breakfast, lunch, dinner, or snack'),
  body('servingAmount')
    .isFloat({ min: 0.1, max: 10000 })
    .withMessage('Serving amount must be between 0.1 and 10000'),
  body('servingUnit')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Serving unit is required'),
  body('foodId')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Food ID is required'),
  body('nutrition')
    .isObject()
    .withMessage('Nutrition data is required'),
  handleValidationErrors
];

// Nutrition goals validation rules
const validateNutritionGoals = [
  body('calories')
    .isInt({ min: 800, max: 5000 })
    .withMessage('Daily calories must be between 800 and 5000'),
  body('protein')
    .optional()
    .isFloat({ min: 0, max: 500 })
    .withMessage('Protein must be between 0 and 500g'),
  body('fat')
    .optional()
    .isFloat({ min: 0, max: 300 })
    .withMessage('Fat must be between 0 and 300g'),
  body('carbohydrates')
    .optional()
    .isFloat({ min: 0, max: 800 })
    .withMessage('Carbohydrates must be between 0 and 800g'),
  body('goalType')
    .optional()
    .isIn(['maintain', 'lose', 'gain'])
    .withMessage('Goal type must be maintain, lose, or gain'),
  handleValidationErrors
];

module.exports = {
  validateSignup,
  validateLogin,
  validateProfile,
  validateChat,
  validateFoodLog,
  validateNutritionGoals,
  handleValidationErrors
};
