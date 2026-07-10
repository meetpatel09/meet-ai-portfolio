# Meet Patel — AI Portfolio Chatbot

A personal portfolio website built as a conversational AI experience. Recruiters and hiring managers chat with an AI assistant that knows everything about Meet's background — built to demonstrate real engineering, not just a landing page.

**Stack:** FastAPI · React (Vite) · Groq (LLaMA 3.3 70B) · Canvas API · slowapi

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                   │
│                                                      │
│  ┌──────────────┐   fetch /chat    ┌──────────────┐  │
│  │  ChatWindow  │ ───────────────► │  Vite Proxy  │  │
│  │  (JSX/hooks) │ ◄─────────────── │  :5173 →     │  │
│  └──────────────┘   JSON response  │  :8000       │  │
│                                    └──────────────┘  │
│  Canvas background  Web Speech API  Typewriter hook  │
└─────────────────────────────────────────────────────┘
                           │
                    HTTP (proxied)
                           │
┌─────────────────────────────────────────────────────┐
│              FastAPI Backend  :8000                  │
│                                                      │
│  POST /chat     ──►  AI chat response               │
│  POST /analyze  ──►  job fit score + matches        │
│  POST /share    ──►  save conversation, return ID   │
│  GET  /share/:id──►  load saved conversation        │
│  GET  /resume   ──►  serve resume PDF               │
│  POST /visit    ──►  increment visitor count        │
│  GET  /stats    ──►  return { visitors, chats }     │
│  GET  /health   ──►  { status: "ok" }               │
└──────────────────────────┬──────────────────────────┘
                           │
                    Groq API (free tier)
                           │
              llama-3.3-70b-versatile model
              returns structured JSON:
              { reply, suggestions, showContact }
```

### Key design decisions

**Structured JSON responses** — The LLM is instructed to always return `{ reply, suggestions, showContact }`. This lets the frontend render follow-up chips and a contact button without a second API call or client-side NLP.

**No database** — Visitor/chat counts persist in `backend/stats.json`. Shared conversations persist as JSON files in `backend/shares/`. Simple, zero-dependency, good enough for a portfolio. Swap for Redis or Postgres if traffic scales.

**Typewriter on the client** — The backend returns the full reply in one shot (non-streaming). The frontend animates it character-by-character. This keeps the backend simple while still feeling like a live AI response.

**Canvas background** — A `requestAnimationFrame` loop draws 22 floating data-engineering keyword nodes with connecting edges and flowing particles. Pure browser API, no library.

**Rate limiting** — `/chat` is capped at 20 req/min per IP, `/analyze` at 10 req/min, via `slowapi`. Prevents quota abuse on the free Groq tier.

---

## Project Structure

```
meet-ai-portfolio/
├── backend/
│   ├── main.py            # FastAPI app — all 8 endpoints
│   ├── resume_data.py     # Meet's full professional background as a string
│   ├── requirements.txt   # Python dependencies
│   ├── .env               # GROQ_API_KEY + ALLOWED_ORIGIN (never commit)
│   ├── .env.example       # Safe template — commit this
│   ├── resume.pdf         # Served at GET /resume (never commit)
│   ├── stats.json         # Auto-created — visitor + chat counts (never commit)
│   └── shares/            # Auto-created — saved conversations (never commit)
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── ChatWindow.jsx   # Entire UI — chat, overlays, background, contact card
    │   └── main.jsx
    ├── index.html               # Title, OG tags, SVG favicon
    └── vite.config.js           # Dev proxy: all 8 endpoints → :8000
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend framework | FastAPI (Python) | Async, fast, auto-docs at `/docs` |
| LLM | Groq — LLaMA 3.3 70B | Free tier, ~1–2s inference |
| Rate limiting | slowapi | Per-IP limits, zero extra infra |
| Frontend | React 18 + Vite | Fast HMR, JSX with inline styles |
| Background | HTML5 Canvas API | Zero-dependency animation |
| TTS | Web Speech API | Native browser, no cost |
| Stats | JSON file | No infra needed for a portfolio |

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

