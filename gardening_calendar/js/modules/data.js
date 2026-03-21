// Data module for the Gardening Calendar app
// Contains translations, calendar data, and category information

// Multi-language support
export const translations = {
    'en': {
        // Header
        'title': 'Garden Planner',
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
        'april': 'Early Spring',
        'may': 'Spring',
        'early_june': 'Late Spring',
        
        // Plant categories
        'direct_sowing': 'Direct Sowing',
        'seedling_start': 'Starting Seedlings',
        'transplanting': 'Transplanting',
        'greenhouse': 'Greenhouse',
        'garden_tasks': 'Garden Tasks',
        'custom_plants': 'My Custom Plants',
        'custom_tasks': 'My Custom Tasks',
        
        // Custom entries
        'add_custom_plant': 'Add Custom Plant',
        'add_custom_task': 'Add Custom Task',
        'custom_plant_name': 'Plant Name',
        'custom_task_name': 'Task Description',
        'custom_plant_description': 'Description (optional)',
        'custom_task_description': 'Additional Notes (optional)',
        'add_to_category': 'Add to Category',
        'add_button': 'Add',
        'cancel_button': 'Cancel',
        'delete_button': 'Delete',
        'edit_button': 'Edit',
        'edit_custom_plant': 'Edit Custom Plant',
        'edit_custom_task': 'Edit Custom Task',
        'no_custom_entries': 'No custom entries yet. Use the buttons above to add your own plants and tasks.',
        
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
        'copyright': 'Garden Planner © 2025',
        'support': 'Support on Ko-fi'
    }
};

