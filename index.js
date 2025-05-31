// index.js
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { fetchActiveItems } = require('./leekduck');
const config = require('./config.json');
const cron = require('node-cron');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

function logDebug(message) {
  if (!config.debug) return;
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(path.join(__dirname, 'debug.log'), logMessage);
}

function normalizeName(str) {
  return str
    .toLowerCase()
    .replace(/[📅⚔️✨]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`Logged in als ${client.user.tag}`);
  logDebug(`Bot gestartet als ${client.user.tag}`);
  await scheduleUpdate();
});

async function scheduleUpdate() {
  await updateEventChannels();
  cron.schedule(`*/${config.updateIntervalMinutes} * * * *`, updateEventChannels);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatExtraData(extraData) {
  const lines = [];
  if (extraData.spotlight) {
    const s = extraData.spotlight;
    lines.push(`\n**Spotlight Pokémon:**\n• ${s.name}${s.canBeShiny ? ' ✨' : ''}`);
    if (s.bonus) lines.push(`\n**Bonus:** ${s.bonus}`);
  }
  if (extraData.breakthrough) {
    const b = extraData.breakthrough;
    lines.push(`\n**Research Breakthrough:**\n• ${b.name}${b.canBeShiny ? ' ✨' : ''}`);
  }
  if (extraData.communityday) {
    const c = extraData.communityday;
    if (c.spawns?.length) {
      lines.push("\n**Spawns:**");
      c.spawns.forEach(p => lines.push(`• ${p.name}`));
    }
    if (c.bonuses?.length) {
      lines.push("\n**Boni:**");
      c.bonuses.forEach(b => lines.push(`• ${b.text}`));
    }
    if (c.bonusDisclaimers?.length) {
      lines.push("\n**Hinweise:**");
      c.bonusDisclaimers.forEach(d => lines.push(d));
    }
    if (c.shinies?.length) {
      lines.push("\n**Shinies:**");
      c.shinies.forEach(s => lines.push(`• ${s.name} ✨`));
    }
    if (c.specialresearch?.length) {
      lines.push("\n**Spezialforschung:**");
      c.specialresearch.forEach(r => {
        lines.push(`• ${r.name}`);
        r.tasks?.forEach(t => lines.push(`  - ${t.text} → ${t.reward.text}`));
        if (r.rewards?.length) {
          lines.push(`  🎁 Belohnungen:`);
          r.rewards.forEach(rew => lines.push(`    • ${rew.text}`));
        }
      });
    }
  }
  return lines.join('\n');
}

async function updateEventChannels() {
  logDebug("updateEventChannels aufgerufen");

  const guild = await client.guilds.fetch(config.guildId);
  const items = await fetchActiveItems(config.timezone);

  logDebug(`Events geladen: ${items.length}`);
  items.sort((a, b) => new Date(a.end) - new Date(b.end));

  const existingChannels = await guild.channels.fetch();
  const categoryChannels = existingChannels.filter(ch =>
    ch.parentId === config.channelCategoryId && ch.type === 0
  );

  const currentNames = [];
  const now = moment().tz(config.timezone);

  for (let item of items) {
    item.start = moment(item.start).tz(config.timezone);
    item.end = moment(item.end).tz(config.timezone);

    const normalized = normalizeName(item.title);
    const finalName = `📅-${normalized}`;
    currentNames.push(finalName);

    const nameExists = [...categoryChannels.values()].some(ch => ch.name === finalName);
    const startDiff = item.start.diff(now, 'minutes');

    logDebug(`-- Prüfe Event: ${item.title} | start: ${item.start.format()} | end: ${item.end.format()} | now: ${now.format()} | startDiff: ${startDiff}`);

    if (!(startDiff <= 60 && item.end.isAfter(now))) {
      logDebug(`>> Überspringe Event: ${item.title} (startet in ${startDiff} Minuten)`);
      continue;
    }

    if (!nameExists) {
      try {
        const permissionOverwrites = [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.SendMessages],
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory]
          }
        ];

        if (Array.isArray(config.readonlyRoles)) {
          for (const roleId of config.readonlyRoles) {
            permissionOverwrites.push({
              id: roleId,
              deny: [PermissionsBitField.Flags.SendMessages],
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory]
            });
          }
        }

        const channel = await guild.channels.create({
          name: finalName,
          type: 0,
          parent: config.channelCategoryId,
          reason: 'PoGo Event gestartet',
          permissionOverwrites
        });

        await sleep(300);

        const messageLines = [`📆 **${item.title}**`];

        if (item.description) {
          messageLines.push(`\n📝 ${item.description}`);
        }

        const startTimestamp = Math.floor(item.start.unix());
        const endTimestamp = Math.floor(item.end.unix());
        const duration = moment.duration(item.end.diff(now));
        const days = Math.floor(duration.asDays());
        const hours = duration.hours();
        const minutes = duration.minutes();

        const durationText = [
          days > 0 ? `${days} Tag${days > 1 ? 'e' : ''}` : '',
          hours > 0 ? `${hours} Stunde${hours > 1 ? 'n' : ''}` : '',
          minutes > 0 ? `${minutes} Minute${minutes > 1 ? 'n' : ''}` : ''
        ].filter(Boolean).join(' und ');

        messageLines.push(`\n🕐 **Event Start in:** <t:${startTimestamp}:R>\n${item.start.format('DD.MM.YYYY HH:mm')} Uhr`);
        messageLines.push(`\n🕒 **Event Ende in:** <t:${endTimestamp}:R>\n${item.end.format('DD.MM.YYYY HH:mm')} Uhr`);

        if (item.canBeShiny) {
          messageLines.push('\n✨: Verfügbar');
        }

        if (item.extraDetails?.length) {
          messageLines.push('\n**Details:**');
          item.extraDetails.forEach(line => messageLines.push(`• ${line}`));
        }

        if (item.extraData) {
          messageLines.push("\n" + formatExtraData(item.extraData));
        }

        if (item.link) {
          messageLines.push(`\n🔗 [Weitere Infos auf www.leekduck.com](${item.link})`);
        }

        const embed = {
          color: 0x0099ff,
          description: messageLines.join('\n')
        };

        if (item.image) {
          embed.image = { url: item.image };
        }

        await channel.send({ embeds: [embed] });
        logDebug(`>> Kanal erstellt: ${finalName}`);
      } catch (err) {
        logDebug(`Fehler beim Erstellen von ${item.title}: ${err.message}`);
      }
    }
  }

  for (const [id, ch] of categoryChannels) {
    const normalized = normalizeName(ch.name);
    const expected = currentNames.map(name => normalizeName(name));
    if (!expected.includes(normalized)) {
      try {
        await ch.delete();
        logDebug(`Channel gelöscht: ${ch.name}`);
      } catch (err) {
        logDebug(`Fehler beim Löschen: ${err.message}`);
      }
    }
  }

  logDebug(`Aktive Channelnamen: ${currentNames.join(', ')}`);
}

client.login(config.token);