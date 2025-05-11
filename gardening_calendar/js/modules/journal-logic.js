/**
 * Journal Logic Module
 * Contains pure data manipulation functions for journal entries.
 * No DOM manipulation or direct storage calls should be here.
 */

// Import from storage via the new storage bridge
import { saveJournalEntries, getJournalEntries } from './journal-storage.js';

// Journal entry types - shared constants
export const journalEntryTypes = {
  "planting": { icon: "🌱", name: "Planting" },
  "care": { icon: "🌿", name: "Garden Care" },
  "harvest": { icon: "🥕", name: "Harvest" },
  "observation": { icon: "👁️", name: "Observation" },
  "maintenance": { icon: "🧰", name: "Maintenance" }
};

/**
 * Create a new journal entry
 * @param {Object} entryData - Data for the new entry
 * @returns {Object} The newly created entry
 */
export function createJournalEntry(entryData) {
  const entries = getJournalEntries();
  const newEntry = {
    id: `journal-${Date.now()}`,
    date: entryData.date || new Date().toISOString().split('T')[0],
    type: entryData.type || 'observation',
    plants: entryData.plants || [],
    notes: entryData.notes || '',
    location: entryData.location || '',
    metrics: entryData.metrics || {},
    images: entryData.images || [],
    weather: window.lastWeatherData ? {
      temperature: window.lastWeatherData.current_weather.temperature,
      weatherCode: window.lastWeatherData.current_weather.weathercode,
      precipitation: window.lastWeatherData.daily.precipitation_sum[0] || 0
    } : null,
    timestamp: Date.now()
  };
  
  entries.push(newEntry);
  saveJournalEntries(entries);
  return newEntry;
}

/**
 * Update an existing journal entry
 * @param {string} id - ID of the entry to update
 * @param {Object} updatedData - New data to apply
 * @returns {Object|null} The updated entry or null if not found
 */
export function updateJournalEntry(id, updatedData) {
  const entries = getJournalEntries();
  const index = entries.findIndex(entry => entry.id === id);
  
  if (index !== -1) {
    entries[index] = { ...entries[index], ...updatedData, timestamp: Date.now() };
    saveJournalEntries(entries);
    return entries[index];
  }
  
  return null;
}

/**
 * Delete a journal entry
 * @param {string} id - ID of the entry to delete
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteJournalEntry(id) {
  const entries = getJournalEntries();
  const newEntries = entries.filter(entry => entry.id !== id);
  
  if (newEntries.length !== entries.length) {
    saveJournalEntries(newEntries);
    return true;
  }
  
  return false;
}

/**
 * Export journal entries to JSON
 * @param {boolean} includeImages - Whether to include images in export
 */
