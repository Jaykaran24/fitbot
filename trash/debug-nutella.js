const axios = require('axios');

async function testNutellaSearch() {
    try {
        console.log('Testing "nutella" search directly with Open Food Facts API v2...\n');
        
        // Test the exact same URL that our service is using
        const searchUrl = 'https://world.openfoodfacts.org/api/v2/search?q=nutella&fields=code,product_name,brands,nutriments,categories,image_url,serving_size,quantity&page_size=10';
        
        console.log('URL:', searchUrl);
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'FitBot/1.0.0 (https://localhost:3000; contact@fitbot.com)'
            }
        });
        
        console.log('Status:', response.status);
        console.log('Total products found:', response.data.products?.length || 0);
        console.log('\nFirst 3 products:');
        
        if (response.data.products && response.data.products.length > 0) {
            response.data.products.slice(0, 3).forEach((product, index) => {
                console.log(`\n${index + 1}. ${product.product_name}`);
                console.log(`   Brand: ${product.brands || 'Unknown'}`);
                console.log(`   Code: ${product.code}`);
                console.log(`   Categories: ${product.categories ? product.categories.split(',')[0] : 'Unknown'}`);
            });
        }
        
        // Also test with different search strategies
        console.log('\n\n--- Testing alternative search methods ---');
        
        // Test with category search
        const categoryUrl = 'https://world.openfoodfacts.org/api/v2/search?categories_tags_en=spreads&q=nutella&fields=code,product_name,brands,nutriments&page_size=5';
        console.log('\nTesting category-based search:', categoryUrl);
        
        const categoryResponse = await axios.get(categoryUrl, {
            headers: {
                'User-Agent': 'FitBot/1.0.0 (https://localhost:3000; contact@fitbot.com)'
            }
        });
        
        console.log('Category search results:', categoryResponse.data.products?.length || 0);
        if (categoryResponse.data.products && categoryResponse.data.products.length > 0) {
            categoryResponse.data.products.slice(0, 2).forEach((product, index) => {
                console.log(`${index + 1}. ${product.product_name} (${product.brands})`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
        }
    }
}

testNutellaSearch();
