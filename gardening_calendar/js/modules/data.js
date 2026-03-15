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
        'april': 'April',
        'may': 'May',
        'early_june': 'Early June',
        
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
            {"en": "carrot", "et": "porgand"},
            {"en": "parsnip", "et": "pastinaak"},
            {"en": "radish", "et": "redis"},
            {"en": "turnip", "et": "naeris"},
            {"en": "peas", "et": "hernes"},
            {"en": "spinach", "et": "spinat"},
            {"en": "arugula", "et": "rukola"},
            {"en": "lettuce", "et": "salat"},
            {"en": "dill", "et": "till"},
            {"en": "parsley", "et": "petersell"}
        ],
        "seedling_start": [
            {"en": "cabbage", "et": "kapsas"},
            {"en": "cauliflower", "et": "lillkapsas"},
            {"en": "broccoli", "et": "brokoli"},
            {"en": "kale", "et": "lehtkapsas"},
            {"en": "tomato", "et": "tomat"},
            {"en": "pepper", "et": "paprika"},
            {"en": "eggplant", "et": "baklažaan"},
            {"en": "pumpkin", "et": "kõrvits"},
            {"en": "zucchini", "et": "suvikõrvits"},
            {"en": "melon", "et": "melon"},
            {"en": "basil", "et": "basiilik"},
            {"en": "thyme", "et": "tüümian"},
            {"en": "sage", "et": "salvei"}
        ],
        "greenhouse": [
            {"en": "radish", "et": "redis"},
            {"en": "spinach", "et": "spinat"},
            {"en": "lettuce", "et": "salat"},
            {"en": "dill", "et": "till"}
        ],
        "garden_tasks": [
            {"en": "Pruning fruit trees and berry bushes (before bud break)", "et": "Viljapuude ja marjapõõsaste lõikamine (enne pungade puhkemist)"},
            {"en": "Cleaning strawberry beds", "et": "Maasikapeenarde puhastamine"},
            {"en": "Turning compost", "et": "Komposti segamine"},
            {"en": "Cleaning and preparing greenhouse", "et": "Kasvuhoone puhastamine ja ettevalmistamine"},
            {"en": "Loosening and fertilizing beds", "et": "Peenarde kobestamine ja väetamine"}
        ],
        "custom_plants": [],
        "custom_tasks": []
    },
    "may": {
        "direct_sowing": [
            {"en": "carrot", "et": "porgand"},
            {"en": "beetroot", "et": "peet"},
            {"en": "radish", "et": "redis"},
            {"en": "turnip", "et": "naeris"},
            {"en": "parsnip", "et": "pastinaak"},
            {"en": "dill", "et": "till"},
            {"en": "parsley", "et": "petersell"},
            {"en": "lettuce", "et": "salat"},
            {"en": "arugula", "et": "rukola"},
            {"en": "spinach (new sowing)", "et": "spinat (uus külv)"},
            {"en": "chard", "et": "lehtpeet"},
            {"en": "peas", "et": "hernes"},
            {"en": "beans", "et": "oad"},
            {"en": "potato", "et": "kartul"},
            {"en": "onion (sets or seeds)", "et": "sibul (istikud või seemned)"}
        ],
        "transplanting": [
            {"en": "cabbage", "et": "kapsas"},
            {"en": "cauliflower", "et": "lillkapsas"},
            {"en": "broccoli", "et": "brokoli"},
            {"en": "kale", "et": "lehtkapsas"},
            {"en": "tomato (in greenhouse)", "et": "tomat (kasvuhoones)"},
            {"en": "pepper (in greenhouse)", "et": "paprika (kasvuhoones)"},
            {"en": "eggplant (in greenhouse)", "et": "baklažaan (kasvuhoones)"},
            {"en": "zucchini (late May)", "et": "suvikõrvits (mai lõpus)"},
            {"en": "pumpkin (late May)", "et": "kõrvits (mai lõpus)"}
        ],
        "greenhouse": [
            {"en": "tomato", "et": "tomat"},
            {"en": "cucumber", "et": "kurk"},
            {"en": "pepper", "et": "paprika"},
            {"en": "eggplant", "et": "baklažaan"},
            {"en": "zucchini", "et": "suvikõrvits"},
            {"en": "basil", "et": "basiilik"}
        ],
        "garden_tasks": [
            {"en": "Checking fruit tree flower buds (thinning if needed)", "et": "Viljapuude õiepungade kontrollimine (vajadusel harvendamine)"},
            {"en": "Planting containers and balcony plants", "et": "Pottide ja rõdutaimede istutamine"},
            {"en": "Adding mulch to beds", "et": "Multši lisamine peenardele"},
            {"en": "Weed control", "et": "Umbrohutõrje"},
            {"en": "Adding green matter to compost", "et": "Rohelise materjali lisamine kompostile"}
        ],
        "custom_plants": [],
        "custom_tasks": []
    },
    "early_june": {
        "direct_sowing": [
            {"en": "beans (late varieties)", "et": "oad (hilised sordid)"},
            {"en": "zucchini (direct sowing)", "et": "suvikõrvits (otse külvamine)"},
            {"en": "cucumber (direct sowing)", "et": "kurk (otse külvamine)"}
        ],
        "transplanting": [
            {"en": "zucchini", "et": "suvikõrvits"},
            {"en": "pumpkin", "et": "kõrvits"},
            {"en": "cucumber (if soil is warm)", "et": "kurk (kui muld on soe)"}
        ],
        "greenhouse": [
            {"en": "Tomato maintenance and staking", "et": "Tomatite hooldus ja toestamine"},
            {"en": "Fertilizing", "et": "Väetamine"},
            {"en": "Ventilation", "et": "Õhutamine"},
            {"en": "Removing side shoots", "et": "Võsundite eemaldamine"},
            {"en": "Succession planting (lettuce, radish, herbs)", "et": "Järkjärguline külvamine (salat, redis, maitsetaimed)"},
            {"en": "Cucumber staking", "et": "Kurkide toestamine"}
        ],
        "garden_tasks": [
            {"en": "Removing row covers", "et": "Reakattematerjali eemaldamine"},
            {"en": "Monitoring watering schedule", "et": "Kastmisgraafiku jälgimine"},
            {"en": "Weed control", "et": "Umbrohutõrje"},
            {"en": "Covering strawberries with bird netting", "et": "Maasikate katmine linnuvõrguga"}
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