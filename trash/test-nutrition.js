// Test the calculateNutritionForServing function
const testNutriments = {
    'energy-kcal_100g': 539,
    'proteins_100g': 6,
    'carbohydrates_100g': 57,
    'fat_100g': 31,
    'fiber_100g': 6,
    'sugars_100g': 56,
    'sodium_100g': 0.107,
    'salt_100g': 0.269,
    'saturated-fat_100g': 10.6
};

function calculateNutritionForServing(nutriments, amount, unit) {
    if (!nutriments) return { 
        energy: 0, 
        protein: 0, 
        carbohydrates: 0, 
        fat: 0, 
        fiber: 0, 
        sugar: 0, 
        sodium: 0, 
        salt: 0, 
        saturatedFat: 0 
    };
    
    // Convert to grams for calculation
    let gramsAmount = amount;
    if (unit === 'oz') gramsAmount = amount * 28.35;
    else if (unit === 'cup') gramsAmount = amount * 240;
    else if (unit === 'ml') gramsAmount = amount;
    
    const ratio = gramsAmount / 100;
    
    return {
        energy: Math.round((nutriments['energy-kcal_100g'] || nutriments.energy_100g || 0) * ratio),
        protein: Math.round((nutriments.proteins_100g || 0) * ratio * 10) / 10,
        carbohydrates: Math.round((nutriments.carbohydrates_100g || 0) * ratio * 10) / 10,
        fat: Math.round((nutriments.fat_100g || 0) * ratio * 10) / 10,
        fiber: Math.round((nutriments.fiber_100g || 0) * ratio * 10) / 10,
        sugar: Math.round((nutriments.sugars_100g || 0) * ratio * 10) / 10,
        sodium: Math.round((nutriments.sodium_100g || 0) * ratio * 100) / 100,
        salt: Math.round((nutriments.salt_100g || 0) * ratio * 100) / 100,
        saturatedFat: Math.round((nutriments['saturated-fat_100g'] || 0) * ratio * 10) / 10
    };
}

const result = calculateNutritionForServing(testNutriments, 20, 'g');
console.log('Calculated nutrition for 20g serving:');
console.log(JSON.stringify(result, null, 2));
console.log('Energy value:', result.energy);
console.log('Energy type:', typeof result.energy);
