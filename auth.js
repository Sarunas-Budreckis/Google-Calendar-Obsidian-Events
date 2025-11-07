#!/usr/bin/env node
/**
 * Authentication script for Google Calendar API
 * This script handles the OAuth flow and saves the token
 */

const GoogleCalendarAPI = require('./googleCalendarAPI');

async function authenticate() {
    console.log('🔐 Starting Google Calendar Authentication...\n');
    
    const calendarAPI = new GoogleCalendarAPI();
    
    try {
        // Initialize the API
        console.log('Initializing Google Calendar API...');
        const initialized = await calendarAPI.initialize();
        if (!initialized) {
            throw new Error('Failed to initialize Google Calendar API');
        }
        
        // Check if already authenticated by actually testing the token
        console.log('Checking existing credentials...');
        const isAuthenticated = await calendarAPI.testAuthentication();
        if (isAuthenticated) {
            console.log('✅ Already authenticated!');
            return true;
        }

        console.log('Existing credentials are invalid or expired. Starting new authentication...');
        
        // Start authentication flow
        console.log('🔑 Starting OAuth authentication...');
        const authSuccess = await calendarAPI.authenticate();
        
        if (authSuccess) {
            console.log('✅ Authentication successful!');
            console.log('🎉 You can now use the Google Calendar integration.');
            return true;
        } else {
            console.log('❌ Authentication failed.');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Authentication error:', error.message);
        return false;
    }
}

// Run authentication
if (require.main === module) {
    authenticate().then(success => {
        if (success) {
            console.log('\n🚀 Ready to use! Try running: node cli.js 2024-10-22');
        } else {
            console.log('\n🔧 Please check your .env file and try again.');
        }
        process.exit(success ? 0 : 1);
    });
}

module.exports = authenticate;
