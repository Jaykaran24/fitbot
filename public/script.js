// Global variables
let currentUser = null;
let userProfile = null;
let useExternalAI = true;

// DOM elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const profileSetup = document.getElementById('profileSetup');
const chatInterface = document.getElementById('chatInterface');
const profileModal = document.getElementById('profileModal');

// Header controls elements (initialized after DOMContentLoaded)
let externalToggleCheckbox = null;
let quickPromptsBar = null;

// API base URL
const API_BASE = 'http://localhost:3000/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkAuthStatus();
    setupHeaderControls();
    setupQuickPrompts();
    setupNutritionGoalsForm();
});

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    
    // Signup form
    document.getElementById('signupFormElement').addEventListener('submit', handleSignup);
    
    // Profile form
    document.getElementById('profileForm').addEventListener('submit', handleProfileSetup);
    
    // Chat input
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function setupHeaderControls() {
    const headerRight = document.querySelector('.chat-header-right');
    if (!headerRight) return;
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    container.style.marginRight = '8px';

    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '6px';
    label.style.fontSize = '12px';
    label.title = 'When enabled, unknown queries may be sent to DeepSeek.';

    externalToggleCheckbox = document.createElement('input');
    externalToggleCheckbox.type = 'checkbox';
    externalToggleCheckbox.checked = true;
    externalToggleCheckbox.addEventListener('change', () => {
        useExternalAI = externalToggleCheckbox.checked;
        localStorage.setItem('fitbot_use_external_ai', JSON.stringify(useExternalAI));
    });

    const span = document.createElement('span');
    span.textContent = 'Use external AI';

    label.appendChild(externalToggleCheckbox);
    label.appendChild(span);
    container.appendChild(label);
    headerRight.insertBefore(container, headerRight.firstChild);

    const saved = localStorage.getItem('fitbot_use_external_ai');
    if (saved !== null) {
        useExternalAI = JSON.parse(saved);
        externalToggleCheckbox.checked = useExternalAI;
    }
}

function setupQuickPrompts() {
    const chatContainer = document.querySelector('.chat-container');
    if (!chatContainer) return;
    quickPromptsBar = document.createElement('div');
    quickPromptsBar.style.display = 'flex';
    quickPromptsBar.style.flexWrap = 'wrap';
    quickPromptsBar.style.gap = '8px';
    quickPromptsBar.style.padding = '8px 12px';
    quickPromptsBar.style.borderBottom = '1px solid rgba(0,0,0,0.08)';

    const prompts = [
        'What should I eat to build muscle?',
        'Create a 7-day meal plan for fat loss',
        'How many calories should I eat daily?',
        'Best protein sources for vegetarians?',
        'Beginner workout plan for 3 days/week'
    ];
    prompts.forEach((p) => {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary';
        btn.textContent = p;
        btn.style.fontSize = '12px';
        btn.style.whiteSpace = 'nowrap';
        btn.addEventListener('click', () => {
            document.getElementById('messageInput').value = p;
            sendMessage();
        });
        quickPromptsBar.appendChild(btn);
    });

    const header = document.querySelector('.chat-header');
    if (header && header.parentNode) {
        header.parentNode.insertBefore(quickPromptsBar, header.nextSibling);
    }
}

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('fitbot_token');
    const user = localStorage.getItem('fitbot_user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        // Check if user has completed profile setup
        const profile = localStorage.getItem('fitbot_profile');
        if (profile) {
            userProfile = JSON.parse(profile);
            showChatInterface();
        } else {
            showProfileSetup();
        }
    } else {
        showLogin();
    }
}

// Show different views
function showLogin() {
    hideAllViews();
    loginForm.classList.remove('hidden');
}

function showSignup() {
    hideAllViews();
    signupForm.classList.remove('hidden');
}

function showProfileSetup() {
    hideAllViews();
    profileSetup.classList.remove('hidden');
}

