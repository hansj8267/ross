// calendar-tools.mjs
// Google Calendar integration for Ross
// Read, create, update, delete events

import keytar from 'keytar';

// ── Token management ──────────────────────────────────────────

async function getAccessToken() {
  let accessToken = await keytar.getPassword('ross', 'GOOGLE_ACCESS_TOKEN');
  const refreshToken = await keytar.getPassword('ross', 'GOOGLE_REFRESH_TOKEN');
  const clientId = await keytar.getPassword('ross', 'GOOGLE_CLIENT_ID');
  const clientSecret = await keytar.getPassword('ross', 'GOOGLE_CLIENT_SECRET');

  if (!refreshToken) throw new Error('Google Calendar not connected. Run: node setup-google.mjs');

  // Try current token
  const test = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  // If expired, refresh
  if (test.status === 401) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const tokens = await res.json();
    if (tokens.error) throw new Error('Token refresh failed: ' + tokens.error);
    accessToken = tokens.access_token;
    await keytar.setPassword('ross', 'GOOGLE_ACCESS_TOKEN', accessToken);
  }

  return accessToken;
}

// ── Helper: parse natural language date/time ─────────────────

function parseDateTime(dateStr, timeStr) {
  const now = new Date();
  let date = new Date(now);

  // Parse date
  const lower = (dateStr || '').toLowerCase();
  if (lower.includes('today')) {
    // keep today
  } else if (lower.includes('tomorrow')) {
    date.setDate(date.getDate() + 1);
  } else if (lower.includes('monday') || lower.includes('mon')) {
    date = nextWeekday(1);
  } else if (lower.includes('tuesday') || lower.includes('tue')) {
    date = nextWeekday(2);
  } else if (lower.includes('wednesday') || lower.includes('wed')) {
    date = nextWeekday(3);
  } else if (lower.includes('thursday') || lower.includes('thu')) {
    date = nextWeekday(4);
  } else if (lower.includes('friday') || lower.includes('fri')) {
    date = nextWeekday(5);
  } else if (lower.includes('saturday') || lower.includes('sat')) {
    date = nextWeekday(6);
  } else if (lower.includes('sunday') || lower.includes('sun')) {
    date = nextWeekday(0);
  } else if (dateStr) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed)) date = parsed;
  }

  // Parse time
  if (timeStr) {
    const t = timeStr.toLowerCase().trim();
    const match = t.match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2] || '0');
      const ampm = match[3];
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      date.setHours(hours, minutes, 0, 0);
    }
  }

  return date;
}

function nextWeekday(day) {
  const now = new Date();
  const result = new Date(now);
  const diff = (day - now.getDay() + 7) % 7 || 7;
  result.setDate(now.getDate() + diff);
  return result;
}

// ── Calendar Tools ────────────────────────────────────────────

