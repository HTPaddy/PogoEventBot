const { Client, GatewayIntentBits } = require('discord.js');
const { fetchActiveItems } = require('./leekduck');
const config = require('./config.json');
const cron = require('node-cron');
const moment = require('moment-timezone');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

let activeChannels = new Map();

client.once('ready', async () => {
  // console.log(`Logged in as ${client.user.tag}`);
  // Alle Voice-Channels in der Kategorie löschen
const category = await client.channels.fetch(config.channelCategoryId);
if (category && category.children) {
  const children = category.children.cache.filter(c => c.type === 2); // Typ 2 = Voice
  for (const [id, channel] of children) {
    await channel.delete().catch(() => {});
  }
}
  scheduleUpdate();
});

async function scheduleUpdate() {
  await updateEventChannels();
  cron.schedule(`*/${config.updateIntervalMinutes} * * * *`, updateEventChannels);
}

async function updateEventChannels() {
  const guild = await client.guilds.fetch(config.guildId);
  const items = await fetchActiveItems(config.timezone);
  console.log("Gefundene Items von LeekDuck:");
  console.log(items);

  const existingChannels = await guild.channels.fetch();
  const currentNames = items.map(i => `${i.icon} ${i.title}`);

  // Entferne abgelaufene Channels
  for (const [id, channel] of activeChannels.entries()) {
    if (!currentNames.includes(channel.name)) {
      const ch = existingChannels.get(id);
      if (ch) await ch.delete().catch(() => {});
      activeChannels.delete(id);
    }
  }

  // Neue Channels anlegen
  for (const item of items) {
    const name = `${item.icon} ${item.title}`.substring(0, config.maxChannelNameLength);
    if (![...activeChannels.values()].some(ch => ch.name === name)) {
      const vc = await guild.channels.create({
        name,
        type: 2,
        parent: config.channelCategoryId,
        reason: 'PoGo Event/Hora gestartet'
      });
      activeChannels.set(vc.id, vc);
    }
  }

  console.log(`Aktiv: ${currentNames.join(', ')}`);
}

client.login(config.token);
