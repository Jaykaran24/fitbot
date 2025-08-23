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