export function exportJournal(includeImages = true) {
  const entries = getJournalEntries();
  
  // If no entries, show message
  if (entries.length === 0) {
    alert('No journal entries to export.');
    return;
  }
  
  // Clone entries to avoid modifying the original data
  let exportData = JSON.parse(JSON.stringify(entries));
  
  // Remove images if not including them
  if (!includeImages) {
    exportData = exportData.map(entry => {
      const entryCopy = {...entry};
      delete entryCopy.images;
      return entryCopy;
    });
  }
  
  // Create the export file
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  // Generate filename with timestamp
  const date = new Date().toISOString().slice(0, 10);
  const filename = `garden_journal_${date}${includeImages ? '_with_images' : '_no_images'}.json`;
  
  // Create download link and trigger download
  const link = document.createElement('a');
  link.setAttribute('href', dataUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Handle importing journal entries
 * @param {Array} importData - Imported journal entries
 * @param {boolean} isMerge - Whether to merge with existing entries (true) or replace (false)
 */
export function handleImport(importData, isMerge) {
  if (!importData || !Array.isArray(importData) || importData.length === 0) {
    alert('No valid journal entries found in the import file.');
    return;
  }
  
  let currentEntries = isMerge ? getJournalEntries() : [];
  
  // For merge, we need to check for duplicates by ID
  if (isMerge) {
    const existingIds = new Set(currentEntries.map(entry => entry.id));
    
    importData.forEach(entry => {
      if (!existingIds.has(entry.id)) {
        currentEntries.push(entry);
      } else {
        // For duplicates, update the existing entry
        const index = currentEntries.findIndex(e => e.id === entry.id);
        currentEntries[index] = { ...entry, timestamp: Date.now() };
      }
    });
  } else {
    // For replace, simply use the imported data
    currentEntries = importData;
  }
  
  saveJournalEntries(currentEntries);
  alert(`Successfully ${isMerge ? 'merged' : 'replaced'} with ${importData.length} entries.`);
  window.location.reload(); // Refresh page to show changes
}

// Image-related utilities
/**
 * Convert a file to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - Promise resolving to base64 string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

/**
 * Compress an image to reduce storage size
 * @param {string} base64Image - The base64 image to compress
 * @param {number} maxWidth - Maximum width of the compressed image
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<string>} - Promise resolving to compressed base64 image
 */
export function compressImage(base64Image, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Image;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.floor(height * (maxWidth / width));
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
}

/**
 * Generate a thumbnail from a base64 image
 * @param {string} base64Image - The base64 image
 * @param {number} size - Thumbnail size (width/height)
 * @returns {Promise<string>} - Promise resolving to thumbnail base64 image
 */
export function generateThumbnail(base64Image, size = 150) {
  return compressImage(base64Image, size, 0.5);
}

/**
 * Helper to get storage usage stats
 * @returns {Object} - Storage usage information
 */
export function getStorageUsage() {
  const entries = getJournalEntries();
  const entriesJson = JSON.stringify(entries);
  const totalSize = entriesJson.length;
  const imageSize = entries.reduce((sum, entry) => {
    return sum + (entry.images ? entry.images.reduce((imgSum, img) => imgSum + (img.length || 0), 0) : 0);
  }, 0);
  
  return {
    totalSize,
    imageSize,
    textSize: totalSize - imageSize,
    entryCount: entries.length
  };
}

/**
 * Convert weather code to UI elements
 * @param {number} code - Weather code
 * @returns {Object} - Icon, text, and color for the weather
 */
export function weatherCodeToIconTextColor(code) {
  // WMO Weather interpretation codes (WW)
  const weatherCodes = {
    0: { icon: '☀️', text: 'Clear sky', color: '#FFD700' },
    1: { icon: '🌤️', text: 'Mainly clear', color: '#FFD700' },
    2: { icon: '⛅', text: 'Partly cloudy', color: '#ADD8E6' },
    3: { icon: '☁️', text: 'Overcast', color: '#778899' },
    // Fog codes
    45: { icon: '🌫️', text: 'Fog', color: '#D3D3D3' },
    48: { icon: '🌫️', text: 'Depositing rime fog', color: '#D3D3D3' },
    // Drizzle codes
    51: { icon: '🌦️', text: 'Light drizzle', color: '#87CEEB' },
    53: { icon: '🌦️', text: 'Moderate drizzle', color: '#6495ED' },
    55: { icon: '🌧️', text: 'Dense drizzle', color: '#4682B4' },
    // Freezing drizzle codes
    56: { icon: '🌨️', text: 'Light freezing drizzle', color: '#B0E0E6' },
    57: { icon: '🌨️', text: 'Dense freezing drizzle', color: '#87CEFA' },
    // Rain codes
    61: { icon: '🌧️', text: 'Slight rain', color: '#4682B4' },
    63: { icon: '🌧️', text: 'Moderate rain', color: '#4169E1' },
    65: { icon: '🌧️', text: 'Heavy rain', color: '#191970' },
    // Freezing rain codes
    66: { icon: '🌨️', text: 'Light freezing rain', color: '#B0C4DE' },
    67: { icon: '🌨️', text: 'Heavy freezing rain', color: '#6A5ACD' },
    // Snow codes
    71: { icon: '❄️', text: 'Slight snow fall', color: '#E0FFFF' },
    73: { icon: '❄️', text: 'Moderate snow fall', color: '#E0FFFF' },
    75: { icon: '❄️', text: 'Heavy snow fall', color: '#E0FFFF' },
    // Snow grains
    77: { icon: '❄️', text: 'Snow grains', color: '#E0FFFF' },
    // Rain showers
    80: { icon: '🌦️', text: 'Slight rain showers', color: '#4682B4' },
    81: { icon: '🌦️', text: 'Moderate rain showers', color: '#4169E1' },
    82: { icon: '🌦️', text: 'Violent rain showers', color: '#191970' },
    // Snow showers
    85: { icon: '🌨️', text: 'Slight snow showers', color: '#E0FFFF' },
    86: { icon: '🌨️', text: 'Heavy snow showers', color: '#E0FFFF' },
    // Thunderstorm
    95: { icon: '⛈️', text: 'Thunderstorm', color: '#4B0082' },
    96: { icon: '⛈️', text: 'Thunderstorm with slight hail', color: '#4B0082' },
    99: { icon: '⛈️', text: 'Thunderstorm with heavy hail', color: '#4B0082' }
  };
  
  return weatherCodes[code] || { icon: '❓', text: 'Unknown', color: '#808080' };
} 