// Journal Loader Script
// This file loads the journal module and initializes it

// Updated import to use the new module structure
import { initJournal } from './modules/journal-ui.js';

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing journal module');
    initJournal();
}); 