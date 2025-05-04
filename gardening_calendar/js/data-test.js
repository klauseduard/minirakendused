// Test script for data module

import { translations, calendarData, categoryIcons, categoryNames, journalEntryTypes } from './modules/data.js';

console.log('Data module loaded successfully!');
console.log('Available translations:', Object.keys(translations));
console.log('Available months:', Object.keys(calendarData));
console.log('Category icons:', categoryIcons);
console.log('Category names:', categoryNames);
console.log('Journal entry types:', journalEntryTypes);

// This confirms that all data was properly loaded 