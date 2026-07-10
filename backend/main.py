from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator
from groq import Groq
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os, json, re, asyncio, string, random
from pathlib import Path
from dotenv import load_dotenv
from resume_data import RESUME_CONTEXT

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env file")

client = Groq(api_key=api_key)

SYSTEM_PROMPT = f"""You are a smart, confident AI assistant representing Meetkumar Patel on his portfolio website.
Recruiters and hiring managers will chat with you about Meet.

YOUR TONE & STYLE:
- Sound like a thoughtful person speaking, NOT like a resume being read aloud
- Be concise — 2 to 4 sentences per answer
- Highlight the most impressive and relevant detail only
- Use natural conversational English
- Be confident and enthusiastic about Meet's work
- Occasionally (roughly 1 in 3 replies) end your reply with ONE short natural clarifying question to keep the conversation going (e.g. "Would you like to know more about his cloud work?" or "Are you looking for someone with a specific stack?")

WHAT NOT TO DO:
- Never dump all resume details into one answer
- Never use bullet points or copy-paste from the resume
- Never answer in more than 5 sentences (excluding any clarifying question)

RESPONSE FORMAT — VERY IMPORTANT:
You MUST always respond with valid JSON in exactly this format and nothing else:
{{
  "reply": "your conversational answer here (may include a clarifying question at the end)",
  "suggestions": ["short follow-up question 1", "short follow-up question 2"],
  "showContact": false
}}

Rules for each field:
- "reply": your full answer as a plain string
- "suggestions": exactly 2 short follow-up questions a recruiter would naturally ask next (based on what was just discussed)
- "showContact": set to true ONLY if the question is about hiring Meet, his availability, salary, reaching out, or working together. Otherwise false.

EXAMPLES:
Q: "What does Meet do?"
{{"reply": "Meet is a Data Engineer with 4+ years of experience building large-scale data pipelines. He's currently at NamaSYS processing over 100 million records monthly across AWS and Azure. Are you looking for someone with cloud data experience specifically?", "suggestions": ["What cloud platforms has he worked with?", "Tell me about his current role"], "showContact": false}}

Q: "Is Meet available for new opportunities?"
{{"reply": "That's a great question — you'd want to reach out to Meet directly to discuss availability and fit. He's open to the right opportunity.", "suggestions": ["What's the best way to contact him?", "What kind of roles suit him best?"], "showContact": true}}

If something isn't in Meet's info, say so and offer his email: meetpatel0996@gmail.com

MEET'S INFORMATION:
{RESUME_CONTEXT}
"""

# ── Stats persistence ─────────────────────────────────────────────────────────
STATS_FILE  = Path(__file__).parent / "stats.json"
SHARES_DIR  = Path(__file__).parent / "shares"
SHARES_DIR.mkdir(exist_ok=True)
_stats_lock = asyncio.Lock()

def _read_stats() -> dict:
    if STATS_FILE.exists():
        try:
            return json.loads(STATS_FILE.read_text())
        except Exception:
            pass
    return {"visitors": 0, "chats": 0}

def _write_stats(data: dict):
    STATS_FILE.write_text(json.dumps(data))

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Meet Patel Portfolio Chatbot")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — locked to your frontend origin in production, open in dev
_allowed_origin = os.getenv("ALLOWED_ORIGIN", "")
_origins = [_allowed_origin] if _allowed_origin else ["http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    content: str

    @field_validator('content')
    @classmethod
    def cap_content(cls, v):
        if len(v) > 2000:
            raise ValueError('Message too long (max 2,000 characters)')
        return v

class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []

    @field_validator('message')
    @classmethod
    def cap_message(cls, v):
        if len(v) > 2000:
            raise ValueError('Message too long (max 2,000 characters)')
        return v

class AnalyzeRequest(BaseModel):
    jd: str

    @field_validator('jd')
    @classmethod
    def cap_jd(cls, v):
        if len(v) > 8000:
            raise ValueError('Job description too long (max 8,000 characters)')
        return v

class ShareRequest(BaseModel):
    messages: list[Message]


@app.get("/health")
def health_check():
    return {"status": "ok", "model": "llama-3.3-70b-versatile"}

@app.get("/resume")
def download_resume():
    path = Path(__file__).parent / "resume.pdf"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Resume not found")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename="Meetkumar_Patel_Resume.pdf",
    )

@app.post("/share")
async def create_share(request: ShareRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages to share")
    share_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    data = [{"role": m.role, "content": m.content} for m in request.messages]
    (SHARES_DIR / f"{share_id}.json").write_text(json.dumps(data))
    return {"id": share_id}

@app.get("/share/{share_id}")
async def get_share(share_id: str):
    path = SHARES_DIR / f"{share_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Shared conversation not found")
    return {"messages": json.loads(path.read_text())}

@app.post("/visit")
async def record_visit():
    async with _stats_lock:
        data = _read_stats()
        data["visitors"] = data.get("visitors", 0) + 1
        _write_stats(data)
    return {"ok": True}

@app.get("/stats")
async def get_stats():
    return _read_stats()


@app.post("/chat")
@limiter.limit("20/minute")
async def chat(body: ChatRequest, request: Request):
    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in body.history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": body.message})

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
        )

        raw = response.choices[0].message.content.strip()

        # Extract JSON — handle cases where model wraps it in markdown code fences
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group())
        else:
            parsed = json.loads(raw)

        # Increment chat counter (fire-and-forget, non-blocking)
        async with _stats_lock:
            s = _read_stats()
            s["chats"] = s.get("chats", 0) + 1
            _write_stats(s)

        return {
            "reply": parsed.get("reply", raw),
            "suggestions": parsed.get("suggestions", []),
            "showContact": parsed.get("showContact", False),
        }

    except json.JSONDecodeError:
        # Fallback: return raw text with no extras if JSON parsing fails
        return {"reply": raw, "suggestions": [], "showContact": False}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


ANALYZE_PROMPT = f"""You are evaluating how well a candidate matches a job description.

CANDIDATE: Meetkumar Patel
{RESUME_CONTEXT}

TASK: Read the job description the user provides and return ONLY valid JSON in exactly this format:
{{
  "score": 82,
  "summary": "One or two sentences on overall fit — honest, confident, recruiter-friendly tone.",
  "matches": ["skill or experience that matches", "another match"],
  "gaps": ["one honest gap or unknown — keep it short and fair"]
}}

RULES:
- score is an integer 0–100 reflecting genuine fit
- matches: list 4–7 specific skills/experiences from Meet's background that the JD asks for
- gaps: list at most 2 items; if there are no real gaps say ["No significant gaps identified"]
- Be honest — do not oversell. A score of 75–90 is more credible than always returning 95+
- Only return the JSON object, nothing else
"""


@app.post("/analyze")
@limiter.limit("10/minute")
async def analyze_fit(body: AnalyzeRequest, request: Request):
    if not body.jd.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty")
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": ANALYZE_PROMPT},
                {"role": "user", "content": f"JOB DESCRIPTION:\n{body.jd.strip()}"},
            ],
            max_tokens=512,
            temperature=0.4,
        )
        raw = response.choices[0].message.content.strip()
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        parsed = json.loads(json_match.group() if json_match else raw)
        return {
            "score": int(parsed.get("score", 70)),
            "summary": parsed.get("summary", ""),
            "matches": parsed.get("matches", []),
            "gaps": parsed.get("gaps", []),
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Could not parse AI response")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
