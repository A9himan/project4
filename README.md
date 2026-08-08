# Frequency — free real-time person-to-person chat website

A small full-stack website: open a "channel," share the 5-character code
with one other person, and chat live. Built with Flask + Flask-SocketIO
(WebSockets) on the backend and vanilla HTML/CSS/JS on the frontend.

Features:
- No accounts or database — just pick a name and go
- Real-time messaging over WebSockets (instant, no page refresh)
- Auto-generated shareable channel codes
- Live "who's on this channel" list
- Typing indicator
- Message history for anyone who joins mid-conversation (kept in memory)
- Fully responsive, works on mobile

## Run it locally

```bash
cd webchat
pip install -r requirements.txt
python app.py
```

Open **http://localhost:5000** in one browser tab, click "Open a channel,"
then open the URL it gives you (or share the channel code) in a second tab
or a different device on the same network — click "Tune in" and enter the code.

## Deploy it for free (so anyone on the internet can use it)

### Option A — Render.com (recommended, easiest)

1. Push this folder to a GitHub repo (see steps below if you haven't done this before).
2. Go to [render.com](https://render.com) → sign up (free, no card required) → **New** → **Web Service** → connect your GitHub repo.
3. Settings:
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `gunicorn -k gthread --threads 100 -w 1 app:app`
   - **Instance type:** Free
4. Click **Create Web Service**. Render gives you a free `https://your-app.onrender.com` URL.

The `Procfile` in this project already contains the same start command, so
some hosts will pick it up automatically without you typing it in.

(Free tier note: the app "sleeps" after ~15 minutes of inactivity and takes
10–30 seconds to wake up on the next visit — normal for free hosting, not a bug.)

### Option B — Railway.app

1. Push to GitHub, then in Railway: **New Project** → **Deploy from GitHub repo**.
2. Railway auto-detects Python and reads the `Procfile` automatically.
3. Deploy — you get a free `*.up.railway.app` URL.

### Option C — Fly.io / PythonAnywhere / any host that supports WebSockets

Any host works as long as it can run a WSGI app with WebSocket support and
lets you set the start command above. Plain shared hosting without
WebSocket support (e.g. some free static hosts) will **not** work, since
real-time chat depends on persistent socket connections.

## How it's built

```
webchat/
├── app.py                  # Flask app + Socket.IO event handlers
├── requirements.txt
├── templates/
│   ├── index.html          # landing page (create/join a channel)
│   └── room.html           # the chat room itself
└── static/
    ├── css/style.css       # all styling
    └── js/
        ├── landing.js      # tab switching on the landing page
        └── room.js         # socket connection + message rendering
```

Everything is stored in memory on the server (a Python dict keyed by
channel code). That means it's genuinely free to run and needs no database,
but a server restart clears all rooms and history — this is meant for
casual, ephemeral conversations, not a production chat platform.

## Customizing

- **Colors/fonts:** all in `static/css/style.css` under the `:root` block at the top.
- **Message history length:** `MAX_HISTORY` in `app.py` (default 100 messages/room).
- **Room capacity:** currently unlimited people can join one channel — to
  cap it, check `len(rooms[code]["users"])` in the `on_join` handler in `app.py`.