export const calendarTools = {

  // List today's events
  async listTodayEvents() {
    const token = await getAccessToken();
    const now = new Date();
    const start = new Date(now); start.setHours(0,0,0,0);
    const end   = new Date(now); end.setHours(23,59,59,999);

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(start.toISOString())}&` +
      `timeMax=${encodeURIComponent(end.toISOString())}&` +
      `singleEvents=true&orderBy=startTime`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    return data.items || [];
  },

  // List events for a date range
  async listEvents(daysAhead = 7) {
    const token = await getAccessToken();
    const start = new Date();
    const end   = new Date();
    end.setDate(end.getDate() + daysAhead);

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(start.toISOString())}&` +
      `timeMax=${encodeURIComponent(end.toISOString())}&` +
      `singleEvents=true&orderBy=startTime&maxResults=20`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    return data.items || [];
  },

  // Create an event
  async createEvent({ title, date, time, duration = 60, description = '' }) {
    const token = await getAccessToken();
    const start = parseDateTime(date, time);
    const end   = new Date(start.getTime() + duration * 60 * 1000);

    const event = {
      summary: title,
      description,
      start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end:   { dateTime: end.toISOString(),   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    return {
      id: data.id,
      title: data.summary,
      start: new Date(data.start.dateTime).toLocaleString(),
    };
  },

  // Delete an event by searching title
  async deleteEvent(titleQuery) {
    const token = await getAccessToken();
    const events = await this.listEvents(30);
    const match = events.find(e =>
      e.summary?.toLowerCase().includes(titleQuery.toLowerCase())
    );

    if (!match) return { found: false, message: `No event found matching "${titleQuery}"` };

    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${match.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    return { found: true, deleted: match.summary };
  },

  // Find free time slots
  async findFreeSlots(durationMinutes = 60, daysAhead = 7) {
    const events = await this.listEvents(daysAhead);
    const slots = [];
    const now = new Date();

    for (let d = 0; d < daysAhead; d++) {
      const day = new Date(now);
      day.setDate(day.getDate() + d);

      // Work hours: 9am - 6pm
      const workStart = new Date(day); workStart.setHours(9,0,0,0);
      const workEnd   = new Date(day); workEnd.setHours(18,0,0,0);

      const dayEvents = events.filter(e => {
        const eStart = new Date(e.start?.dateTime || e.start?.date);
        return eStart.toDateString() === day.toDateString();
      }).sort((a,b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));

      let cursor = workStart;
      for (const event of dayEvents) {
        const eStart = new Date(event.start.dateTime);
        const eEnd   = new Date(event.end.dateTime);
        const gapMinutes = (eStart - cursor) / 60000;
        if (gapMinutes >= durationMinutes) {
          slots.push({
            day: day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
            time: cursor.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            duration: Math.floor(gapMinutes),
          });
        }
        cursor = eEnd > cursor ? eEnd : cursor;
      }

      // After last event
      const finalGap = (workEnd - cursor) / 60000;
      if (finalGap >= durationMinutes) {
        slots.push({
          day: day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
          time: cursor.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          duration: Math.floor(finalGap),
        });
      }
    }

    return slots.slice(0, 5);
  },
};

// ── Claude tool definitions for calendar ─────────────────────

export const CALENDAR_TOOLS = [
  {
    name: 'list_today_events',
    description: "List all of the user's calendar events for today.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_upcoming_events',
    description: "List upcoming calendar events for the next N days.",
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days ahead to look (default 7)' },
      },
    },
  },
  {
    name: 'create_calendar_event',
    description: "Create a new event on the user's Google Calendar.",
    input_schema: {
      type: 'object',
      properties: {
        title:       { type: 'string', description: 'Event title' },
        date:        { type: 'string', description: 'Date — e.g. "tomorrow", "Friday", "Monday"' },
        time:        { type: 'string', description: 'Time — e.g. "3pm", "14:30", "9am"' },
        duration:    { type: 'number', description: 'Duration in minutes (default 60)' },
        description: { type: 'string', description: 'Optional event description' },
      },
      required: ['title', 'date', 'time'],
    },
  },
  {
    name: 'delete_calendar_event',
    description: "Delete a calendar event by searching for its title.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title or partial title of the event to delete' },
      },
      required: ['title'],
    },
  },
  {
    name: 'find_free_time',
    description: "Find free time slots in the user's calendar for scheduling.",
    input_schema: {
      type: 'object',
      properties: {
        duration_minutes: { type: 'number', description: 'How many minutes of free time needed' },
        days_ahead:       { type: 'number', description: 'How many days ahead to search' },
      },
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────

export async function executeCalendarTool(name, input) {
  switch (name) {
    case 'list_today_events': {
      const events = await calendarTools.listTodayEvents();
      if (events.length === 0) return 'No events today.';
      return events.map(e => {
        const time = e.start?.dateTime
          ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : 'All day';
        return `${time}: ${e.summary}`;
      }).join('\n');
    }

    case 'list_upcoming_events': {
      const events = await calendarTools.listEvents(input.days || 7);
      if (events.length === 0) return 'No upcoming events.';
      return events.map(e => {
        const date = new Date(e.start?.dateTime || e.start?.date);
        return `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${
          e.start?.dateTime ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'All day'
        }: ${e.summary}`;
      }).join('\n');
    }

    case 'create_calendar_event': {
      const result = await calendarTools.createEvent(input);
      return `Created: "${result.title}" on ${result.start}`;
    }

    case 'delete_calendar_event': {
      const result = await calendarTools.deleteEvent(input.title);
      return result.found
        ? `Deleted: "${result.deleted}"`
        : result.message;
    }

    case 'find_free_time': {
      const slots = await calendarTools.findFreeSlots(
        input.duration_minutes || 60,
        input.days_ahead || 7
      );
      if (slots.length === 0) return 'No free slots found in that range.';
      return 'Free slots:\n' + slots.map(s => `${s.day} at ${s.time} (${s.duration} min available)`).join('\n');
    }

    default:
      return `Unknown calendar tool: ${name}`;
  }
}