function showChatInterface() {
    hideAllViews();
    chatInterface.classList.remove('hidden');
    scrollToBottom();
    maybeShowProfileNudge();
}

function hideAllViews() {
    loginForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    profileSetup.classList.add('hidden');
    chatInterface.classList.add('hidden');
    profileModal.classList.add('hidden');
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('fitbot_token', data.token);
            localStorage.setItem('fitbot_user', JSON.stringify(data.user));
            currentUser = data.user;
            // Clear chat UI and local chat history
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) chatMessages.innerHTML = '';
            localStorage.removeItem('fitbot_chat_history');
            if (data.user.profile) {
                userProfile = data.user.profile;
                localStorage.setItem('fitbot_profile', JSON.stringify(data.user.profile));
                showChatInterface();
            } else {
                showProfileSetup();
            }
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

// Handle signup
async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('fitbot_token', data.token);
            localStorage.setItem('fitbot_user', JSON.stringify(data.user));
            currentUser = data.user;
            // Clear chat UI and local chat history
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) chatMessages.innerHTML = '';
            localStorage.removeItem('fitbot_chat_history');
            showProfileSetup();
        } else {
            showError(data.error || 'Signup failed');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

// Handle profile setup
async function handleProfileSetup(e) {
    e.preventDefault();
    
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const activityLevel = document.getElementById('activityLevel').value;
    
    try {
        const response = await fetch(`${API_BASE}/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('fitbot_token')}`
            },
            body: JSON.stringify({ weight, height, age, gender, activityLevel })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            userProfile = data.profile;
            localStorage.setItem('fitbot_profile', JSON.stringify(data.profile));
            showChatInterface();
        } else {
            showError(data.error || 'Profile setup failed');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

// Send message to chat
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    messageInput.value = '';
    
    // Show typing indicator
    const typingIndicator = addTypingIndicator();
    
    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('fitbot_token')}`
            },
            body: JSON.stringify({
                message,
                userData: userProfile,
                useExternalAI
            })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        typingIndicator.remove();
        
        if (response.ok) {
            addMessage(data.reply, 'bot', data.source);
        } else {
            addMessage('Sorry, I encountered an error. Please try again.', 'bot');
        }
    } catch (error) {
        typingIndicator.remove();
        addMessage('Sorry, I\'m having trouble connecting. Please check your internet connection.', 'bot');
    }
}

// Add message to chat
function addMessage(text, sender, source) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (sender === 'bot') {
        const icon = document.createElement('i');
        icon.className = 'fas fa-robot';
        messageContent.appendChild(icon);
    }
    
    const textElement = document.createElement('p');
    textElement.textContent = text;
    messageContent.appendChild(textElement);

    if (sender === 'bot' && source) {
        const badge = document.createElement('span');
        badge.textContent = source === 'deepseek' ? 'DeepSeek' : 'Local';
        badge.style.marginLeft = '8px';
        badge.style.fontSize = '11px';
        badge.style.padding = '2px 6px';
        badge.style.borderRadius = '8px';
        badge.style.background = source === 'deepseek' ? '#e3f2fd' : '#e8f5e9';
        badge.style.color = source === 'deepseek' ? '#1565c0' : '#2e7d32';
        messageContent.appendChild(badge);
    }
    
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    scrollToBottom();
}

// Add typing indicator
function addTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    typingDiv.id = 'typing-indicator';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-robot';
    messageContent.appendChild(icon);
    
    const textElement = document.createElement('p');
    textElement.innerHTML = '<span class="loading"></span> Fit Bot is typing...';
    messageContent.appendChild(textElement);
    
    typingDiv.appendChild(messageContent);
    chatMessages.appendChild(typingDiv);
    
    scrollToBottom();
    return typingDiv;
}

// Scroll to bottom of chat
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show profile modal
function showProfile() {
    if (!userProfile) return;
    
    const profileInfo = document.getElementById('profileInfo');
    
    // Calculate stats
    const bmi = calculateBMI(userProfile.weight, userProfile.height);
    const bmr = calculateBMR(userProfile.weight, userProfile.height, userProfile.age, userProfile.gender);
    const dailyCalories = calculateDailyCalories(bmr, userProfile.activityLevel);
    
    profileInfo.innerHTML = `
        <div class="profile-info">
            <h4>Personal Information</h4>
            <p><strong>Name:</strong> ${currentUser.name}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Weight:</strong> ${userProfile.weight} kg</p>
            <p><strong>Height:</strong> ${userProfile.height} cm</p>
            <p><strong>Age:</strong> ${userProfile.age} years</p>
            <p><strong>Gender:</strong> ${userProfile.gender}</p>
            <p><strong>Activity Level:</strong> ${userProfile.activityLevel}</p>
        </div>
        <div class="profile-stats">
            <div class="stat-item">
                <div class="stat-value">${bmi}</div>
                <div class="stat-label">BMI</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${Math.round(bmr)}</div>
                <div class="stat-label">BMR (calories)</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${dailyCalories}</div>
                <div class="stat-label">Daily Calories</div>
            </div>
        </div>
    `;
    
    profileModal.classList.remove('hidden');
}

// Close profile modal
function closeProfile() {
    profileModal.classList.add('hidden');
}

// Edit profile (redirect to profile setup)
function editProfile() {
    closeProfile();
    showProfileSetup();
}

// Logout
function logout() {
    localStorage.removeItem('fitbot_token');
    localStorage.removeItem('fitbot_user');
    localStorage.removeItem('fitbot_profile');
    currentUser = null;
    userProfile = null;
    showLogin();
}

function maybeShowProfileNudge() {
    if (!userProfile) return;
    const required = ['weight', 'height', 'age', 'gender', 'activityLevel'];
    const missing = required.filter((k) => !userProfile[k]);
    if (missing.length === 0) return;
    const msg = `Your profile is incomplete (${missing.join(', ')}). Complete it to get personalized advice.`;
    addMessage(msg, 'bot', 'local');
}

// Show error message
function showError(message) {
    // Create a simple error notification
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4757;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 300px;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Show success message
function showSuccess(message) {
    // Create a simple success notification
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ed573;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 300px;
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Utility functions for calculations (same as backend)
function calculateBMI(weight, height) {
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
}

function calculateBMR(weight, height, age, gender) {
    const baseBMR = 10 * weight + 6.25 * height - 5 * age;
    return gender.toLowerCase() === 'male' ? baseBMR + 5 : baseBMR - 161;
}

function calculateDailyCalories(bmr, activityLevel) {
    const multipliers = {
        sedentary: 1.2,
        lightlyActive: 1.375,
        moderatelyActive: 1.55,
        veryActive: 1.725,
        extremelyActive: 1.9
    };
    const m = multipliers[activityLevel] || 1.2;
    return Math.round(bmr * m);
}

// Food Search Functions
let selectedFood = null;

function openFoodSearch() {
    document.getElementById('foodSearchModal').classList.remove('hidden');
    document.getElementById('foodSearchInput').focus();
}

function closeFoodSearch() {
    document.getElementById('foodSearchModal').classList.add('hidden');
    document.getElementById('foodSearchResults').innerHTML = '';
    document.getElementById('foodSearchInput').value = '';
}

function closeFoodLog() {
    document.getElementById('foodLogModal').classList.add('hidden');
    selectedFood = null;
}

async function searchFood() {
    const query = document.getElementById('foodSearchInput').value.trim();
    if (!query) return;

    const resultsDiv = document.getElementById('foodSearchResults');
    resultsDiv.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';

    try {
        const response = await fetch('/api/food/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('fitbot_token')}`
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Search failed');
        }

        if (data.products && data.products.length > 0) {
            displayFoodResults(data.products);
        } else {
            resultsDiv.innerHTML = '<div class="no-results">No foods found. Try a different search term.</div>';
        }
    } catch (error) {
        resultsDiv.innerHTML = `<div class="no-results">Search error: ${error.message}</div>`;
    }
}

