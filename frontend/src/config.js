/**
 * API Configuration
 * Uses environment variable REACT_APP_API_URL
 * Falls back to localhost for development
 */

const API_URL = process.env.REACT_APP_API_URL || 'https://aiclone-backend.onrender.com';

// Validate API URL
if (!API_URL) {
  console.warn('⚠️ API_URL is not configured. API calls may fail.');
}

export default API_URL;
