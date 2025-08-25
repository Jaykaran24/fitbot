const axios = require('axios');

async function testNutellaBarcode() {
    try {
        console.log('Testing Nutella barcode endpoint (3017624010701)...');
        
        // Test the barcode endpoint with authentication
        const response = await axios.get('http://127.0.0.1:3000/api/food/3017624010701', {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODZmZGVkYzE3MjkzMDEzM2QxNjUyYzYiLCJpYXQiOjE3NTYwMzU0MTUsImV4cCI6MTc1NjY0MDIxNX0.PthFu7Wln72Hs-5eRRF8hHSgyyP1ai0IaiPiM3CqFxs'
            }
        });
        
        console.log('Status:', response.status);
        console.log('Product name:', response.data.food.name);
        console.log('Brand:', response.data.food.brand);
        console.log('Nutrition grade:', response.data.food.nutritionGrade);
        console.log('Calories per 100g:', response.data.food.nutrition.energy);
        
    } catch (error) {
        console.error('Test failed:');
        console.error('Message:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testNutellaBarcode();
