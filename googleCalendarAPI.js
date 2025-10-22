const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class GoogleCalendarAPI {
    constructor() {
        this.oauth2Client = null;
        this.calendar = null;
        this.tokenPath = path.join(__dirname, 'token.json');
    }

    async initialize() {
        try {
            // Load OAuth credentials from environment
            const credentials = {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uris: [process.env.GOOGLE_REDIRECT_URI]
            };

            if (!credentials.client_id || !credentials.client_secret) {
                throw new Error('Google OAuth credentials not found. Please check your .env file.');
            }

            // Create OAuth2 client
            this.oauth2Client = new google.auth.OAuth2(
                credentials.client_id,
                credentials.client_secret,
                credentials.redirect_uris[0]
            );

            // Try to load existing token
            await this.loadToken();
            
            // Initialize Calendar API
            this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

            return true;
        } catch (error) {
            console.error('Failed to initialize Google Calendar API:', error.message);
            return false;
        }
    }

    async loadToken() {
        try {
            const token = await fs.readFile(this.tokenPath, 'utf8');
            this.oauth2Client.setCredentials(JSON.parse(token));
        } catch (error) {
            // Token file doesn't exist or is invalid, will need to authenticate
            console.log('No existing token found. Authentication required.');
        }
    }

    async saveToken(token) {
        try {
            await fs.writeFile(this.tokenPath, JSON.stringify(token));
            console.log('Token saved successfully.');
        } catch (error) {
            console.error('Failed to save token:', error.message);
        }
    }

    async authenticate() {
        try {
            // Check if we already have valid credentials
            if (this.oauth2Client.credentials && this.oauth2Client.credentials.access_token) {
                return true;
            }

            // Generate auth URL
            const authUrl = this.oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: ['https://www.googleapis.com/auth/calendar.readonly']
            });

            console.log('Authorize this app by visiting this url:', authUrl);
            console.log('After authorization, you will be redirected to a localhost URL.');
            console.log('Copy the "code" parameter from the URL and paste it here.');

            // In a real Obsidian environment, this would need to be handled differently
            // For now, we'll simulate getting the code
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            return new Promise((resolve) => {
                rl.question('Enter the authorization code: ', async (code) => {
                    try {
                        const { tokens } = await this.oauth2Client.getToken(code);
                        this.oauth2Client.setCredentials(tokens);
                        await this.saveToken(tokens);
                        rl.close();
                        resolve(true);
                    } catch (error) {
                        console.error('Error retrieving access token:', error.message);
                        rl.close();
                        resolve(false);
                    }
                });
            });
        } catch (error) {
            console.error('Authentication failed:', error.message);
            return false;
        }
    }

    async getEvents(startDate, endDate) {
        try {
            if (!this.calendar) {
                throw new Error('Calendar API not initialized');
            }

            const response = await this.calendar.events.list({
                calendarId: process.env.CALENDAR_ID || 'primary',
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime'
            });

            return response.data.items || [];
        } catch (error) {
            console.error('Error fetching events:', error.message);
            throw error;
        }
    }

    /**
     * Get events for a specific date using custom day boundaries
     * @param {Date} targetDate - The date to get events for
     * @returns {Array} - Array of event objects within the custom day boundaries
     */
    async getEventsForCustomDay(targetDate) {
        try {
            const DateUtils = require('./dateUtils');
            
            // Get a wider date range to include sleep events from adjacent days
            const { startDate, endDate } = DateUtils.getDateRangeForFetching(targetDate);
            
            // Fetch all events in the range
            const allEvents = await this.getEvents(startDate, endDate);
            
            // Filter events to custom day boundaries
            const customDayEvents = DateUtils.getEventsForCustomDay(targetDate, allEvents);
            
            // Filter out events without summaries
            const validEvents = customDayEvents
                .filter(event => event.summary && event.summary.trim() !== '');
            
            // Add wake up and sleep times
            const eventsWithBoundaries = this.addDayBoundaries(targetDate, allEvents, validEvents);
            
            return eventsWithBoundaries;
                
        } catch (error) {
            console.error('Error fetching events for custom day:', error.message);
            throw error;
        }
    }

    /**
     * Add wake up and sleep times to the events list
     * @param {Date} targetDate - The target date
     * @param {Array} allEvents - All events from the date range
     * @param {Array} customDayEvents - Events within custom day boundaries
     * @returns {Array} - Events with wake up and sleep times added
     */
    addDayBoundaries(targetDate, allEvents, customDayEvents) {
        const DateUtils = require('./dateUtils');
        const events = [...customDayEvents];
        
        // Get day boundaries
        const dayStart = DateUtils.getDayStartTime(targetDate, allEvents);
        const dayEnd = DateUtils.getDayEndTime(targetDate, allEvents);
        
        // Add wake up time at the beginning
        const wakeUpEvent = {
            summary: 'Wake Up',
            start: { dateTime: dayStart.toISOString() },
            end: { dateTime: dayStart.toISOString() },
            isBoundary: true
        };
        
        // Add sleep time at the end
        const sleepEvent = {
            summary: 'Sleep',
            start: { dateTime: dayEnd.toISOString() },
            end: { dateTime: dayEnd.toISOString() },
            isBoundary: true
        };
        
        // Insert wake up at the beginning
        events.unshift(wakeUpEvent);
        
        // Add sleep at the end
        events.push(sleepEvent);
        
        return events;
    }

    async isAuthenticated() {
        try {
            if (!this.oauth2Client || !this.oauth2Client.credentials) {
                return false;
            }

            // Try to refresh token if needed
            if (this.oauth2Client.isTokenExpiring()) {
                const { credentials } = await this.oauth2Client.refreshAccessToken();
                this.oauth2Client.setCredentials(credentials);
                await this.saveToken(credentials);
            }

            return true;
        } catch (error) {
            console.error('Token refresh failed:', error.message);
            return false;
        }
    }
}

module.exports = GoogleCalendarAPI;
