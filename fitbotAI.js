class FitBotAI {
  constructor() {
    this.activityLevels = {
      sedentary: { multiplier: 1.2, description: 'Little or no exercise' },
      lightlyActive: { multiplier: 1.375, description: 'Light exercise 1-3 days/week' },
      moderatelyActive: { multiplier: 1.55, description: 'Moderate exercise 3-5 days/week' },
      veryActive: { multiplier: 1.725, description: 'Hard exercise 6-7 days/week' },
      extremelyActive: { multiplier: 1.9, description: 'Very hard exercise, physical job' }
    };

    this.bmiCategories = {
      underweight: { min: 0, max: 18.5, advice: 'Focus on healthy weight gain' },
      normal: { min: 18.5, max: 24.9, advice: 'Maintain current healthy weight' },
      overweight: { min: 25, max: 29.9, advice: 'Focus on gradual weight loss' },
      obese: { min: 30, max: 100, advice: 'Focus on significant weight loss and health improvement' }
    };

    this.defaultResponse = 'I\'m here to help with your nutrition and fitness goals! You can ask me about BMI calculation, nutrition advice, activity levels, or general fitness tips. What would you like to know?';
  }

  // Calculate BMI
  calculateBMI(weight, height) {
    const heightInMeters = height / 100; // Convert cm to meters
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
  }

  // Get BMI category
  getBMICategory(bmi) {
    for (const [category, range] of Object.entries(this.bmiCategories)) {
      if (bmi >= range.min && bmi <= range.max) {
        return category;
      }
    }
    return 'normal';
  }

  // Calculate BMR using Mifflin-St Jeor Equation
  calculateBMR(weight, height, age, gender) {
    const baseBMR = 10 * weight + 6.25 * height - 5 * age;
    return gender.toLowerCase() === 'male' ? baseBMR + 5 : baseBMR - 161;
  }

  // Calculate daily calorie needs
  calculateDailyCalories(bmr, activityLevel) {
    const multiplier = this.activityLevels[activityLevel]?.multiplier || 1.2;
    return Math.round(bmr * multiplier);
  }

  // Generate nutrition advice based on BMI and activity
  generateNutritionAdvice(bmi, activityLevel, weight, height, age, gender) {
    const bmr = this.calculateBMR(weight, height, age, gender);
    const dailyCalories = this.calculateDailyCalories(bmr, activityLevel);
    const bmiCategory = this.getBMICategory(bmi);
    
    let advice = {
      dailyCalories,
      bmr,
      bmiCategory,
      recommendations: []
    };

    // Protein recommendations (1.2-2.2g per kg based on activity)
    const proteinMultiplier = activityLevel === 'sedentary' ? 1.2 : 
      activityLevel === 'lightlyActive' ? 1.4 :
        activityLevel === 'moderatelyActive' ? 1.6 :
          activityLevel === 'veryActive' ? 1.8 : 2.2;
    const proteinGrams = Math.round(weight * proteinMultiplier);
    advice.recommendations.push(`Protein: ${proteinGrams}g per day (${Math.round(proteinGrams * 4)} calories)`);

    // Fat recommendations (20-35% of total calories)
    const fatCalories = Math.round(dailyCalories * 0.25); // 25% as default
    const fatGrams = Math.round(fatCalories / 9);
    advice.recommendations.push(`Fat: ${fatGrams}g per day (${fatCalories} calories)`);

    // Carbohydrate recommendations (remaining calories)
    const carbCalories = dailyCalories - (proteinGrams * 4) - fatCalories;
    const carbGrams = Math.round(carbCalories / 4);
    advice.recommendations.push(`Carbohydrates: ${carbGrams}g per day (${carbCalories} calories)`);

    // BMI-specific advice
    switch (bmiCategory) {
    case 'underweight':
      advice.recommendations.push('Focus on nutrient-dense foods like nuts, avocados, and lean proteins');
      advice.recommendations.push('Consider adding healthy snacks between meals');
      break;
    case 'normal':
      advice.recommendations.push('Maintain a balanced diet with plenty of fruits and vegetables');
      advice.recommendations.push('Stay hydrated with at least 8 glasses of water daily');
      break;
    case 'overweight':
      advice.recommendations.push('Create a moderate calorie deficit (300-500 calories below maintenance)');
      advice.recommendations.push('Focus on whole foods and limit processed foods');
      break;
    case 'obese':
      advice.recommendations.push('Work with a healthcare provider for a safe weight loss plan');
      advice.recommendations.push('Start with small, sustainable changes to diet and activity');
      break;
    }

    // Activity-specific advice
    if (activityLevel === 'sedentary') {
      advice.recommendations.push('Start with 10-15 minutes of daily walking');
      advice.recommendations.push('Consider standing desk or regular movement breaks');
    } else if (activityLevel === 'veryActive' || activityLevel === 'extremelyActive') {
      advice.recommendations.push('Ensure adequate recovery with proper sleep and nutrition');
      advice.recommendations.push('Consider electrolyte replacement during intense workouts');
    }

    return advice;
  }

  // Process user message and generate response
  processMessage(message, userData = {}) {
    const lowerMessage = message.toLowerCase();
    
    // Check for greetings
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return 'Hello! I\'m Fit Bot, your personal nutrition and fitness assistant. I can help you track your daily nutrient intake and provide personalized advice based on your BMI and activity level. What would you like to know?';
    }

    // Check for BMI calculation request
    if (lowerMessage.includes('bmi') || lowerMessage.includes('calculate')) {
      if (userData.weight && userData.height) {
        const bmi = this.calculateBMI(userData.weight, userData.height);
        const category = this.getBMICategory(bmi);
        return `Your BMI is ${bmi} (${category}). ${this.bmiCategories[category].advice}`;
      } else {
        return 'I need your weight (in kg) and height (in cm) to calculate your BMI. Please provide these details.';
      }
    }

    // Check for nutrition advice
    if (lowerMessage.includes('nutrition') || lowerMessage.includes('diet') || lowerMessage.includes('calories') || lowerMessage.includes('advice')) {
      if (userData.weight && userData.height && userData.age && userData.gender && userData.activityLevel) {
        const bmi = this.calculateBMI(userData.weight, userData.height);
        const advice = this.generateNutritionAdvice(bmi, userData.activityLevel, userData.weight, userData.height, userData.age, userData.gender);
        
        let response = 'Based on your profile:\n';
        response += `• Daily calorie needs: ${advice.dailyCalories} calories\n`;
        response += `• BMI: ${bmi} (${advice.bmiCategory})\n\n`;
        response += 'Recommendations:\n';
        advice.recommendations.forEach(rec => {
          response += `• ${rec}\n`;
        });
        
        return response;
      } else {
        return 'I need your complete profile (weight, height, age, gender, and activity level) to provide personalized nutrition advice. Please provide these details.';
      }
    }

    // Check for activity level information
    if (lowerMessage.includes('activity') || lowerMessage.includes('exercise')) {
      let response = 'Activity levels and their multipliers:\n';
      for (const [level, info] of Object.entries(this.activityLevels)) {
        response += `• ${level}: ${info.description} (${info.multiplier}x BMR)\n`;
      }
      return response;
    }

    // Check for help
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return 'I can help you with:\n• Calculate your BMI\n• Provide personalized nutrition advice\n• Explain activity levels\n• Track your daily nutrient intake\n\nJust ask me about any of these topics!';
    }

    // Default response
    return this.defaultResponse;
  }
}

module.exports = FitBotAI; 