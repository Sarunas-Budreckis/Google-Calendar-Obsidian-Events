const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const { URL } = require('url');
const { exec } = require('child_process');
require('dotenv').config();

const AUTH_PING_PATH = '/__gcal_auth_ping';

class GoogleCalendarAPI {
    constructor() {
        this.oauth2Client = null;
        this.calendar = null;
        this.tokenPath = path.join(__dirname, 'token.json');
        this.lastAuth = null;
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

            // Check if running in non-interactive mode (no stdin)
            const isInteractive = process.stdin.isTTY;

            if (!isInteractive) {
                return await this.authenticateViaLocalCallback();
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

    async openAuthInBrowser(authUrl) {
        if (process.platform !== 'win32') return;
        try {
            exec(`start "" "${authUrl}"`);
        } catch (error) {
            // Non-fatal
        }
    }

    async isAuthServerRunning(port) {
        return await new Promise((resolve) => {
            const req = http.request({
                hostname: '127.0.0.1',
                port,
                path: AUTH_PING_PATH,
                method: 'GET',
                timeout: 800
            }, (res) => {
                const ok = res.statusCode === 200 && res.headers['x-gcal-auth'] === '1';
                res.on('data', () => {});
                res.on('end', () => resolve(ok));
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        });
    }

    async startAuthServer(port, expectedPath) {
        return await new Promise((resolve) => {
            const server = http.createServer(async (req, res) => {
                try {
                    const reqUrl = new URL(req.url, `http://localhost:${port}`);
                    if (reqUrl.pathname === AUTH_PING_PATH) {
                        res.writeHead(200, { 'Content-Type': 'text/plain', 'x-gcal-auth': '1' });
                        res.end('OK');
                        return;
                    }
                    if (reqUrl.pathname !== expectedPath) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Not Found');
                        return;
                    }
                    const code = reqUrl.searchParams.get('code');
                    if (!code) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Missing "code" parameter.');
                        return;
                    }
                    const { tokens } = await this.oauth2Client.getToken(code);
                    this.oauth2Client.setCredentials(tokens);
                    await this.saveToken(tokens);
                    this.lastAuth = null;

                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<html><body><h2>Authentication complete.</h2><p>You can close this tab.</p></body></html>');
                    server.close();
                    resolve({ server, authenticated: true });
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Authentication failed. Check the app logs.');
                    server.close();
                    resolve({ server, authenticated: false });
                }
            });

            server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    resolve(null);
                    return;
                }
                resolve({ server: null, error });
            });

            server.listen(port, '127.0.0.1', () => resolve({ server }));
        });
    }

    async authenticateViaLocalCallback() {
        try {
            const redirectUri = process.env.GOOGLE_REDIRECT_URI;
            if (!redirectUri) {
                console.error('AUTHENTICATION_REQUIRED');
                console.error('Missing GOOGLE_REDIRECT_URI in .env');
                this.lastAuth = null;
                return false;
            }

            let redirect;
            try {
                redirect = new URL(redirectUri);
            } catch (error) {
                console.error('AUTHENTICATION_REQUIRED');
                console.error('Invalid GOOGLE_REDIRECT_URI:', redirectUri);
                this.lastAuth = null;
                return false;
            }

            const expectedPath = redirect.pathname || '/oauth2callback';
            const basePort = redirect.port ? Number(redirect.port) : 80;
            if (!Number.isFinite(basePort) || basePort <= 0) {
                console.error('AUTHENTICATION_REQUIRED');
                console.error('Invalid GOOGLE_REDIRECT_URI port:', redirectUri);
                this.lastAuth = null;
                return false;
            }

            const candidatePorts = [basePort, basePort + 1, basePort + 2, basePort + 3, basePort + 4];
            let selectedPort = null;
            let serverHandle = null;
            let reused = false;
            let fallbackNote = null;

            for (const port of candidatePorts) {
                const isRunning = await this.isAuthServerRunning(port);
                if (isRunning) {
                    selectedPort = port;
                    reused = true;
                    break;
                }
                const serverResult = await this.startAuthServer(port, expectedPath);
                if (!serverResult) {
                    continue;
                }
                if (serverResult.error) {
                    console.error('AUTHENTICATION_REQUIRED');
                    console.error('Failed to start local callback server:', serverResult.error.message);
                    this.lastAuth = null;
                    return false;
                }
                selectedPort = port;
                serverHandle = serverResult.server;
                break;
            }

            if (!selectedPort) {
                console.error('AUTHENTICATION_REQUIRED');
                console.error('Failed to find an available localhost port for auth callback.');
                this.lastAuth = null;
                return false;
            }

            if (selectedPort !== basePort) {
                fallbackNote = `Using alternate port ${selectedPort} (base ${basePort} unavailable). Ensure this redirect URI is authorized in Google Cloud.`;
            }

            const effectiveRedirect = new URL(redirectUri);
            effectiveRedirect.port = String(selectedPort);
            const effectiveRedirectUri = effectiveRedirect.toString();
            this.oauth2Client.redirectUri = effectiveRedirectUri;

            const authUrl = this.oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: ['https://www.googleapis.com/auth/calendar.readonly']
            });

            console.log('AUTHENTICATION_REQUIRED');
            console.log(`AUTH_URL:${authUrl}`);
            console.log(`Click to authorize Google Calendar: [Open Google Auth](${authUrl})`);
            if (fallbackNote) {
                console.log(fallbackNote);
            }

            this.lastAuth = {
                url: authUrl,
                redirectUri: effectiveRedirectUri,
                port: selectedPort,
                path: expectedPath,
                reused,
                note: fallbackNote,
                error: null
            };

            await this.openAuthInBrowser(authUrl);

            if (!serverHandle || reused) {
                return false;
            }

            // Safety timeout
            setTimeout(() => {
                try {
                    serverHandle.close();
                } catch (error) {
                    // ignore
                }
            }, 5 * 60 * 1000);

            return false;
        } catch (error) {
            console.error('Authentication failed:', error.message);
            this.lastAuth = null;
            return false;
        }
    }

    async getEvents(startDate, endDate, retryCount = 0) {
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
            // Check for authentication errors
            if (retryCount === 0 && (
                error.message.includes('No access, refresh token') ||
                error.message.includes('invalid_grant') ||
                error.message.includes('invalid_token')
            )) {
                console.log('Authentication error detected. Starting re-authentication...\n');

                // Delete the invalid token
                try {
                    await fs.unlink(this.tokenPath);
                } catch (unlinkError) {
                    // Ignore if file doesn't exist
                }

                // Clear existing credentials
                this.oauth2Client.setCredentials({});

                // Run authentication
                const authSuccess = await this.authenticate();

                if (authSuccess) {
                    console.log('Re-authentication successful. Retrying request...\n');
                    // Retry the request once after successful authentication
                    return await this.getEvents(startDate, endDate, retryCount + 1);
                } else if (this.lastAuth) {
                    throw new Error('AUTH_PENDING');
                } else {
                    throw new Error('Re-authentication failed');
                }
            }

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

            // Filter out events without summaries AND exclude actual Sleep calendar events
            // (Sleep boundary markers will be added separately)
            const validEvents = customDayEvents
                .filter(event => {
                    if (!event.summary || event.summary.trim() === '') return false;
                    // Exclude actual Sleep events from Google Calendar (not boundary markers)
                    if (event.summary.toLowerCase().includes('sleep') && !event.isBoundary) return false;
                    return true;
                });

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
            // Check if it's an invalid_grant error
            if (error.message && error.message.includes('invalid_grant')) {
                console.log('Token refresh failed: invalid_grant');
                console.log('Starting re-authentication...\n');

                // Delete the invalid token
                try {
                    await fs.unlink(this.tokenPath);
                } catch (unlinkError) {
                    // Ignore if file doesn't exist
                }

                // Run authentication
                const authSuccess = await this.authenticate();
                return authSuccess;
            }

            console.error('Token refresh failed:', error.message);
            return false;
        }
    }

    /**
     * Test authentication by making an actual API call
     * This verifies the credentials actually work
     */
    async testAuthentication() {
        try {
            if (!this.oauth2Client || !this.oauth2Client.credentials) {
                return false;
            }

            // Try to make a simple API call to test credentials
            const testDate = new Date();
            const endDate = new Date(testDate.getTime() + 1000); // 1 second later

            await this.calendar.events.list({
                calendarId: process.env.CALENDAR_ID || 'primary',
                timeMin: testDate.toISOString(),
                timeMax: endDate.toISOString(),
                maxResults: 1,
                singleEvents: true
            });

            return true;
        } catch (error) {
            // If we get any error, credentials are not valid
            console.log('Credential test failed:', error.message);

            // Delete invalid token
            try {
                await fs.unlink(this.tokenPath);
            } catch (unlinkError) {
                // Ignore if file doesn't exist
            }

            return false;
        }
    }
}

module.exports = GoogleCalendarAPI;