### 1 — Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy the env template and fill in your Groq key
cp .env.example .env
# Edit .env and set GROQ_API_KEY=your_key_here

# Start the server
python -m uvicorn main:app --reload
# → running at http://localhost:8000
# → API docs at http://localhost:8000/docs
```

> **Important:** always use `python -m uvicorn` (not bare `uvicorn`) so it picks up the venv Python.

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev
# → running at http://localhost:5173
```

Open `http://localhost:5173` — the Vite proxy forwards all API calls to the FastAPI backend automatically.

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GROQ_API_KEY` | `backend/.env` | Your Groq API key from console.groq.com |
| `ALLOWED_ORIGIN` | `backend/.env` | Your Vercel frontend URL in production (e.g. `https://meet-portfolio.vercel.app`). Leave blank for local dev. |

---

## API Reference

### `POST /chat`
Send a message and receive a structured AI response. Rate limited: 20 req/min per IP.

**Request**
```json
{
  "message": "What cloud platforms does Meet work with?",
  "history": [
    { "role": "user", "content": "Tell me about Meet" },
    { "role": "assistant", "content": "Meet is a Data Engineer..." }
  ]
}
```

**Response**
```json
{
  "reply": "Meet works heavily with AWS — S3, Glue, Lambda, Redshift — and Azure Data Factory...",
  "suggestions": ["What's his experience with Spark?", "Tell me about his current role"],
  "showContact": false
}
```

### `POST /analyze`
Analyze how well Meet fits a job description. Rate limited: 10 req/min per IP. JD capped at 8,000 characters.

**Request**
```json
{ "jd": "We are looking for a Senior Data Engineer with 3+ years of AWS and Spark experience..." }
```

**Response**
```json
{
  "score": 87,
  "summary": "Strong match. Meet covers the core data engineering stack with direct AWS and Spark experience.",
  "matches": ["PySpark", "AWS Glue", "Airflow", "Python", "Redshift"],
  "gaps": ["dbt (not listed, worth asking)"]
}
```

### `POST /share`
Save a conversation and get a shareable ID.

**Request**
```json
{ "messages": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }] }
```

**Response**
```json
{ "id": "x7k2m9" }
```

### `GET /share/{id}`
Load a saved conversation by ID.
```json
{ "messages": [...] }
```

### `GET /resume`
Serves `resume.pdf` as a direct file download.

### `POST /visit`
Ping once on page load to increment the visitor counter. No body required.

### `GET /stats`
```json
{ "visitors": 142, "chats": 387 }
```

### `GET /health`
```json
{ "status": "ok", "model": "llama-3.3-70b-versatile" }
```

---

## Customising for Your Own Portfolio

1. **Replace resume data** — Edit `backend/resume_data.py` with your own background.
2. **Change the system prompt** — Top of `backend/main.py`. Adjust tone, length, style.
3. **Update contact info** — Search `ChatWindow.jsx` for `meetpatel0996@gmail.com` and `+91 96870 23460`.
4. **Change accent colour** — Search `#7c6ef2` in `ChatWindow.jsx` and replace with your colour.
5. **Replace resume PDF** — Drop your PDF into `backend/` named `resume.pdf`.

---

## Deploying (Free)

### Backend → Render
1. Push to GitHub
2. Render.com → New Web Service → connect your repo
3. Root directory: `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add env vars: `GROQ_API_KEY=your_key` and `ALLOWED_ORIGIN=https://your-app.vercel.app`

### Frontend → Vercel
1. Vercel.com → Import Git Repository
2. Root directory: `frontend`
3. No env vars needed — all API calls use relative paths via Vite proxy in dev, and your Render URL in production

---

## Push to GitHub

```bash
git init
git add .
git commit -m "feat: AI portfolio chatbot — FastAPI + React + Groq"
git remote add origin https://github.com/meetpatel09/meet-ai-portfolio.git
git push -u origin main
```

---

## License

MIT — fork it, adapt it, ship your own.