function displayFoodResults(products) {
    const resultsDiv = document.getElementById('foodSearchResults');
    resultsDiv.innerHTML = '';

    products.forEach(product => {
        const foodItem = document.createElement('div');
        foodItem.className = 'food-item';
        foodItem.onclick = () => selectFood(product);

        const nutrition = product.nutriments || {};
        const calories = nutrition['energy-kcal_100g'] || nutrition.energy_100g || 'N/A';
        const protein = nutrition.proteins_100g || 'N/A';
        const carbs = nutrition.carbohydrates_100g || 'N/A';
        const fat = nutrition.fat_100g || 'N/A';
        
        // Determine food source
        const isLocal = product.source === 'local';
        const sourceLabel = isLocal ? 'Local Indian Food' : 'International Food';
        const sourceClass = isLocal ? 'local-source' : 'international-source';

        foodItem.innerHTML = `
            <div class="food-info">
                <h4>${product.product_name || 'Unknown Food'}</h4>
                <p>${product.brands ? `Brand: ${product.brands}` : ''}</p>
                ${product.categories ? `<p>Category: ${product.categories.split(',')[0]}</p>` : ''}
                <span class="food-source ${sourceClass}">${sourceLabel}</span>
            </div>
            <div class="food-nutrition">
                ${calories !== 'N/A' ? `${calories} cal` : 'No nutrition data'}<br>
                ${protein !== 'N/A' ? `P: ${protein}g` : ''} 
                ${carbs !== 'N/A' ? `C: ${carbs}g` : ''} 
                ${fat !== 'N/A' ? `F: ${fat}g` : ''}
            </div>
        `;

        resultsDiv.appendChild(foodItem);
    });
}

