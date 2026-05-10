# OpenClaw Setup Guide — Quadratic Terminal

Exact steps. Copy-paste the commands. Read the notes.

---

## Prerequisites

- OpenClaw installed (you have the Cloud plan at $59/month)
- WhatsApp on your phone
- The Quadratic backend running (`./launch.sh`)

---

## Step 1: Start the Quadratic Backend

Open a terminal and run:

```bash
cd "Quantico Project/Quadratic"
./launch.sh
```

Leave this running. It starts:
- API server on `http://localhost:8888`
- Sentinel daemon (5 scanners)
- Terminal dashboard on `http://localhost:4000`

Verify it works by opening `http://localhost:4000` in your browser.

---

## Step 2: Register Your Skills with OpenClaw

OpenClaw discovers skills from folders containing a `SKILL.md` file. You have 4 skills ready in:

```
Quadratic/openclaw_skills/
├── trading-desk/SKILL.md
├── sports-betting/SKILL.md
├── prediction-markets/SKILL.md
└── sentinel/SKILL.md
```

### Option A: Add via `openclaw.json` (recommended)

Open your OpenClaw config file:

```bash
nano ~/.openclaw/openclaw.json
```

Find or create the `skills` section and add your skills directory to `extraDirs`:

```json
{
  "skills": {
    "load": {
      "watch": true,
      "extraDirs": [
        "/Users/alec/Quantico Project/Quadratic/openclaw_skills"
      ]
    }
  }
}
```

**Replace `/Users/alec/Quantico Project/Quadratic/openclaw_skills` with the actual full path on your machine.**

To find the exact path, run this in a terminal:

```bash
cd "Quantico Project/Quadratic/openclaw_skills" && pwd
```

Copy that output and paste it into the config.

Save and close the file. OpenClaw watches for changes, so it should pick up the skills automatically. If not, restart OpenClaw.

### Option B: Copy skills into OpenClaw's default directory

If Option A gives you trouble (there's a known bug where `extraDirs` sometimes doesn't get discovered), copy the skills directly into OpenClaw's personal skills folder:

```bash
cp -r "Quantico Project/Quadratic/openclaw_skills/"* ~/.openclaw/skills/
```

This puts them at higher precedence and avoids the `extraDirs` discovery issue.

### Verify skills loaded

After configuring, ask OpenClaw:

> "What skills do you have?"

You should see `trading-desk`, `sports-betting`, `prediction-markets`, and `sentinel` in the list. If they don't appear, use Option B above.

---

## Step 3: Connect WhatsApp

OpenClaw uses WhatsApp's "Linked Devices" feature — the same thing WhatsApp Web uses. No Meta Business API approval needed.

### 3a. Configure WhatsApp channel

Make sure your `~/.openclaw/openclaw.json` has WhatsApp enabled:

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true
    }
  }
}
```

### 3b. Link your device

Run this in a terminal:

```bash
openclaw channels login
```

This will display a **QR code** in your terminal.

### 3c. Scan the QR code

On your phone:
1. Open **WhatsApp**
2. Go to **Settings → Linked Devices**
3. Tap **"Link a Device"**
4. **Scan the QR code** from your terminal

The QR code expires in ~1-2 minutes. If it expires, the terminal will refresh with a new one.

Once scanned, you'll see a success message in the terminal. Your credentials are saved to `~/.openclaw/credentials/whatsapp/` and persist across restarts.

### Important notes:
- Your **phone must stay online** (connected to internet, not necessarily open)
- If your phone is **offline for more than ~14 days**, WhatsApp unlinks the session
- To re-link after that, just run `openclaw channels login` again

---

## Step 4: Tell OpenClaw What to Do

Now send OpenClaw a message on WhatsApp. Here's exactly what to say for each thing:

### 4a. Test that skills work

Send this on WhatsApp:

> What skills do you have available?

You should see your 4 Quadratic skills listed.

### 4b. Test the trading desk

> What's the optimal portfolio for AAPL, MSFT, GOOGL, and NVDA?

OpenClaw should call `POST http://localhost:8888/api/portfolio/optimize` and return allocation weights + Sharpe ratio.

