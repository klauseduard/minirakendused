/**
 * Search Module for Gardening Calendar
 * Handles search functionality across the application
 */

/**
 * Search the calendar for the specified term
 * @param {string} searchTerm - Term to search for
 * @param {Function} renderCallback - Callback function to render results
 */
export function searchCalendar(searchTerm, activeMonth, renderCallback) {
    // Call the render function with the search term
    if (typeof renderCallback === 'function') {
        renderCallback(activeMonth, searchTerm);
    }
}

/**
 * Highlight search term in text
 * @param {string} text - Text to highlight search term in
 * @param {string} searchTerm - Term to highlight
 * @returns {string} Text with highlighted search term
 */
export function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

/**
 * Escape special characters in regular expression
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Filter an array of objects based on search term
 * @param {Array} items - Array of objects to filter
 * @param {string} searchTerm - Term to search for
 * @param {string} language - Language code to use for filtering
 * @returns {Array} Filtered array of objects
 */
export function filterItemsBySearchTerm(items, searchTerm, language = 'en') {
    if (!searchTerm || !items || !Array.isArray(items)) {
        return items || [];
    }
    
    const term = searchTerm.toLowerCase();
    return items.filter(item => {
        const itemText = item[language] || item.en;
        return itemText.toLowerCase().includes(term);
    });
}

/**
 * Initialize search functionality
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.searchBox - Search input element
 * @param {Function} config.onSearch - Callback function when search is performed
 */
export function initSearch(config = {}) {
    const { searchBox, onSearch } = config;
    
    if (!searchBox || !(searchBox instanceof HTMLElement)) {
        console.error('Search box element not provided or invalid');
        return;
    }
    
    // Add event listener for input
    searchBox.addEventListener('input', () => {
        const searchTerm = searchBox.value.trim();
        
        // Call the callback function if provided
        if (typeof onSearch === 'function') {
            onSearch(searchTerm);
        }
    });
    
    console.log('Search functionality initialized');
}

/**
 * Check if an item matches a search term
 * @param {Object} item - Item to check
 * @param {string} searchTerm - Term to search for
 * @param {string} language - Language code to use for matching
 * @returns {boolean} True if the item matches the search term
 */
export function itemMatchesSearch(item, searchTerm, language = 'en') {
    if (!searchTerm || !item) {
        return true;
    }
    
    const term = searchTerm.toLowerCase();
    const itemText = item[language] || item.en;
    return itemText.toLowerCase().includes(term);
} 