async function selectFood(product) {
    selectedFood = product;
    closeFoodSearch();
    
    // Open food logging modal
    document.getElementById('foodLogModal').classList.remove('hidden');
    
    // Display selected food info
    const selectedFoodDiv = document.getElementById('selectedFoodInfo');
    const nutrition = product.nutriments || {};
    
    selectedFoodDiv.innerHTML = `
        <div class="selected-food-card">
            <h4>${product.product_name || 'Unknown Food'}</h4>
            <p>${product.brands ? `Brand: ${product.brands}` : ''}</p>
            <p>Nutrition per 100g: 
                ${nutrition['energy-kcal_100g'] || nutrition.energy_100g || 'N/A'} cal, 
                Protein: ${nutrition.proteins_100g || 'N/A'}g, 
                Carbs: ${nutrition.carbohydrates_100g || 'N/A'}g, 
                Fat: ${nutrition.fat_100g || 'N/A'}g
            </p>
        </div>
    `;

    // Set default serving amount
    document.getElementById('servingAmount').value = '100';
    document.getElementById('servingUnit').value = 'g';
    
    updateNutritionPreview();
}

function updateNutritionPreview() {
    if (!selectedFood) return;

    const amount = parseFloat(document.getElementById('servingAmount').value) || 0;
    const unit = document.getElementById('servingUnit').value;
    
    // Convert to grams for calculation (simplified conversion)
    let gramsAmount = amount;
    if (unit === 'oz') gramsAmount = amount * 28.35;
    else if (unit === 'cup') gramsAmount = amount * 240; // approximate
    else if (unit === 'ml') gramsAmount = amount; // assume 1ml = 1g for liquids
    
    const nutrition = selectedFood.nutriments || {};
    const ratio = gramsAmount / 100; // nutrition is per 100g
    
    const calories = Math.round((nutrition['energy-kcal_100g'] || nutrition.energy_100g || 0) * ratio);
    const protein = Math.round((nutrition.proteins_100g || 0) * ratio * 10) / 10;
    const carbs = Math.round((nutrition.carbohydrates_100g || 0) * ratio * 10) / 10;
    const fat = Math.round((nutrition.fat_100g || 0) * ratio * 10) / 10;
    const fiber = Math.round((nutrition.fiber_100g || 0) * ratio * 10) / 10;
    
    document.getElementById('calculatedNutrition').innerHTML = `
        <h4>Nutrition for ${amount} ${unit}:</h4>
        <div class="nutrition-grid">
            <div class="nutrition-item">
                <div class="nutrition-value">${calories}</div>
                <div class="nutrition-label">Calories</div>
            </div>
            <div class="nutrition-item">
                <div class="nutrition-value">${protein}g</div>
                <div class="nutrition-label">Protein</div>
            </div>
            <div class="nutrition-item">
                <div class="nutrition-value">${carbs}g</div>
                <div class="nutrition-label">Carbs</div>
            </div>
            <div class="nutrition-item">
                <div class="nutrition-value">${fat}g</div>
                <div class="nutrition-label">Fat</div>
            </div>
            <div class="nutrition-item">
                <div class="nutrition-value">${fiber}g</div>
                <div class="nutrition-label">Fiber</div>
            </div>
        </div>
    `;
}

