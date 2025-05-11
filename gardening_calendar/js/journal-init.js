// Journal Initialization Script
// This file initializes the journal module and serves as a bridge
// while we incrementally refactor the JavaScript code

import { initJournal } from './modules/journal-ui.js';

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing journal module');
    
    // Call the journal initialization function
    initJournal();
}); 