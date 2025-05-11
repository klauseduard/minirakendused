/**
 * Tests for the journal module functions
 * These tests will ensure refactoring doesn't break core functionality
 */

// NOTE: You'll need to run `npm install --save-dev jest @babel/preset-env` 
// and configure babel to use these tests with ES modules

describe('Journal Module', () => {
  // Mock the DOM environment
  document.body.innerHTML = `
    <div id="journalEntries"></div>
    <div id="exportOptionsModal" style="display: none;"></div>
  `;
  
  // Mock localStorage
  const mockStorage = {};
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(key => mockStorage[key] || null),
        setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
        removeItem: jest.fn(key => { delete mockStorage[key]; }),
        clear: jest.fn(() => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); })
      },
      writable: true
    });
  });

  // Import the modules under test
  let journalLogic;
  
  beforeAll(async () => {
    // We dynamically import the module to ensure it's loaded after our mocks
    journalLogic = await import('../gardening_calendar/js/modules/journal-logic.js');
  });

  // Test createJournalEntry
  test('createJournalEntry should add a new entry', async () => {
    const entryData = {
      date: '2023-08-15',
      type: 'planting',
      notes: 'Test planting entry',
      plants: ['Tomato']
    };
    
    // Mock the storage module
    window.lastWeatherData = {
      current_weather: { temperature: 25, weathercode: 0 },
      daily: { precipitation_sum: [0] }
    };
    
    const entry = await journalLogic.createJournalEntry(entryData);
    
    // Verify entry was created with correct data
    expect(entry).toBeDefined();
    expect(entry.date).toBe('2023-08-15');
    expect(entry.type).toBe('planting');
    expect(entry.notes).toBe('Test planting entry');
    expect(Array.isArray(entry.plants)).toBeTruthy();
    expect(entry.plants[0]).toBe('Tomato');
  });

  // Add more tests for other core functions
}); 