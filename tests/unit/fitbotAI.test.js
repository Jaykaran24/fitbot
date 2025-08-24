const FitBotAI = require('../../fitbotAI');

describe('FitBotAI', () => {
  let fitBot;

  beforeEach(() => {
    fitBot = new FitBotAI();
  });

  describe('calculateBMI', () => {
    test('should calculate BMI correctly', () => {
      const bmi = fitBot.calculateBMI(70, 175);
      expect(bmi).toBe('22.9');
    });

    test('should handle edge cases', () => {
      const bmi = fitBot.calculateBMI(50, 150);
      expect(bmi).toBe('22.2');
    });
  });

  describe('calculateBMR', () => {
    test('should calculate BMR for male', () => {
      const bmr = fitBot.calculateBMR(70, 175, 25, 'male');
      expect(bmr).toBe(1673.75); // 10*70 + 6.25*175 - 5*25 + 5
    });

    test('should calculate BMR for female', () => {
      const bmr = fitBot.calculateBMR(60, 165, 25, 'female');
      expect(bmr).toBe(1345.25); // 10*60 + 6.25*165 - 5*25 - 161
    });
  });

  describe('calculateDailyCalories', () => {
    test('should calculate daily calories with activity level', () => {
      const bmr = 1500;
      const calories = fitBot.calculateDailyCalories(bmr, 'moderatelyActive');
      expect(calories).toBe(2325); // 1500 * 1.55
    });

    test('should default to sedentary for invalid activity level', () => {
      const bmr = 1500;
      const calories = fitBot.calculateDailyCalories(bmr, 'invalid');
      expect(calories).toBe(1800); // 1500 * 1.2
    });
  });

  describe('getBMICategory', () => {
    test('should categorize BMI correctly', () => {
      expect(fitBot.getBMICategory(18)).toBe('underweight');
      expect(fitBot.getBMICategory(22)).toBe('normal');
      expect(fitBot.getBMICategory(27)).toBe('overweight');
      expect(fitBot.getBMICategory(32)).toBe('obese');
    });
  });

  describe('processMessage', () => {
    test('should handle greeting messages', () => {
      const response = fitBot.processMessage('Hello');
      expect(response).toContain('Hello! I\'m Fit Bot');
    });

    test('should handle BMI calculation request with user data', () => {
      const userData = { weight: 70, height: 175 };
      const response = fitBot.processMessage('calculate my BMI', userData);
      expect(response).toContain('Your BMI is 22.9');
    });

    test('should handle BMI calculation request without user data', () => {
      const response = fitBot.processMessage('calculate my BMI');
      expect(response).toContain('I need your weight');
    });

    test('should provide help information', () => {
      const response = fitBot.processMessage('help');
      expect(response).toContain('I can help you with');
    });

    test('should return default response for unknown queries', () => {
      const response = fitBot.processMessage('random unknown query');
      expect(response).toBe(fitBot.defaultResponse);
    });
  });
});