// Calendar data - plants and tasks for each month
export const calendarData = {
    "april": {
        "direct_sowing": [
            {"en": "carrot", "et": "porgand", "zones": ["temperate", "continental", "arid", "tropical"]},
            {"en": "parsnip", "et": "pastinaak", "zones": ["temperate", "continental"]},
            {"en": "radish", "et": "redis", "zones": ["temperate", "continental", "arid", "polar"]},
            {"en": "turnip", "et": "naeris", "zones": ["temperate", "continental", "polar"]},
            {"en": "peas", "et": "hernes", "zones": ["temperate", "continental", "polar"]},
            {"en": "spinach", "et": "spinat", "zones": ["temperate", "continental", "arid", "polar"]},
            {"en": "arugula", "et": "rukola", "zones": ["temperate", "continental", "arid"]},
            {"en": "lettuce", "et": "salat", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "dill", "et": "till", "zones": ["temperate", "continental"]},
            {"en": "parsley", "et": "petersell", "zones": ["temperate", "continental", "arid"]},
            {"en": "okra", "et": "okra", "zones": ["tropical", "arid"]},
            {"en": "sweet potato (slips)", "et": "bataat (istikud)", "zones": ["tropical"]},
            {"en": "cowpea", "et": "lehmahernes", "zones": ["tropical", "arid"]}
        ],
        "seedling_start": [
            {"en": "cabbage", "et": "kapsas", "zones": ["temperate", "continental"]},
            {"en": "cauliflower", "et": "lillkapsas", "zones": ["temperate", "continental"]},
            {"en": "broccoli", "et": "brokoli", "zones": ["temperate", "continental"]},
            {"en": "kale", "et": "lehtkapsas", "zones": ["temperate", "continental", "polar"]},
            {"en": "tomato", "et": "tomat", "zones": ["temperate", "continental", "arid", "tropical"]},
            {"en": "pepper", "et": "paprika", "zones": ["temperate", "continental", "arid", "tropical"]},
            {"en": "eggplant", "et": "baklažaan", "zones": ["temperate", "continental", "arid", "tropical"]},
            {"en": "pumpkin", "et": "kõrvits", "zones": ["temperate", "continental", "arid"]},
            {"en": "zucchini", "et": "suvikõrvits", "zones": ["temperate", "continental", "arid"]},
            {"en": "melon", "et": "melon", "zones": ["temperate", "arid", "tropical"]},
            {"en": "basil", "et": "basiilik", "zones": ["temperate", "continental", "arid", "tropical"]},
            {"en": "thyme", "et": "tüümian", "zones": ["temperate", "continental", "arid"]},
            {"en": "sage", "et": "salvei", "zones": ["temperate", "continental", "arid"]}
        ],
        "greenhouse": [
            {"en": "radish", "et": "redis", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "spinach", "et": "spinat", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "lettuce", "et": "salat", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "dill", "et": "till", "zones": ["temperate", "continental", "arid", "tropical", "polar"]}
        ],
        "garden_tasks": [
            {"en": "Pruning fruit trees and berry bushes (before bud break)", "et": "Viljapuude ja marjapõõsaste lõikamine (enne pungade puhkemist)", "zones": ["temperate", "continental"]},
            {"en": "Cleaning strawberry beds", "et": "Maasikapeenarde puhastamine", "zones": ["temperate", "continental"]},
            {"en": "Turning compost", "et": "Komposti segamine", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Cleaning and preparing greenhouse", "et": "Kasvuhoone puhastamine ja ettevalmistamine", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Loosening and fertilizing beds", "et": "Peenarde kobestamine ja väetamine", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Setting up shade structures", "et": "Varjualuste paigaldamine", "zones": ["tropical", "arid"]},
            {"en": "Preparing raised beds for drainage", "et": "Kõrgpeenarde ettevalmistamine drenaažiks", "zones": ["tropical"]},
            {"en": "Installing drip irrigation", "et": "Tilkkastmissüsteemi paigaldamine", "zones": ["arid"]},
            {"en": "Preparing cold frames and row covers", "et": "Külmakastide ja reakattematerjali ettevalmistamine", "zones": ["polar", "continental"]},
            {"en": "Starting seeds indoors under grow lights", "et": "Seemnete idandamine siseruumis kasvulampide all", "zones": ["polar"]}
        ],
        "custom_plants": [],
        "custom_tasks": []
    },
    "may": {
        "direct_sowing": [
            {"en": "carrot", "et": "porgand", "zones": ["temperate", "continental", "arid"]},
            {"en": "beetroot", "et": "peet", "zones": ["temperate", "continental", "arid"]},
            {"en": "radish", "et": "redis", "zones": ["temperate", "continental", "arid", "polar"]},
            {"en": "turnip", "et": "naeris", "zones": ["temperate", "continental", "polar"]},
            {"en": "parsnip", "et": "pastinaak", "zones": ["temperate", "continental"]},
            {"en": "dill", "et": "till", "zones": ["temperate", "continental"]},
            {"en": "parsley", "et": "petersell", "zones": ["temperate", "continental", "arid"]},
            {"en": "lettuce", "et": "salat", "zones": ["temperate", "continental", "arid", "tropical"]},
            {"en": "arugula", "et": "rukola", "zones": ["temperate", "continental", "arid"]},
            {"en": "spinach (new sowing)", "et": "spinat (uus külv)", "zones": ["temperate", "continental", "arid"]},
            {"en": "chard", "et": "lehtpeet", "zones": ["temperate", "continental", "arid"]},
            {"en": "peas", "et": "hernes", "zones": ["temperate", "continental", "polar"]},
            {"en": "beans", "et": "oad", "zones": ["temperate", "continental", "arid", "tropical"]},
            {"en": "potato", "et": "kartul", "zones": ["temperate", "continental", "polar"]},
            {"en": "onion (sets or seeds)", "et": "sibul (istikud või seemned)", "zones": ["temperate", "continental", "arid"]},
            {"en": "cassava (cuttings)", "et": "kassaava (pistikud)", "zones": ["tropical"]}
        ],
        "transplanting": [
            {"en": "cabbage", "et": "kapsas", "zones": ["temperate", "continental"]},
            {"en": "cauliflower", "et": "lillkapsas", "zones": ["temperate", "continental"]},
            {"en": "broccoli", "et": "brokoli", "zones": ["temperate", "continental"]},
            {"en": "kale", "et": "lehtkapsas", "zones": ["temperate", "continental"]},
            {"en": "tomato (in greenhouse)", "et": "tomat (kasvuhoones)", "zones": ["temperate", "continental"]},
            {"en": "pepper (in greenhouse)", "et": "paprika (kasvuhoones)", "zones": ["temperate", "continental"]},
            {"en": "eggplant (in greenhouse)", "et": "baklažaan (kasvuhoones)", "zones": ["temperate", "continental"]},
            {"en": "zucchini (late May)", "et": "suvikõrvits (mai lõpus)", "zones": ["temperate", "continental"]},
            {"en": "pumpkin (late May)", "et": "kõrvits (mai lõpus)", "zones": ["temperate", "continental"]},
            {"en": "tomato", "et": "tomat", "zones": ["arid", "tropical"]},
            {"en": "pepper", "et": "paprika", "zones": ["arid", "tropical"]},
            {"en": "eggplant", "et": "baklažaan", "zones": ["arid", "tropical"]}
        ],
        "greenhouse": [
            {"en": "tomato", "et": "tomat", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "cucumber", "et": "kurk", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "pepper", "et": "paprika", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "eggplant", "et": "baklažaan", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "zucchini", "et": "suvikõrvits", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "basil", "et": "basiilik", "zones": ["temperate", "continental", "arid", "tropical", "polar"]}
        ],
        "garden_tasks": [
            {"en": "Checking fruit tree flower buds (thinning if needed)", "et": "Viljapuude õiepungade kontrollimine (vajadusel harvendamine)", "zones": ["temperate", "continental"]},
            {"en": "Planting containers and balcony plants", "et": "Pottide ja rõdutaimede istutamine", "zones": ["temperate", "continental", "arid", "tropical"]},
            {"en": "Adding mulch to beds", "et": "Multši lisamine peenardele", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Weed control", "et": "Umbrohutõrje", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Adding green matter to compost", "et": "Rohelise materjali lisamine kompostile", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Monitoring for pests and diseases", "et": "Kahjurite ja haiguste jälgimine", "zones": ["tropical", "arid"]},
            {"en": "Deep watering for new plantings", "et": "Uute istutuste sügavkastmine", "zones": ["arid"]},
            {"en": "Hardening off indoor-started seedlings", "et": "Siseruumis kasvatatud taimede karastamine", "zones": ["polar", "continental"]}
        ],
        "custom_plants": [],
        "custom_tasks": []
    },
    "early_june": {
        "direct_sowing": [
            {"en": "beans (late varieties)", "et": "oad (hilised sordid)", "zones": ["temperate", "continental", "arid", "tropical"]},
            {"en": "zucchini (direct sowing)", "et": "suvikõrvits (otse külvamine)", "zones": ["temperate", "continental", "arid"]},
            {"en": "cucumber (direct sowing)", "et": "kurk (otse külvamine)", "zones": ["temperate", "continental", "arid"]},
            {"en": "yard-long bean", "et": "pikauba", "zones": ["tropical"]}
        ],
        "transplanting": [
            {"en": "zucchini", "et": "suvikõrvits", "zones": ["temperate", "continental", "arid"]},
            {"en": "pumpkin", "et": "kõrvits", "zones": ["temperate", "continental", "arid"]},
            {"en": "cucumber (if soil is warm)", "et": "kurk (kui muld on soe)", "zones": ["temperate", "continental"]},
            {"en": "okra", "et": "okra", "zones": ["tropical", "arid"]}
        ],
        "greenhouse": [
            {"en": "Tomato maintenance and staking", "et": "Tomatite hooldus ja toestamine", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Fertilizing", "et": "Väetamine", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Ventilation", "et": "Õhutamine", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Removing side shoots", "et": "Võsundite eemaldamine", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Succession planting (lettuce, radish, herbs)", "et": "Järkjärguline külvamine (salat, redis, maitsetaimed)", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Cucumber staking", "et": "Kurkide toestamine", "zones": ["temperate", "continental", "arid", "tropical", "polar"]}
        ],
        "garden_tasks": [
            {"en": "Removing row covers", "et": "Reakattematerjali eemaldamine", "zones": ["temperate", "continental"]},
            {"en": "Monitoring watering schedule", "et": "Kastmisgraafiku jälgimine", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Weed control", "et": "Umbrohutõrje", "zones": ["temperate", "continental", "arid", "tropical", "polar"]},
            {"en": "Covering strawberries with bird netting", "et": "Maasikate katmine linnuvõrguga", "zones": ["temperate", "continental"]},
            {"en": "Harvesting and succession planting", "et": "Saagikoristus ja järelkülv", "zones": ["tropical"]},
            {"en": "Adjusting irrigation for rising temperatures", "et": "Kastmise kohandamine tõusvate temperatuuridega", "zones": ["arid"]}
        ],
        "custom_plants": [],
        "custom_tasks": []
    }
};

// Category icons for visual representation
export const categoryIcons = {
    "direct_sowing": "🌱",
    "seedling_start": "🌿",
    "transplanting": "🌿",
    "greenhouse": "🏡",
    "garden_tasks": "🧰",
    "custom_plants": "🌸",
    "custom_tasks": "📝"
};

// Category display names
export const categoryNames = {
    "direct_sowing": "Direct Sowing",
    "seedling_start": "Starting Seedlings",
    "transplanting": "Transplanting",
    "greenhouse": "Greenhouse",
    "garden_tasks": "Garden Tasks",
    "custom_plants": "My Custom Plants",
    "custom_tasks": "My Custom Tasks"
};

// Journal entry types
export const journalEntryTypes = {
    "planting": { icon: "🌱", name: "Planting" },
    "care": { icon: "🌿", name: "Garden Care" },
    "harvest": { icon: "🥕", name: "Harvest" },
    "observation": { icon: "👁️", name: "Observation" },
    "maintenance": { icon: "🧰", name: "Maintenance" }
};

// Custom entries structure
export const customEntryTypes = {
    "plant": { 
        icon: "🌸", 
        name: "Custom Plant",
        defaultCategory: "custom_plants",
        fields: ["name", "description", "category"]
    },
    "task": { 
        icon: "📝", 
        name: "Custom Task",
        defaultCategory: "custom_tasks",
        fields: ["name", "description", "month"]
    }
};

// Export all data as a default object as well for convenience
export default {
    translations,
    calendarData,
    categoryIcons,
    categoryNames,
    journalEntryTypes,
    customEntryTypes
}; 