# Google Calendar Integration

## Test Button

```button
name 📅 Get Calendar Events
type append template
action GCalEventsList
templater true
```

## Expected Output

```
## 📅 Calendar Events - 10/22/2024

- 08:30 AM - **Wake Up**
- 08:30 AM - **Commandos Stand-Up**
- 09:00 AM - **Cloud Surfers Stand-Up**
- 10:15 AM - **Shower**
- 11:00 AM - **Lutron - In Office**
- 03:00 PM - **CCaaS IT Touchpoint**
- 07:00 PM - **Group Dinner: Kismet Cafe**
- 01:00 AM - **Sleep**
```

## Setup Instructions

1. **Install Dependencies**: Run `npm install` in the project directory
2. **Configure Environment**: Create `.env` file with Google OAuth credentials
3. **Copy Template**: Copy `GCalEventsList.md` to your Templater templates folder
4. **Authenticate**: Run `node main.js` once to authenticate with Google
5. **Test Setup**: Run `node setup-check.js` to verify configuration

## Usage

1. Click the button above
2. Select a date from the picker
3. Calendar events will be inserted into your note

## Direct Terminal Usage

```bash
node cli.js 2024-10-22
```