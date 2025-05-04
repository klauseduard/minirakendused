// Data module loader
// This script imports the data module and exposes it to the global scope
// until full refactoring is complete

import * as dataModule from './modules/data.js';

// Make data available to the global scope for now
// This is temporary until all code is properly modularized
window.dataModule = dataModule;

// Expose individual data objects to maintain compatibility with existing code
window.translations = dataModule.translations;
window.calendarData = dataModule.calendarData;
window.categoryIcons = dataModule.categoryIcons;
window.categoryNames = dataModule.categoryNames;
window.journalEntryTypes = dataModule.journalEntryTypes;

console.log("Data module loaded and exposed to global scope");

// Dispatch an event that the rest of the application can listen for
document.dispatchEvent(new CustomEvent('dataModuleLoaded', {
    detail: { moduleName: 'data' }
})); 