// Add event listeners for food logging
document.addEventListener('DOMContentLoaded', function() {
    // Food search input enter key
    const foodSearchInput = document.getElementById('foodSearchInput');
    if (foodSearchInput) {
        foodSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchFood();
            }
        });
    }

    // Food log form submission
    const foodLogForm = document.getElementById('foodLogForm');
    if (foodLogForm) {
        foodLogForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await logFood();
        });
    }

    // Update nutrition preview when serving amount/unit changes
    const servingAmount = document.getElementById('servingAmount');
    const servingUnit = document.getElementById('servingUnit');
    
    if (servingAmount) {
        servingAmount.addEventListener('input', updateNutritionPreview);
    }
    if (servingUnit) {
        servingUnit.addEventListener('change', updateNutritionPreview);
    }
});

async function logFood() {
    if (!selectedFood) {
        showError('No food selected');
        return;
    }

    const mealType = document.getElementById('mealType').value;
    const servingAmount = parseFloat(document.getElementById('servingAmount').value);
    const servingUnit = document.getElementById('servingUnit').value;

    if (!mealType || !servingAmount) {
        showError('Please fill in all required fields');
        return;
    }

    try {
        // Calculate nutrition for the specific serving size
        const nutrition = calculateNutritionForServing(selectedFood.nutriments, servingAmount, servingUnit);
        
        const response = await fetch('/api/food/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('fitbot_token')}`
            },
            body: JSON.stringify({
                foodId: selectedFood.id || selectedFood.code || selectedFood._id || 'unknown',
                foodName: selectedFood.product_name || selectedFood.name || 'Unknown Food',
                brand: selectedFood.brands || selectedFood.brand || 'Unknown Brand',
                imageUrl: selectedFood.image_url || selectedFood.imageUrl || null,
                mealType,
                servingAmount,
                servingUnit,
                nutrition: nutrition
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to log food');
        }

        // Store food info before closing modal (since closeFoodLog sets selectedFood to null)
        const loggedFoodName = selectedFood.product_name || selectedFood.name || 'Unknown Food';
        const loggedNutritionInfo = calculateNutritionForServing(selectedFood.nutriments, servingAmount, servingUnit);

        showSuccess('Food logged successfully!');
        closeFoodLog();
        
        // Send a message about the logged food
        const message = `I just logged ${servingAmount} ${servingUnit} of ${loggedFoodName} for ${mealType}. That's ${loggedNutritionInfo.energy} calories.`;
        
        // Add message to chat
        addMessage(message, 'user');
        
        // Get AI response about the logged food
        setTimeout(() => {
            sendMessage(message, false); // Don't add to chat again, just get AI response
        }, 500);

    } catch (error) {
        showError(`Error logging food: ${error.message}`);
    }
}

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

// Nutrition Dashboard Functions
let currentDashboardDate = new Date();

function openNutritionDashboard() {
    // Check if user is authenticated
    const token = localStorage.getItem('fitbot_token');
    if (!token || !currentUser) {
        showError('Please log in to view your nutrition dashboard');
        return;
    }
    
    currentDashboardDate = new Date();
    document.getElementById('nutritionDashboard').classList.remove('hidden');
    updateDashboardDate();
    loadNutritionData();
}

function closeNutritionDashboard() {
    document.getElementById('nutritionDashboard').classList.add('hidden');
}

function changeDate(direction) {
    currentDashboardDate.setDate(currentDashboardDate.getDate() + direction);
    updateDashboardDate();
    loadNutritionData();
}

function updateDashboardDate() {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('selectedDate').textContent = 
        currentDashboardDate.toLocaleDateString('en-US', options);
}

async function loadNutritionData() {
    try {
        const token = localStorage.getItem('fitbot_token');
        
        if (!token) {
            throw new Error('No authentication token found. Please log in again.');
        }
        
        // Get local date string to avoid timezone issues
        const year = currentDashboardDate.getFullYear();
        const month = String(currentDashboardDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDashboardDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        // Load daily nutrition data
        const response = await fetch(`${API_BASE}/nutrition/daily/${dateString}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication failed. Please log in again.');
            }
            throw new Error('Failed to load nutrition data');
        }

        const data = await response.json();
        updateNutritionDisplay(data);
        
        // Load nutrition goals
        const goalsResponse = await fetch(`${API_BASE}/nutrition/goals`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (goalsResponse.ok) {
            const goals = await goalsResponse.json();
            updateNutritionGoals(goals);
        }

        // Generate nutrition insights
        generateNutritionInsights(data);

    } catch (error) {
        console.error('Error loading nutrition data:', error);
        showError('Failed to load nutrition data');
    }
}

function updateNutritionDisplay(data) {
    // Update calories
    document.getElementById('caloriesConsumed').textContent = data.totalNutrition.energy || 0;
    
    // Update macros
    document.getElementById('proteinConsumed').textContent = Math.round(data.totalNutrition.protein || 0);
    document.getElementById('carbsConsumed').textContent = Math.round(data.totalNutrition.carbohydrates || 0);
    document.getElementById('fatConsumed').textContent = Math.round(data.totalNutrition.fat || 0);
    document.getElementById('fiberConsumed').textContent = Math.round(data.totalNutrition.fiber || 0);
    
    // Update progress bars
    updateProgressBar('caloriesProgress', data.totalNutrition.energy, parseInt(document.getElementById('caloriesGoal').textContent));
    updateProgressBar('proteinProgress', data.totalNutrition.protein, parseInt(document.getElementById('proteinGoal').textContent));
    updateProgressBar('carbsProgress', data.totalNutrition.carbohydrates, parseInt(document.getElementById('carbsGoal').textContent));
    updateProgressBar('fatProgress', data.totalNutrition.fat, parseInt(document.getElementById('fatGoal').textContent));
    updateProgressBar('fiberProgress', data.totalNutrition.fiber, parseInt(document.getElementById('fiberGoal').textContent));
    
    // Update meals breakdown
    updateMealsBreakdown(data.mealBreakdown);
}

function updateNutritionGoals(goals) {
    if (goals.dailyGoals) {
        document.getElementById('caloriesGoal').textContent = goals.dailyGoals.calories || 2000;
        document.getElementById('proteinGoal').textContent = goals.dailyGoals.protein || 150;
        document.getElementById('carbsGoal').textContent = goals.dailyGoals.carbohydrates || 250;
        document.getElementById('fatGoal').textContent = goals.dailyGoals.fat || 67;
        document.getElementById('fiberGoal').textContent = goals.dailyGoals.fiber || 25;
    }
}

function updateProgressBar(elementId, consumed, goal) {
    const element = document.getElementById(elementId);
    const percentage = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
    element.style.width = percentage + '%';
}

function updateMealsBreakdown(mealBreakdown) {
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    
    mealTypes.forEach(mealType => {
        const foodsContainer = document.getElementById(`${mealType}Foods`);
        const caloriesElement = document.getElementById(`${mealType}Calories`);
        
        const mealData = mealBreakdown[mealType] || { foods: [], totalCalories: 0 };
        
        // Update foods list
        if (mealData.foods.length === 0) {
            foodsContainer.innerHTML = '<p class="no-foods">No foods logged</p>';
        } else {
            foodsContainer.innerHTML = mealData.foods.map(food => `
                <div class="food-item">
                    <div class="food-item-content">
                        <span class="food-item-name">${food.name}</span>
                        <span class="food-item-calories">${Math.round(food.calories)} cal</span>
                    </div>
                    <button class="food-item-delete" onclick="deleteFoodEntry('${food.id}')" title="Remove food">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
        
        // Update calories
        caloriesElement.textContent = Math.round(mealData.totalCalories);
    });
}

async function generateNutritionInsights(data) {
    const tipsContainer = document.getElementById('nutritionTips');
    const tips = [];
    
    // Analyze nutrition data and generate insights
    const totalCalories = data.totalNutrition.energy || 0;
    const totalProtein = data.totalNutrition.protein || 0;
    const totalCarbs = data.totalNutrition.carbohydrates || 0;
    const totalFat = data.totalNutrition.fat || 0;
    const totalFiber = data.totalNutrition.fiber || 0;
    
    // Get goals
    const calorieGoal = parseInt(document.getElementById('caloriesGoal').textContent);
    const proteinGoal = parseInt(document.getElementById('proteinGoal').textContent);
    const fiberGoal = parseInt(document.getElementById('fiberGoal').textContent);
    
    // Generate tips based on intake
    if (totalCalories < calorieGoal * 0.8) {
        tips.push("🍎 You're eating fewer calories than your goal. Consider adding nutrient-dense snacks to meet your energy needs.");
    } else if (totalCalories > calorieGoal * 1.2) {
        tips.push("⚖️ You've exceeded your calorie goal. Try focusing on portion control and choosing lower-calorie options.");
    }
    
    if (totalProtein < proteinGoal * 0.8) {
        tips.push("💪 Your protein intake is below target. Add lean meats, fish, eggs, or plant-based proteins to your meals.");
    }
    
    if (totalFiber < fiberGoal * 0.6) {
        tips.push("🥬 Your fiber intake is low. Include more fruits, vegetables, and whole grains to improve digestion and satiety.");
    }
    
    if (tips.length === 0) {
        tips.push("🎉 Great job! Your nutrition intake looks well-balanced today. Keep up the good work!");
    }
    
    // Display tips
    tipsContainer.innerHTML = tips.map(tip => `
        <div class="tip-item">${tip}</div>
    `).join('');
}

// Nutrition Goals Functions
function openGoalsModal() {
    document.getElementById('nutritionGoalsModal').classList.remove('hidden');
    loadCurrentGoals();
}

function closeGoalsModal() {
    document.getElementById('nutritionGoalsModal').classList.add('hidden');
}

async function loadCurrentGoals() {
    try {
        const token = localStorage.getItem('fitbot_token');
        const response = await fetch(`${API_BASE}/nutrition/goals`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const goals = await response.json();
            if (goals.dailyGoals) {
                document.getElementById('caloriesGoalInput').value = goals.dailyGoals.calories || '';
                document.getElementById('proteinGoalInput').value = goals.dailyGoals.protein || '';
                document.getElementById('carbsGoalInput').value = goals.dailyGoals.carbohydrates || '';
                document.getElementById('fatGoalInput').value = goals.dailyGoals.fat || '';
                document.getElementById('fiberGoalInput').value = goals.dailyGoals.fiber || '';
                document.getElementById('goalTypeSelect').value = goals.goalType || 'maintain';
            }
        }
    } catch (error) {
        console.error('Error loading current goals:', error);
    }
}

async function calculateDefaultGoals() {
    try {
        const token = localStorage.getItem('fitbot_token');
        const profileResponse = await fetch(`${API_BASE}/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            const profile = profileData.profile;
            
            if (profile && profile.weight && profile.height && profile.age && profile.gender && profile.activityLevel) {
                // Calculate BMR using Mifflin-St Jeor equation
                let bmr;
                if (profile.gender === 'male') {
                    bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + 5;
                } else {
                    bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) - 161;
                }
                
                // Activity multipliers
                const activityMultipliers = {
                    sedentary: 1.2,
                    lightlyActive: 1.375,
                    moderatelyActive: 1.55,
                    veryActive: 1.725,
                    extremelyActive: 1.9
                };
                
                const dailyCalories = Math.round(bmr * activityMultipliers[profile.activityLevel]);
                const protein = Math.round(profile.weight * 1.6); // 1.6g per kg
                const fat = Math.round(dailyCalories * 0.25 / 9); // 25% of calories from fat
                const carbs = Math.round((dailyCalories - (protein * 4) - (fat * 9)) / 4); // Remaining calories from carbs
                const fiber = 25; // General recommendation
                
                // Fill the form
                document.getElementById('caloriesGoalInput').value = dailyCalories;
                document.getElementById('proteinGoalInput').value = protein;
                document.getElementById('carbsGoalInput').value = carbs;
                document.getElementById('fatGoalInput').value = fat;
                document.getElementById('fiberGoalInput').value = fiber;
                
                showSuccess('Default goals calculated based on your profile!');
            } else {
                showError('Please complete your profile first to calculate default goals.');
            }
        }
    } catch (error) {
        console.error('Error calculating default goals:', error);
        showError('Failed to calculate default goals');
    }
}

function setupNutritionGoalsForm() {
    const nutritionGoalsForm = document.getElementById('nutritionGoalsForm');
    if (nutritionGoalsForm) {
        nutritionGoalsForm.addEventListener('submit', handleNutritionGoals);
    }
}

// Set up form submission for nutrition goals
async function handleNutritionGoals(e) {
    e.preventDefault();
    
    try {
        const token = localStorage.getItem('fitbot_token');
        const formData = {
            calories: parseInt(document.getElementById('caloriesGoalInput').value),
            protein: parseInt(document.getElementById('proteinGoalInput').value) || null,
            carbohydrates: parseInt(document.getElementById('carbsGoalInput').value) || null,
            fat: parseInt(document.getElementById('fatGoalInput').value) || null,
            fiber: parseInt(document.getElementById('fiberGoalInput').value) || null,
            goalType: document.getElementById('goalTypeSelect').value
        };

        const response = await fetch(`${API_BASE}/nutrition/goals`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showSuccess('Nutrition goals updated successfully!');
            closeGoalsModal();
            // Refresh the dashboard to show new goals
            loadNutritionData();
        } else {
            throw new Error('Failed to update nutrition goals');
        }
    } catch (error) {
        console.error('Error updating nutrition goals:', error);
        showError('Failed to update nutrition goals');
    }
}

// Food Deletion Functions
async function deleteFoodEntry(entryId) {
    if (!confirm('Are you sure you want to remove this food entry?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('fitbot_token');
        const response = await fetch(`${API_BASE}/food/log/${entryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showSuccess('Food entry removed successfully!');
            // Refresh the dashboard to show updated data
            loadNutritionData();
        } else {
            throw new Error('Failed to delete food entry');
        }
    } catch (error) {
        console.error('Error deleting food entry:', error);
        showError('Failed to remove food entry');
    }
} 