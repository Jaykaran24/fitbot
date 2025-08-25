const axios = require('axios');

async function testFixedNutellaSearch() {
    try {
        console.log('Testing fixed nutella search...');
        
        const response = await axios.post('http://127.0.0.1:3000/api/food/search', {
            query: 'nutella'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODZmZGVkYzE3MjkzMDEzM2QxNjUyYzYiLCJpYXQiOjE3NTYwMzU0MTUsImV4cCI6MTc1NjY0MDIxNX0.PthFu7Wln72Hs-5eRRF8hHSgyyP1ai0IaiPiM3CqFxs'
            }
        });
        
        console.log('Status:', response.status);
        console.log('Products found:', response.data.products?.length || 0);
        
        if (response.data.products && response.data.products.length > 0) {
            console.log('\nFirst 3 results:');
            response.data.products.slice(0, 3).forEach((product, index) => {
                console.log(`${index + 1}. ${product.product_name} - ${product.brands || 'Unknown brand'}`);
            });
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testFixedNutellaSearch();
