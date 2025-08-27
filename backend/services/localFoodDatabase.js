const path = require('path');
const fs = require('fs').promises;

// Local food database loaded from CSV
let localFoodDatabase = [];

// Function to parse CSV data
function parseCSV(csvData) {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const foods = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.includes(',,,,,,') || line.includes('Breakfast & Breads') || line.includes('Main Dishes') || line.includes('Snacks & Sides')) {
            continue; // Skip empty lines and category headers
        }
        
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                values.push(currentValue.trim().replace(/"/g, ''));
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim().replace(/"/g, '')); // Add the last value
        
        if (values.length >= 6 && values[0]) { // Ensure we have all required fields
            const food = {
                id: `local_${foods.length + 1}`,
                name: values[0],
                servingSize: values[1],
                nutrition: {
                    energy: parseFloat(values[2]) || 0,
                    protein: parseFloat(values[3]) || 0,
                    carbohydrates: parseFloat(values[4]) || 0,
                    fat: parseFloat(values[5]) || 0,
                    fiber: parseFloat(values[6]) || 0,
                    sugar: 0, // Not provided in CSV
                    sodium: 0, // Not provided in CSV
                    salt: 0, // Not provided in CSV
                    saturatedFat: 0 // Not provided in CSV
                },
                source: 'local',
                category: 'Indian Food',
                brand: 'Local Database'
            };
            foods.push(food);
        }
    }
    
    return foods;
}

// Initialize the local food database
async function initializeLocalDatabase() {
    try {
        const csvPath = path.join(__dirname, '../database', 'food-database.csv');
        const csvData = await fs.readFile(csvPath, 'utf-8');
        localFoodDatabase = parseCSV(csvData);
        console.log(`✅ Local food database loaded: ${localFoodDatabase.length} items`);
        
        // Log first few items for verification
        if (localFoodDatabase.length > 0) {
            console.log('Sample local foods:', localFoodDatabase.slice(0, 3).map(f => f.name));
        }
    } catch (error) {
        console.error('❌ Error loading local food database:', error.message);
        localFoodDatabase = [];
    }
}

// Search local food database
function searchLocalFoods(query, limit = 10) {
    if (!query || query.length < 2) {
        return [];
    }
    
    const searchTerm = query.toLowerCase().trim();
    const results = localFoodDatabase.filter(food => 
        food.name.toLowerCase().includes(searchTerm)
    ).slice(0, limit);
    
    console.log(`Local search for "${query}": ${results.length} results found`);
    return results;
}

// Get food details by ID from local database
function getLocalFoodDetails(foodId) {
    const food = localFoodDatabase.find(f => f.id === foodId);
    if (!food) {
        throw new Error('Local food not found');
    }
    
    return {
        id: food.id,
        name: food.name,
        brand: food.brand,
        servingSize: food.servingSize,
        nutrition: food.nutrition,
        source: 'local',
        category: food.category
    };
}

// Calculate nutrition for custom serving size
function calculateLocalFoodNutrition(foodId, amount, unit) {
    const food = getLocalFoodDetails(foodId);
    
    // Extract numeric value from serving size (e.g., "1 cup (150g)" -> 150)
    const servingSizeMatch = food.servingSize.match(/\((\d+)g\)/);
    let baseGrams = 100; // Default to 100g
    
    if (servingSizeMatch) {
        baseGrams = parseInt(servingSizeMatch[1]);
    } else {
        // Try to extract grams from serving size text
        const gramsMatch = food.servingSize.match(/(\d+)g/);
        if (gramsMatch) {
            baseGrams = parseInt(gramsMatch[1]);
        }
    }
    
    // Convert input amount to grams
    let gramsAmount = amount;
    if (unit === 'oz') gramsAmount = amount * 28.35;
    else if (unit === 'cup') gramsAmount = amount * 240;
    else if (unit === 'ml') gramsAmount = amount;
    
    // Calculate ratio
    const ratio = gramsAmount / baseGrams;
    
    // Scale nutrition values
    const scaledNutrition = {
        energy: Math.round(food.nutrition.energy * ratio),
        protein: Math.round(food.nutrition.protein * ratio * 10) / 10,
        carbohydrates: Math.round(food.nutrition.carbohydrates * ratio * 10) / 10,
        fat: Math.round(food.nutrition.fat * ratio * 10) / 10,
        fiber: Math.round(food.nutrition.fiber * ratio * 10) / 10,
        sugar: Math.round(food.nutrition.sugar * ratio * 10) / 10,
        sodium: Math.round(food.nutrition.sodium * ratio * 100) / 100,
        salt: Math.round(food.nutrition.salt * ratio * 100) / 100,
        saturatedFat: Math.round(food.nutrition.saturatedFat * ratio * 10) / 10
    };
    
    return scaledNutrition;
}

// Format food for frontend display
function formatLocalFoodForDisplay(food) {
    return {
        id: food.id,
        product_name: food.name,
        brands: food.brand,
        image_url: null, // Local foods don't have images
        serving_size: food.servingSize,
        source: 'local',
        category: food.category,
        nutriments: {
            'energy-kcal_100g': food.nutrition.energy,
            'proteins_100g': food.nutrition.protein,
            'carbohydrates_100g': food.nutrition.carbohydrates,
            'fat_100g': food.nutrition.fat,
            'fiber_100g': food.nutrition.fiber,
            'sugars_100g': food.nutrition.sugar,
            'sodium_100g': food.nutrition.sodium,
            'salt_100g': food.nutrition.salt,
            'saturated-fat_100g': food.nutrition.saturatedFat
        }
    };
}

module.exports = {
    initializeLocalDatabase,
    searchLocalFoods,
    getLocalFoodDetails,
    calculateLocalFoodNutrition,
    formatLocalFoodForDisplay
};