### 4c. Test price forecasting

> Forecast TSLA for 20 days

Should call `POST http://localhost:8888/api/forecast/TSLA` and return median + confidence intervals.

### 4d. Test sports betting

> Any value bets in the Premier League?

Should call `GET http://localhost:8888/api/sentinel/alerts?type=value_bet` and return active value bet alerts.

### 4e. Test prediction markets

> Scan prediction markets for arbitrage

Should call `GET http://localhost:8888/api/predictions/scan` and return cross-platform opportunities.

### 4f. Test Sentinel

> What's the Sentinel status?

Should call `GET http://localhost:8888/api/sentinel/status` and show scanner last-run times.

---

## Step 5: Set Up Autonomous Alerts

This is the main event — Sentinel scanning 24/7 and pinging you on WhatsApp when it finds something.

Send OpenClaw this message:

> I want you to monitor my Sentinel alerts continuously. Here's how:
>
> 1. Every 5 minutes, check GET http://localhost:8888/api/sentinel/alerts for new alerts
> 2. If any alert has severity "critical" or "high", send it to me immediately on WhatsApp
> 3. For "medium" alerts, collect them and send me a summary every 4 hours
> 4. Ignore "low" severity alerts
> 5. When you send an alert, include: the title, summary, edge percentage, recommended stake in EUR, and confidence score
> 6. At the end of each day (11pm), send me a daily summary of all alerts that fired and which ones I acted on
>
> Start monitoring now.

If OpenClaw supports scheduled/recurring tasks natively (check if you have the `cron-scheduler` skill installed), it'll set this up as a background loop. If not, you can install it:

```bash
clawhub install cron-scheduler
```

Then tell OpenClaw again to set up the monitoring schedule.

---

## Step 6: Configure Your Risk Parameters

Send on WhatsApp:

> Set my Sentinel config: bankroll €5000, minimum edge 10%, max Kelly 3%

OpenClaw will call `POST http://localhost:8888/api/sentinel/config` with those values.

You can change these anytime by messaging:

> Update my bankroll to €8000
> Change minimum edge to 12%

---

## Troubleshooting

### Skills not showing up
Copy them directly: `cp -r openclaw_skills/* ~/.openclaw/skills/`

### WhatsApp QR won't scan
- Make sure no other WhatsApp Web sessions are using your 4-device limit (WhatsApp allows max 4 linked devices)
- Go to WhatsApp → Settings → Linked Devices and remove old ones first

### API calls failing from OpenClaw
- Make sure `launch.sh` is running in another terminal
- Test manually: `curl http://localhost:8888/api/status`
- If you're running OpenClaw Cloud (not local), it can't reach localhost — you'd need to expose the API via ngrok or similar

### "Can't link new devices at this time"
This is a WhatsApp rate limit. Wait 10-15 minutes and try again. Known issue.

---

## The Localhost Problem (Important)

If you're running OpenClaw **Cloud** (the $59/month hosted version), there's a catch: the Cloud instance runs on their servers, not your machine. It **cannot reach `localhost:8888`** because that's your local computer.

**Two options:**

### Option 1: Run OpenClaw locally (recommended)
Install the open-source version on your machine alongside the Cloud subscription. Local OpenClaw can hit localhost directly.

```bash
# Install OpenClaw locally
curl -fsSL https://openclaw.ai/install.sh | bash

# Or via npm
npm install -g openclaw
```

Then configure skills + WhatsApp as described above. This runs entirely on your machine — no Cloud needed for the API integration.

### Option 2: Expose your API via ngrok
If you want to keep using Cloud:

```bash
# Install ngrok
brew install ngrok

# Expose your local API
ngrok http 8888
```

This gives you a public URL like `https://abc123.ngrok.io`. Update the `API Base` in all 4 SKILL.md files to use that URL instead of `http://localhost:8888`.

**Option 1 is better** — no dependency on a tunnel, no latency, no security exposure.
