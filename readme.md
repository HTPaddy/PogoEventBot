# 📅 PoGo EventBot

Ein Node.js-basierter Discord-Bot, der automatisch Pokémon GO-Events (z. B. Spotlight Hour, Raid Hour, Community Day) erkennt und kurz vor Start passende Discord-Kanäle erstellt – inklusive Beschreibung, Zeitangaben, Bildern und mehr.

---

## 🚀 Features

- Automatisches Erstellen von Event-Kanälen 60 Minuten vor Eventbeginn
- Automatisches Löschen der Kanäle nach Eventende
- Unterstützung für mehrere Eventtypen: Spotlight Hour, Community Day, Raid Hours etc.
- Einbindung von Eventdetails wie:
  - Beschreibung
  - Start- und Endzeit (formatiert mit Discord-Zeitstempeln)
  - Bonusinformationen
  - Shiny-Verfügbarkeit
  - Bild & Link zum Event
- Leserechte für bestimmte Rollen – keine Schreibrechte (konfigurierbar)
- Regelmäßige Updates über Cronjobs (z. B. alle 5 Minuten)
- Debug-Logging in `debug.log`

---

## 🧱 Voraussetzungen

- Node.js 18 oder höher
- Einen Discord-Bot mit aktivierten `GUILDS`-Intents
- Rollen-ID(s) für nur-lesende Berechtigung (optional)

---

## 📁 Projektstruktur

```
eventbot/
├── config.json
├── index.js
├── leekduck.js
├── debug.log (wird automatisch erstellt)
├── package.json
└── README.md
```

---

## ⚙️ Konfiguration (`config.json`)

```json
{
  "token": "DEIN_DISCORD_BOT_TOKEN",
  "guildId": "DEINE_DISCORD_SERVER_ID",
  "channelCategoryId": "KATEGORIE_ID_FÜR_EVENTKANÄLE",
  "timezone": "Europe/Berlin",
  "updateIntervalMinutes": 5,
  "readonlyRoles": [
    "ROLLE1_ID",
    "ROLLE2_ID"
  ],
  "debug": true
}
```

**Erläuterung:**

- `token`: Bot-Token aus dem Discord Developer Portal
- `guildId`: Server-ID
- `channelCategoryId`: Die ID der Kanal-Kategorie, in der Event-Kanäle erstellt werden
- `readonlyRoles`: Array von Rollen-IDs, die nur lesen dürfen (z. B. @everyone, Friends etc.)
- `debug`: Wenn `true`, wird jede Aktion in `debug.log` protokolliert

---

## 📦 Installation

1. Repository oder Dateien herunterladen
2. Abhängigkeiten installieren:

```bash
npm install
```

3. `config.json` anpassen
4. Bot starten:

```bash
node index.js
```

---

## 🛠 Tipps

- Stelle sicher, dass der Bot **Rechte zum Erstellen & Löschen von Kanälen** besitzt.
- Wenn du möchtest, dass bestimmte Rollen Event-Kanäle **nicht beschreiben können**, gib deren IDs unter `readonlyRoles` an.
- Die Events werden von [LeekDuck](https://leekduck.com/events/) geparst – die Quelle ist automatisiert und regelmäßig aktuell.

---

## 📬 Kontakt

Fragen oder Verbesserungsideen? Melde dich gern im Discord oder über GitHub!

---

## 📝 Lizenz

MIT License