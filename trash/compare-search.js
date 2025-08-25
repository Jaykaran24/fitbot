const axios = require('axios');

async function compareSearchMethods() {
    try {
        console.log('Comparing different Open Food Facts search methods for "nutella"...\n');
        
        // Test 1: Current v2 API
        console.log('1. Testing v2 API (current):');
        const v2Url = 'https://world.openfoodfacts.org/api/v2/search?q=nutella&fields=code,product_name,brands&page_size=3';
        console.log('URL:', v2Url);
        
        const v2Response = await axios.get(v2Url);
        console.log('Results:', v2Response.data.products?.length || 0);
        if (v2Response.data.products?.length > 0) {
            console.log('First result:', v2Response.data.products[0].product_name);
        }
        
        // Test 2: Old search API
        console.log('\n2. Testing old search API:');
        const oldUrl = 'https://world.openfoodfacts.org/cgi/search.pl?search_terms=nutella&search_simple=1&action=process&json=1&page_size=3&fields=code,product_name,brands';
        console.log('URL:', oldUrl);
        
        const oldResponse = await axios.get(oldUrl);
        console.log('Results:', oldResponse.data.products?.length || 0);
        if (oldResponse.data.products?.length > 0) {
            console.log('First result:', oldResponse.data.products[0].product_name);
        }
        
        // Test 3: Text search parameter
        console.log('\n3. Testing v2 with different text parameter:');
        const textUrl = 'https://world.openfoodfacts.org/api/v2/search?search_terms=nutella&fields=code,product_name,brands&page_size=3';
        console.log('URL:', textUrl);
        
        const textResponse = await axios.get(textUrl);
        console.log('Results:', textResponse.data.products?.length || 0);
        if (textResponse.data.products?.length > 0) {
            console.log('First result:', textResponse.data.products[0].product_name);
        }
        
        // Test 4: Product name search
        console.log('\n4. Testing product name search:');
        const nameUrl = 'https://world.openfoodfacts.org/api/v2/search?product_name=nutella&fields=code,product_name,brands&page_size=3';
        console.log('URL:', nameUrl);
        
        const nameResponse = await axios.get(nameUrl);
        console.log('Results:', nameResponse.data.products?.length || 0);
        if (nameResponse.data.products?.length > 0) {
            console.log('First result:', nameResponse.data.products[0].product_name);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

compareSearchMethods();
