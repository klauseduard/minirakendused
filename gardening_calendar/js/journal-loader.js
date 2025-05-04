// Journal Loader Script
// This file loads the journal module and initializes it

import * as JournalModule from './modules/journal.js';

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing journal module');
    JournalModule.initJournal();
}); 