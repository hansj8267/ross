// daily-briefing.mjs
// Called on first launch of the day
// Fetches weather + calendar + assignments and speaks a morning briefing

import { speak, speakLocal, askClaude, saveFact, getFact } from './ross-core.mjs';
import os from 'os';
import path from 'path';

// ── Check if briefing already done today ─────────────────────

export function shouldDoMorningBriefing() {
  const today = new Date().toDateString();
  const lastBriefing = getFact('last_briefing_date');
  return lastBriefing !== today;
}

export function markBriefingDone() {
  saveFact('last_briefing_date', new Date().toDateString());
}

// ── Fetch weather (free, no API key needed) ──────────────────

async function getWeather() {
  try {
    // Use wttr.in — free weather API, no key needed
    const response = await fetch('https://wttr.in/?format=j1', {
      headers: { 'User-Agent': 'Ross-Agent/1.0' }
    });
    const data = await response.json();
    const current = data.current_condition[0];
    const area = data.nearest_area[0];

    const city = area.areaName[0].value;
    const temp = current.temp_F + '°F';
    const desc = current.weatherDesc[0].value;
    const feelsLike = current.FeelsLikeF + '°F';
    const humidity = current.humidity + '%';

    return { city, temp, desc, feelsLike, humidity, ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Fetch Google Calendar events ──────────────────────────────

async function getTodayEvents() {
  try {
    const keytar = await import('keytar');
    const accessToken = await keytar.default.getPassword('ross', 'GOOGLE_ACCESS_TOKEN');
    if (!accessToken) return { ok: false, reason: 'not_connected' };

    const now = new Date();
    const startOfDay = new Date(now.setHours(0,0,0,0)).toISOString();
    const endOfDay   = new Date(now.setHours(23,59,59,999)).toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(startOfDay)}&` +
      `timeMax=${encodeURIComponent(endOfDay)}&` +
      `singleEvents=true&orderBy=startTime`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (response.status === 401) return { ok: false, reason: 'token_expired' };

    const data = await response.json();
    const events = (data.items || []).map(e => ({
      title: e.summary || 'Untitled',
      time: e.start?.dateTime
        ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : 'All day',
    }));

    return { ok: true, events };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

// ── Fetch Canvas assignments ──────────────────────────────────

async function getUpcomingAssignments() {
  try {
    const keytar = await import('keytar');
    const token    = await keytar.default.getPassword('ross', 'CANVAS_TOKEN');
    const canvasUrl = await keytar.default.getPassword('ross', 'CANVAS_URL');
    if (!token || !canvasUrl) return { ok: false, reason: 'not_connected' };

    const response = await fetch(`${canvasUrl}/api/v1/courses?enrollment_state=active&per_page=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const courses = await response.json();
    const assignments = [];

    for (const course of courses.slice(0, 5)) {
      const aRes = await fetch(
        `${canvasUrl}/api/v1/courses/${course.id}/assignments?order_by=due_at&per_page=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const courseAssignments = await aRes.json();

      const upcoming = courseAssignments.filter(a => {
        if (!a.due_at) return false;
        const due = new Date(a.due_at);
        const now = new Date();
        const inWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return due >= now && due <= inWeek;
      });

      upcoming.forEach(a => assignments.push({
        course: course.name,
        title: a.name,
        due: new Date(a.due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      }));
    }

    return { ok: true, assignments };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

// ── Build and speak the morning briefing ─────────────────────

export async function doMorningBriefing(send) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dayName  = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  send?.('status', { state: 'SPEAKING' });

  // Gather all data in parallel
  const [weather, calendarData, schoolData] = await Promise.all([
    getWeather(),
    getTodayEvents(),
    getUpcomingAssignments(),
  ]);

  // Build briefing text
  let briefing = `${greeting}. Today is ${dayName}. `;

  // Weather
  if (weather.ok) {
    briefing += `It's currently ${weather.temp} and ${weather.desc.toLowerCase()} in ${weather.city}, feeling like ${weather.feelsLike}. `;
  }

  // Calendar
  if (calendarData.ok && calendarData.events.length > 0) {
    briefing += `You have ${calendarData.events.length} event${calendarData.events.length > 1 ? 's' : ''} today. `;
    calendarData.events.slice(0, 3).forEach(e => {
      briefing += `${e.title} at ${e.time}. `;
    });
  } else if (calendarData.ok) {
    briefing += `Your calendar is clear today. `;
  }

  // School assignments
  if (schoolData.ok && schoolData.assignments.length > 0) {
    briefing += `You have ${schoolData.assignments.length} assignment${schoolData.assignments.length > 1 ? 's' : ''} due this week. `;
    schoolData.assignments.slice(0, 3).forEach(a => {
      briefing += `${a.title} for ${a.course}, due ${a.due}. `;
    });
  }

  briefing += "What do you need today?";

  // Send to UI
  send?.('reply', { text: briefing });
  markBriefingDone();

  // Speak it
  try {
    await speak(briefing);
  } catch {
    await speakLocal(briefing);
  }

  send?.('status', { state: 'STANDBY' });
}
