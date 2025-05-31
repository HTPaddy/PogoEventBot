const axios = require('axios');
const moment = require('moment-timezone');
const config = require('./config.json');
const cheerio = require('cheerio');

function logDebug(message) {
  if (!config.debug) return;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function fetchDescriptionFromLink(link) {
  if (!link) return '';

  try {
    const res = await axios.get(link);
    const $ = cheerio.load(res.data);

    const rawText = $('.event-description, .ContainerBlock__body').first().text().trim();
    const formatted = formatEventDescription(rawText);
    return formatted;
  } catch (err) {
    logDebug(`Fehler beim Holen der Beschreibung von ${link}: ${err.message}`);
    return '';
  }
}

function formatEventDescription(description) {
  const lines = description.split('\n').map(line => line.trim()).filter(Boolean);
  const formattedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 2) {
      formattedLines.push(`• ${line}`);
    } else {
      formattedLines.push(line);
    }
  }

  return formattedLines.join('\n');
}

async function fetchActiveItems(timezone = 'Europe/Berlin') {
  const url = 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json';

  try {
    const response = await axios.get(url);
    const events = response.data;

    const now = moment().tz(timezone);

    const activeEvents = events.filter(event => {
      const start = moment.tz(event.start, timezone);
      const end = moment.tz(event.end, timezone);
      const diffToStart = start.diff(now, 'minutes');
      return (diffToStart <= 60 && end.isAfter(now));
    });

    const items = [];

    for (const event of activeEvents) {
      try {
        const start = moment.tz(event.start, timezone);
        const end = moment.tz(event.end, timezone);
        const description = await fetchDescriptionFromLink(event.link);

        const item = {
          title: event.name,
          start,
          end,
          icon: determineIcon(event),
          link: event.link || '',
          image: event.image || '',
          canBeShiny: extractShinyFlag(event.extraData),
          extraDetails: extractDetails(event.extraData),
          extraData: event.extraData || {},
          description
        };

        logDebug(`EVENT: ${item.title} | Beschreibung geladen`);
        items.push(item);
      } catch (err) {
        logDebug(`Fehler beim Verarbeiten von ${event.name}: ${err.message}`);
      }
    }

    return items;

  } catch (error) {
    logDebug(`Fehler beim Abrufen der Events: ${error.message}`);
    return [];
  }
}

function determineIcon(event) {
  const type = event.eventType?.toLowerCase();
  if (type?.includes('spotlight')) return '🔦';
  if (type?.includes('raid')) return '⚔️';
  if (type?.includes('community')) return '🎉';
  return '📅';
}

function extractShinyFlag(extraData) {
  if (!extraData) return false;
  for (const key in extraData) {
    const data = extraData[key];
    if (Array.isArray(data?.bosses)) {
      if (data.bosses.some(b => b.canBeShiny)) return true;
    }
    if (typeof data?.canBeShiny === 'boolean') return data.canBeShiny;
  }
  return false;
}

function extractDetails(extraData) {
  if (!extraData) return [];
  const details = [];

  for (const key in extraData) {
    const data = extraData[key];
    if (Array.isArray(data?.bosses)) {
      data.bosses.forEach(boss => {
        const shiny = boss.canBeShiny ? ' als ✨ Verfügbar' : '';
        details.push(`${boss.name}${shiny}`);
      });
    }
    if (data?.name) {
      const shiny = data.canBeShiny ? ' ✨' : '';
      details.push(`${data.name}${shiny}`);
    }
    if (data?.bonus) {
      details.push(`Bonus: ${data.bonus}`);
    }
  }

  return details;
}

module.exports = { fetchActiveItems };