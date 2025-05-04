// Gardening Calendar - Translations Module

// Multi-language support
const translations = {
    'en': {
        // Header
        'title': 'Spring Gardening and Planting Calendar',
        'quick_nav': 'Quick Navigation:',
        'location_setup': 'Location Setup',
        'weather_info': 'Weather Info',
        'search_advice': 'Search & AI',
        'monthly_calendar': 'Monthly Calendar',
        
        // Location section
        'location_placeholder': 'City or place name (e.g., Paris, Barcelona)',
        'location_focus_placeholder': 'City or place name',
        'use_my_location': 'Use my location',
        'temperature': 'Temperature:',
        'precipitation': 'Precipitation:',
        
        // Weather display
        'weather_placeholder': 'Weather information for your location will appear here.',
        'location': 'Location:',
        'latitude': 'Latitude:',
        'longitude': 'Longitude:',
        'loading_weather': 'Loading weather data...',
        'current_weather': 'Current weather:',
        'wind': 'Wind:',
        'forecast_16day': '16-day forecast:',
        
        // Search section
        'find_plants_tasks': 'Search & AI Garden Assistant',
        'generate_advice': 'Generate AI gardening advice prompt',
        'search_placeholder': 'Type to search for specific plants or garden tasks...',

        // Month selection
        'select_period': 'Select Growing Period',
        'april': 'April',
        'may': 'May',
        'early_june': 'Early June',
        
        // Plant categories
        'direct_sowing': 'Direct Sowing',
        'seedling_start': 'Starting Seedlings',
        'transplanting': 'Transplanting',
        'greenhouse': 'Greenhouse',
        'garden_tasks': 'Garden Tasks',
        
        // AI Prompt Modal
        'ai_assistant': 'AI Gardening Assistant',
        'prompt_description': 'This tool will generate a comprehensive prompt based on your location, weather, and garden information. You can use this prompt with any AI assistant to get personalized gardening advice.',
        'garden_notes': 'Your notes about your garden:',
        'include_prompt': 'Include in Prompt:',
        'selected_plants': 'Selected plants and tasks',
        'checked_items': '(Your checked items from the planting calendar)',
        'filter_weather': 'Filter for weather conditions',
        'suitable_forecast': '(Only include plants suitable for current forecast)',
        'generate_prompt': 'Generate Prompt',
        'copy_clipboard': 'Copy to Clipboard',
        'prompt_placeholder': 'Click "Generate Prompt" to create a customized gardening prompt based on your location, weather, and calendar data.',
        'send_prompt': 'Send Prompt Directly To:',
        'like_tool': 'Like this tool? Support its development!',
        
        // Footer
        'copyright': 'Spring Gardening and Planting Calendar © 2025',
        'support': 'Support on Ko-fi'
    }
};

// Current language (default to English)
let currentLang = 'en';

// Load additional languages dynamically
async function loadLanguage(lang) {
    if (lang === 'en' || translations[lang]) {
        return translations[lang];
    }
    
    try {
        const response = await fetch(`gardening_calendar/translations/${lang}.json`);
        if (!response.ok) throw new Error(`Failed to load ${lang} translation`);
        const langData = await response.json();
        translations[lang] = langData;
        return langData;
    } catch (error) {
        console.error(`Error loading ${lang} translation:`, error);
        return null;
    }
}

// Function to translate UI elements
async function translateUI(lang) {
    // Load language if not already loaded
    const langData = await loadLanguage(lang);
    
    if (!langData) {
        console.error(`Translation for language ${lang} not found`);
        return;
    }
    
    currentLang = lang;
    const t = langData;
    
    // Save language preference
    localStorage.setItem('gardening_language', lang);
    
    // Update document title
    document.title = t.title;
    
    // Update text elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });
    
    // Update placeholders for inputs
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) {
            el.setAttribute('placeholder', t[key]);
        }
    });
    
    // Update aria-labels
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        if (t[key]) {
            el.setAttribute('aria-label', t[key]);
        }
    });
    
    // Update month buttons
    document.querySelectorAll('.month-btn').forEach(btn => {
        const month = btn.getAttribute('data-month');
        if (t[month]) {
            btn.textContent = t[month];
        }
    });
    
    // Update input placeholders
    const locationInput = document.getElementById('locationInput');
    if (locationInput && t.location_placeholder) {
        locationInput.setAttribute('placeholder', t.location_placeholder);
    }
    
    // Update search box placeholder
    const searchBox = document.getElementById('searchBox');
    if (searchBox && t.search_placeholder) {
        searchBox.setAttribute('placeholder', t.search_placeholder);
    }
    
    // Trigger calendar rendering with new language
    if (window.renderCalendar) {
        // Get current active month and search query
        const activeMonth = document.querySelector('.month-btn.active')?.getAttribute('data-month') || 'april';
        const searchQuery = searchBox?.value || '';
        window.renderCalendar(activeMonth, searchQuery);
    }
}

// Function to get translated string
function getTranslation(key) {
    return translations[currentLang]?.[key] || key;
}

// Initialize language from localStorage or browser preference
async function initTranslations() {
    let savedLang = localStorage.getItem('gardening_language');
    
    if (!savedLang) {
        // Try to detect from browser
        const browserLang = navigator.language.split('-')[0];
        savedLang = ['en', 'et'].includes(browserLang) ? browserLang : 'en';
    }
    
    await translateUI(savedLang);
}

export { translations, loadLanguage, translateUI, getTranslation, initTranslations }; 