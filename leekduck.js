const fetch = require('node-fetch');
const moment = require('moment-timezone');

const JSON_URL = 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json';

async function fetchActiveItems(timezone = 'Europe/Berlin') {
  const res = await fetch(JSON_URL);
  const data = await res.json();

  const now = moment().tz(timezone);
  const active = [];

  for (const item of data) {
    const typeRaw = (item.type || "").toLowerCase();
    const type = detectType(typeRaw, item.title || item.name || item.pokemon || "");

    const title = item.title || item.name || item.pokemon || "Unknown Event";
    const start = moment.tz(item.start, timezone);
    const end = moment.tz(item.end, timezone);

    if (now.isBetween(start, end)) {
      active.push({
        title: formatTitle(type, title),
        start,
        end,
        icon: iconForType(type)
      });
    }
  }

  return active;
}

function detectType(typeRaw, title) {
  if (typeRaw.includes("spotlight")) return "spotlight";
  if (typeRaw.includes("raid")) return "raid";
  if (typeRaw.includes("community")) return "community";
  if (title.toLowerCase().includes("community day")) return "community";
  return "event";
}

function iconForType(type) {
  if (type === 'spotlight') return '⭐';
  if (type === 'raid') return '⚔️';
  if (type === 'community') return '🎉';
  return '📅';
}

function formatTitle(type, title) {
  if (type === 'event') return `Event: ${title}`;
  if (type === 'spotlight') return `Spotlight: ${title}`;
  if (type === 'raid') return `Raid Hour: ${title}`;
  if (type === 'community') return `Community Day: ${title}`;
  return title;
}

module.exports = { fetchActiveItems };