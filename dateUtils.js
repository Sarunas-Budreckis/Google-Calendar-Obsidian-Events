/**
 * Custom day boundary logic based on "Sleep" events
 * A "day" is defined as:
 * - Start: After the last "Sleep" event in the chosen day (or 12:01 AM if none)
 * - End: Before the first "Sleep" event in the subsequent day (or 5:00 AM next day if none)
 */

class DateUtils {
    /**
     * Find the start time for a custom day
     * @param {Date} targetDate - The date to find the start time for
     * @param {Array} events - All events for the target date
     * @returns {Date} - The start time for the custom day
     */
    static getDayStartTime(targetDate, events) {
        // Default start time: 12:01 AM of target date
        const defaultStart = new Date(targetDate);
        defaultStart.setHours(0, 1, 0, 0);

        // Find all "Sleep" events on the target date
        const sleepEvents = this.findSleepEvents(targetDate, events);
        
        if (sleepEvents.length === 0) {
            return defaultStart;
        }

        // Find the last "Sleep" event that ends on the target date
        const lastSleepEvent = sleepEvents
            .filter(event => {
                const endTime = this.getEventEndTime(event);
                return this.isSameDay(endTime, targetDate);
            })
            .sort((a, b) => {
                const endTimeA = this.getEventEndTime(a);
                const endTimeB = this.getEventEndTime(b);
                return endTimeB - endTimeA; // Sort by end time, latest first
            })[0];

        if (lastSleepEvent) {
            return this.getEventEndTime(lastSleepEvent);
        }

        return defaultStart;
    }

    /**
     * Find the end time for a custom day
     * @param {Date} targetDate - The date to find the end time for
     * @param {Array} events - All events for the target date and next day
     * @returns {Date} - The end time for the custom day
     */
    static getDayEndTime(targetDate, events) {
        // Default end time: 5:00 AM of next day
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(5, 0, 0, 0);

        // Find all "Sleep" events on the next day
        const nextDayEvents = events.filter(event => {
            const startTime = this.getEventStartTime(event);
            return this.isSameDay(startTime, nextDay);
        });

        const sleepEvents = this.findSleepEvents(nextDay, nextDayEvents);
        
        if (sleepEvents.length === 0) {
            return nextDay;
        }

        // Find the first "Sleep" event on the next day
        const firstSleepEvent = sleepEvents
            .sort((a, b) => {
                const startTimeA = this.getEventStartTime(a);
                const startTimeB = this.getEventStartTime(b);
                return startTimeA - startTimeB; // Sort by start time, earliest first
            })[0];

        if (firstSleepEvent) {
            return this.getEventStartTime(firstSleepEvent);
        }

        return nextDay;
    }

    /**
     * Find all events with "Sleep" in the title (case insensitive)
     * @param {Date} date - The date to search for sleep events
     * @param {Array} events - All events to search through
     * @returns {Array} - Array of sleep events
     */
    static findSleepEvents(date, events) {
        return events.filter(event => {
            const eventDate = this.getEventStartTime(event);
            return this.isSameDay(eventDate, date) && 
                   event.summary && 
                   event.summary.toLowerCase().includes('sleep');
        });
    }

    /**
     * Filter events within the custom day boundaries
     * @param {Date} targetDate - The target date
     * @param {Array} allEvents - All events from the date range
     * @returns {Array} - Events within the custom day boundaries
     */
    static getEventsForCustomDay(targetDate, allEvents) {
        const startTime = this.getDayStartTime(targetDate, allEvents);
        const endTime = this.getDayEndTime(targetDate, allEvents);

        return allEvents.filter(event => {
            // Skip all-day events
            if (this.isAllDayEvent(event)) {
                return false;
            }

            const eventStart = this.getEventStartTime(event);
            const eventEnd = this.getEventEndTime(event);

            // Include events that:
            // 1. Start within the custom day boundaries, OR
            // 2. End within the custom day boundaries, OR  
            // 3. Span across the entire custom day period
            return (eventStart >= startTime && eventStart < endTime) ||
                   (eventEnd > startTime && eventEnd <= endTime) ||
                   (eventStart < startTime && eventEnd > endTime);
        });
    }

    /**
     * Check if an event is an all-day event
     * @param {Object} event - Calendar event object
     * @returns {Boolean} - True if all-day event
     */
    static isAllDayEvent(event) {
        return event.start && event.start.date && !event.start.dateTime;
    }

    /**
     * Get the start time of an event
     * @param {Object} event - Calendar event object
     * @returns {Date} - Event start time
     */
    static getEventStartTime(event) {
        if (event.start.dateTime) {
            return new Date(event.start.dateTime);
        } else if (event.start.date) {
            return new Date(event.start.date);
        }
        return new Date();
    }

    /**
     * Get the end time of an event
     * @param {Object} event - Calendar event object
     * @returns {Date} - Event end time
     */
    static getEventEndTime(event) {
        if (event.end.dateTime) {
            return new Date(event.end.dateTime);
        } else if (event.end.date) {
            return new Date(event.end.date);
        }
        return new Date();
    }

    /**
     * Check if two dates are on the same day
     * @param {Date} date1 - First date
     * @param {Date} date2 - Second date
     * @returns {Boolean} - True if same day
     */
    static isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    /**
     * Create a date range for fetching events (includes day before and after for sleep detection)
     * @param {Date} targetDate - The target date
     * @returns {Object} - Object with start and end dates
     */
    static getDateRangeForFetching(targetDate) {
        const startDate = new Date(targetDate);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(targetDate);
        endDate.setDate(endDate.getDate() + 2);
        endDate.setHours(23, 59, 59, 999);

        return { startDate, endDate };
    }
}

module.exports = DateUtils;
