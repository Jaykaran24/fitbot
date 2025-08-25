const { searchFood, getFoodDetails, calculateServingNutrition } = require('../../../services/openFoodFacts');

// Mock fetch for testing
global.fetch = jest.fn();

describe('OpenFoodFacts Service', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('searchFood', () => {
    test('should search for food products successfully', async () => {
      const mockResponse = {
        products: [
          {
            code: '123456789',
            product_name: 'Test Product',
            brands: 'Test Brand',
            nutriments: {
              'energy-kcal_100g': 250,
              proteins_100g: 10,
              fat_100g: 5,
              carbohydrates_100g: 30
            }
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await searchFood('test food');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search_terms=test%20food'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('FitBot')
          })
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '123456789',
        name: 'Test Product',
        brand: 'Test Brand',
        nutrition: {
          energy: 250,
          protein: 10,
          fat: 5,
          carbohydrates: 30
        }
      });
    });

    test('should handle API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(searchFood('test')).rejects.toThrow('Failed to search food database');
    });

    test('should reject short queries', async () => {
      await expect(searchFood('a')).rejects.toThrow();
    });
  });

  describe('getFoodDetails', () => {
    test('should get detailed food information', async () => {
      const mockResponse = {
        status: 1,
        product: {
          code: '123456789',
          product_name: 'Detailed Product',
          brands: 'Brand Name',
          ingredients_text: 'Ingredient 1, Ingredient 2',
          nutrition_grades: 'b',
          nutriments: {
            'energy-kcal_100g': 300,
            proteins_100g: 15,
            fat_100g: 8,
            carbohydrates_100g: 25
          }
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getFoodDetails('123456789');

      expect(result).toMatchObject({
        id: '123456789',
        name: 'Detailed Product',
        brand: 'Brand Name',
        ingredients: 'Ingredient 1, Ingredient 2',
        nutritionGrade: 'b',
        nutrition: {
          energy: 300,
          protein: 15,
          fat: 8,
          carbohydrates: 25
        }
      });
    });

    test('should handle product not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0 })
      });

      await expect(getFoodDetails('nonexistent')).rejects.toThrow('Failed to get food details');
    });
  });

  describe('calculateServingNutrition', () => {
    test('should calculate nutrition for serving size', () => {
      const nutrition = {
        energy: 100,
        protein: 5,
        fat: 3,
        carbohydrates: 15,
        fiber: 2,
        sugar: 8,
        sodium: 200,
        salt: 0.5,
        saturatedFat: 1
      };

      const result = calculateServingNutrition(nutrition, 150); // 150g serving

      expect(result).toEqual({
        energy: 150,
        protein: 7.5,
        fat: 4.5,
        carbohydrates: 22.5,
        fiber: 3,
        sugar: 12,
        sodium: 300, // 200 * 1.5
        salt: 0.75,
        saturatedFat: 1.5
      });
    });

    test('should round values appropriately', () => {
      const nutrition = {
        energy: 123.456,
        protein: 5.789,
        fat: 3.234,
        carbohydrates: 15.678,
        fiber: 2.345,
        sugar: 8.567,
        sodium: 234.567,
        salt: 0.567,
        saturatedFat: 1.234
      };

      const result = calculateServingNutrition(nutrition, 200);

      expect(result.energy).toBe(247); // Rounded to nearest integer
      expect(result.protein).toBe(11.6); // Rounded to 1 decimal
      expect(result.sodium).toBe(469.13); // 234.567 * 2 = 469.134, rounded to 2 decimals
    });
  });
});
