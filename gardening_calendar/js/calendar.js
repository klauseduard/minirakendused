// Gardening Calendar - Calendar Module
import { getTranslation } from './translations.js';

// Calendar data in JSON format
const calendarData = {
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
        ]
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
        ]
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
        ]
    }
};

// Category icons
const categoryIcons = {
    "direct_sowing": "🌱",
    "seedling_start": "🌿",
    "transplanting": "🌿",
    "greenhouse": "🏡",
    "garden_tasks": "🧰"
};

// DOM elements
let calendarContent;
let monthButtons;
let searchBox;

// Active month (default April)
let activeMonth = 'april';

// Function to render the calendar based on month and search query
function renderCalendar(month, searchQuery = '') {
    if (!calendarContent) return;
    
    activeMonth = month;
    searchQuery = searchQuery.toLowerCase();
    
    // Update active button styling
    monthButtons.forEach(btn => {
        if (btn.getAttribute('data-month') === month) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Get stored selected tasks from localStorage
    const selectedTasks = JSON.parse(localStorage.getItem('gardening_selected_tasks') || '[]');
    
    // Build HTML for calendar content
    let html = '';
    const monthData = calendarData[month];
    
    if (!monthData) {
        calendarContent.innerHTML = '<p>No data available for this month.</p>';
        return;
    }
    
    // Iterate through categories
    Object.keys(monthData).forEach(category => {
        // Skip empty categories
        if (!monthData[category] || monthData[category].length === 0) return;
        
        const categoryIcon = categoryIcons[category] || '';
        const categoryName = getTranslation(category);
        
        // Start category section if we have matching items
        let categoryHtml = '';
        let categoryItemCount = 0;
        
        // Render items in category
        monthData[category].forEach(item => {
            // Get the translated item name based on current language
            const currentLang = localStorage.getItem('gardening_language') || 'en';
            const itemName = (item[currentLang] || item.en || '');
            
            // Skip if item doesn't match search
            if (searchQuery && !itemName.toLowerCase().includes(searchQuery)) {
                return;
            }
            
            categoryItemCount++;
            
            // Generate a unique ID for this task
            const taskId = `${month}-${category}-${btoa(itemName).replace(/[=+/]/g, '')}`;
            const isChecked = selectedTasks.includes(taskId);
            
            categoryHtml += `<div class="calendar-item${isChecked ? ' checked' : ''}">
                <label class="task-checkbox">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} 
                        data-task-id="${taskId}" 
                        data-month="${month}" 
                        data-category="${category}">
                    <span class="checkmark"></span>
                    <span class="task-text">${itemName}</span>
                </label>
            </div>`;
        });
        
        // Only add category to HTML if it has matching items
        if (categoryItemCount > 0) {
            html += `<div class="calendar-category" data-category="${category}">
                <h3 class="category-title">
                    <span class="category-icon">${categoryIcon}</span>
                    ${categoryName} (${categoryItemCount})
                </h3>
                <div class="category-items">
                    ${categoryHtml}
                </div>
            </div>`;
        }
    });
    
    // If no content due to search filtering
    if (html === '') {
        html = `<div class="no-results">
            <p>No matching plants or tasks found for "${searchQuery}".</p>
            <button id="clearSearchBtn" class="clear-search-btn">Clear Search</button>
        </div>`;
    }
    
    // Update calendar content
    calendarContent.innerHTML = html;
    
    // Add event listener for checkboxes
    document.querySelectorAll('.task-checkbox input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const taskId = this.getAttribute('data-task-id');
            const selectedTasks = JSON.parse(localStorage.getItem('gardening_selected_tasks') || '[]');
            
            if (this.checked) {
                if (!selectedTasks.includes(taskId)) {
                    selectedTasks.push(taskId);
                }
                this.closest('.calendar-item').classList.add('checked');
            } else {
                const index = selectedTasks.indexOf(taskId);
                if (index !== -1) {
                    selectedTasks.splice(index, 1);
                }
                this.closest('.calendar-item').classList.remove('checked');
            }
            
            localStorage.setItem('gardening_selected_tasks', JSON.stringify(selectedTasks));
            
            // Track selection in analytics if available
            if (typeof gtag === 'function') {
                gtag('event', this.checked ? 'select_task' : 'deselect_task', {
                    'task_id': taskId,
                    'task_month': this.getAttribute('data-month'),
                    'task_category': this.getAttribute('data-category')
                });
            }
        });
    });
    
    // Add clear search button handler if needed
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            if (searchBox) {
                searchBox.value = '';
                renderCalendar(activeMonth, '');
            }
        });
    }
}

// Initialize the calendar
function initCalendar() {
    // Get DOM elements
    calendarContent = document.getElementById('calendarContent');
    monthButtons = document.querySelectorAll('.month-btn');
    searchBox = document.getElementById('searchBox');
    
    if (!calendarContent || !monthButtons.length) {
        console.error('Calendar elements not found');
        return;
    }
    
    // Set up month button click handlers
    monthButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const month = this.getAttribute('data-month');
            if (month) {
                renderCalendar(month, searchBox?.value || '');
            }
        });
    });
    
    // Set up search input handler
    if (searchBox) {
        searchBox.addEventListener('input', function() {
            renderCalendar(activeMonth, this.value);
        });
    }
    
    // Initial render with default month
    renderCalendar(activeMonth);
}

export { calendarData, categoryIcons, initCalendar, renderCalendar }; 