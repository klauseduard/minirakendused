/**
 * Search Module Loader
 * Imports the search module and exposes its functions globally
 */
import * as searchModule from './modules/search.js';

// Expose search functions to the global scope for backward compatibility
window.searchUtils = searchModule;

// Create specific named exports for direct access
window.searchCalendar = searchModule.searchCalendar;
window.highlightText = searchModule.highlightText;
window.escapeRegExp = searchModule.escapeRegExp;
window.filterItemsBySearchTerm = searchModule.filterItemsBySearchTerm;

// Initialize search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing search module from loader...');
    
    // Initialize after calendar module is loaded
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchModule.initSearch({
            searchBox,
            onSearch: (searchTerm) => {
                // Get the active month from window scope (set by calendar module)
                const activeMonth = window.activeMonth || 'april';
                
                // Call the existing searchCalendar function
                if (window.renderCalendar) {
                    searchModule.searchCalendar(searchTerm, activeMonth, window.renderCalendar);
                }
            }
        });
    } else {
        console.warn('Search box element not found');
    }
});

// Mark that the search module is loaded
document.dispatchEvent(new CustomEvent('searchModuleLoaded'));
console.log('Search module loader completed'); 