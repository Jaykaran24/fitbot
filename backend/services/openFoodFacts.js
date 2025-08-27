const axios = require('axios');
const { 
  searchLocalFoods, 
  getLocalFoodDetails, 
  calculateLocalFoodNutrition, 
  formatLocalFoodForDisplay 
} = require('./localFoodDatabase');

// Base URL for Open Food Facts (without API version)
const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org';

/**
 * Search for food products using Open Food Facts search API
 * @param {string} query - Search query (food name, brand, etc.)
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise<Array>} Array of food products
 */
async function searchFood(query, limit = 10) {
  try {
    // First search local database for Indian foods
    const localResults = searchLocalFoods(query, Math.floor(limit / 2));
    console.log(`Local search found ${localResults.length} results`);
    
    // Format local results for display
    const formattedLocalResults = localResults.map(formatLocalFoodForDisplay);
    
    // Then search Open Food Facts for international foods
    const remainingLimit = limit - localResults.length;
    let openFoodFactsResults = [];
    
    if (remainingLimit > 0) {
      const searchUrl = `${OPEN_FOOD_FACTS_BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${remainingLimit}&fields=code,product_name,brands,nutriments,categories,image_url,serving_size,quantity`;
      
      console.log('Food search URL:', searchUrl);
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'FitBot/1.0.0 (https://localhost:3000; contact@fitbot.com)'
        },
        timeout: 10000
      });

      const data = response.data;
      console.log('API Response keys:', Object.keys(data));
      console.log('Has products?', !!data.products);
      console.log('Products count:', data.products?.length || 0);
      
      if (data.products && Array.isArray(data.products)) {
        openFoodFactsResults = data.products.map(product => {
          // Ensure product and nutriments exist
          if (!product) return null;
          const nutriments = product.nutriments || {};
          
          return {
            // Keep original fields for frontend compatibility
            code: product.code,
            product_name: product.product_name || 'Unknown Product',
            brands: product.brands || 'Unknown Brand',
            categories: product.categories || '',
            image_url: product.image_url || null,
            serving_size: product.serving_size || null,
            quantity: product.quantity || null,
            nutriments: nutriments,
            source: 'openfoodfacts',
            
            // Also provide organized structure
            id: product.code,
            name: product.product_name || 'Unknown Product',
            brand: product.brands || 'Unknown Brand',
            imageUrl: product.image_url || null,
            servingSize: product.serving_size || null,
            nutrition: {
              energy: nutriments['energy-kcal_100g'] || nutriments.energy_100g || 0,
              protein: nutriments.proteins_100g || 0,
              fat: nutriments.fat_100g || 0,
              carbohydrates: nutriments.carbohydrates_100g || 0,
              fiber: nutriments.fiber_100g || 0,
              sugar: nutriments.sugars_100g || 0,
              sodium: nutriments.sodium_100g || 0,
              salt: nutriments.salt_100g || 0,
              saturatedFat: nutriments['saturated-fat_100g'] || 0
            }
          };
        }).filter(product => product !== null); // Remove any null products
      }
    }
    
    // Combine results: local foods first, then Open Food Facts
    const combinedResults = [...formattedLocalResults, ...openFoodFactsResults];
    console.log(`Combined search results: ${combinedResults.length} total (${formattedLocalResults.length} local, ${openFoodFactsResults.length} international)`);
    
    return combinedResults;
  } catch (error) {
    console.error('Error searching food:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw new Error('Failed to search food database');
  }
}

/**
 * Get detailed information about a specific food product
 * @param {string} foodId - Product barcode/ID (can be local or OpenFoodFacts)
 * @returns {Promise<Object>} Detailed product information
 */
async function getFoodDetails(foodId) {
  try {
    // Check if it's a local food (starts with 'local_')
    if (foodId.startsWith('local_')) {
      console.log('Getting local food details for:', foodId);
      return getLocalFoodDetails(foodId);
    }
    
    // Otherwise, use OpenFoodFacts API
    const detailUrl = `${OPEN_FOOD_FACTS_BASE_URL}/api/v2/product/${foodId}?fields=product_name,nutrition_grades,nutriments,brands,categories,image_url,serving_size,quantity,ingredients_text,labels`;
    
    console.log('Food details URL:', detailUrl);
    
    const response = await axios.get(detailUrl, {
      headers: {
        'User-Agent': 'FitBot/1.0.0 (https://localhost:3000; contact@fitbot.com)'
      },
      timeout: 10000
    });

    const data = response.data;
    console.log('Details API Response keys:', Object.keys(data));
    
    if (data.status === 0 || data.status === '0') {
      throw new Error('Product not found');
    }

    const product = data.product;
    
    if (!product) {
      throw new Error('Product data not available');
    }
    
    return {
      id: product.code,
      name: product.product_name || 'Unknown Product',
      brand: product.brands || 'Unknown Brand',
      categories: product.categories || '',
      imageUrl: product.image_url || null,
      servingSize: product.serving_size || null,
      quantity: product.quantity || null,
      ingredients: product.ingredients_text || null,
      nutritionGrade: product.nutrition_grades || null,
      labels: product.labels || '',
      nutrition: {
        energy: product.nutriments['energy-kcal_100g'] || product.nutriments.energy_100g || 0,
        protein: product.nutriments.proteins_100g || 0,
        fat: product.nutriments.fat_100g || 0,
        carbohydrates: product.nutriments.carbohydrates_100g || 0,
        fiber: product.nutriments.fiber_100g || 0,
        sugar: product.nutriments.sugars_100g || 0,
        sodium: product.nutriments.sodium_100g || 0,
        salt: product.nutriments.salt_100g || 0,
        saturatedFat: product.nutriments['saturated-fat_100g'] || 0
      }
    };
  } catch (error) {
    console.error('Error getting food details:', error);
    throw new Error('Failed to get food details');
  }
}

/**
 * Calculate nutrition for a specific serving size
 * @param {string} foodId - Food ID (local or OpenFoodFacts)
 * @param {number} amount - Serving amount
 * @param {string} unit - Serving unit (g, ml, oz, cup, etc.)
 * @returns {Object} Nutrition for the serving size
 */
function calculateServingNutrition(foodId, amount, unit) {
  try {
    // Check if it's a local food
    if (foodId && foodId.startsWith('local_')) {
      return calculateLocalFoodNutrition(foodId, amount, unit);
    }
    
    // For OpenFoodFacts, we need the nutrition data per 100g
    // This function should be called with the nutrition object from getFoodDetails
    // Keeping the old signature for backward compatibility
    if (typeof foodId === 'object' && foodId.energy !== undefined) {
      const nutrition = foodId;
      const servingGrams = amount;
      const factor = servingGrams / 100;
      
      return {
        energy: Math.round(nutrition.energy * factor),
        protein: Math.round(nutrition.protein * factor * 10) / 10,
        fat: Math.round(nutrition.fat * factor * 10) / 10,
        carbohydrates: Math.round(nutrition.carbohydrates * factor * 10) / 10,
        fiber: Math.round(nutrition.fiber * factor * 10) / 10,
        sugar: Math.round(nutrition.sugar * factor * 10) / 10,
        sodium: Math.round(nutrition.sodium * factor * 100) / 100,
        salt: Math.round(nutrition.salt * factor * 100) / 100,
        saturatedFat: Math.round(nutrition.saturatedFat * factor * 10) / 10
      };
    }
    
    throw new Error('Invalid parameters for nutrition calculation');
  } catch (error) {
    console.error('Error calculating serving nutrition:', error);
    throw error;
  }
}

module.exports = {
  searchFood,
  getFoodDetails,
  calculateServingNutrition
};
