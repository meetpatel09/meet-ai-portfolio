import { useState, useRef, useEffect, useCallback } from 'react'

const CHAT_ENDPOINT = '/chat'

// Pick a contextual share reason based on what's been discussed
function getShareHint(messages) {
  const text = messages.map(m => m.content).join(' ').toLowerCase()
  if (text.match(/aws|cloud|azure|s3|glue|redshift|lambda/))
    return 'share this conversation with your engineering lead to show his cloud depth'
  if (text.match(/spark|pyspark|databricks|pipeline|etl|airflow/))
    return "share this conversation with your data team — they'll want to see the pipeline experience"
  if (text.match(/remote|timezone|location|relocat/))
    return 'share this with HR so they have the logistics conversation on record'
  if (text.match(/availab|opportunit|hire|open to|salary|start date/))
    return 'share this with your hiring manager before the intro call'
  if (text.match(/python|sql|kafka|redis|langchain|llm|ai/))
    return 'share this with your tech lead — covers his full stack in one read'
  return 'share this conversation so your hiring manager can skip the intro briefing'
}

// ── Mobile detection hook ─────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// ── Animated data pipeline background ────────────────────────────────────────
function DataBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Data engineering keywords as floating nodes
    const LABELS = [
      'ETL', 'PySpark', 'AWS S3', 'Lambda', 'Airflow',
      'SQL', 'Redshift', 'Databricks', 'Python', 'Kafka',
      'Azure', 'Glue', 'EC2', 'REST API', 'CI/CD',
      'Spark', 'Redis', 'LangChain', 'RAG', 'LLM',
    ]

    const nodes = Array.from({ length: 22 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 1.5,
      label: LABELS[i % LABELS.length],
      alpha: Math.random() * 0.4 + 0.3,
    }))

    // Flowing particles along connections
    const particles = Array.from({ length: 30 }, () => ({
      nodeA: Math.floor(Math.random() * nodes.length),
      nodeB: Math.floor(Math.random() * nodes.length),
      t: Math.random(),   // progress 0→1 along edge
      speed: Math.random() * 0.004 + 0.002,
    }))

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Move nodes
      nodes.forEach(n => {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })

      // Draw edges between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 220) {
            const op = (1 - dist / 220) * 0.18
            ctx.strokeStyle = `rgba(124,110,242,${op})`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw flowing particles along edges
      particles.forEach(p => {
        p.t += p.speed
        if (p.t > 1) {
          p.t = 0
          p.nodeA = Math.floor(Math.random() * nodes.length)
          p.nodeB = Math.floor(Math.random() * nodes.length)
        }
        const a = nodes[p.nodeA], b = nodes[p.nodeB]
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 220) {
          const px = a.x + dx * p.t
          const py = a.y + dy * p.t
          ctx.beginPath()
          ctx.arc(px, py, 1.8, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(167,139,250,0.7)`
          ctx.fill()
        }
      })

      // Draw nodes + labels
      nodes.forEach(n => {
        // Glow halo
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 18)
        grad.addColorStop(0, `rgba(124,110,242,0.15)`)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(n.x, n.y, 18, 0, Math.PI * 2)
        ctx.fill()

        // Node dot
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(167,139,250,${n.alpha})`
        ctx.fill()

        // Label
        ctx.font = '13px Inter, monospace'
        ctx.fillStyle = `rgba(167,139,250,${n.alpha * 0.8})`
        ctx.fillText(n.label, n.x + n.r + 4, n.y + 4)
      })

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', top: 0, left: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0,
    }} />
  )
}

const SUGGESTIONS = [
  "What's Meet's experience in Data Engineering?",
  "What cloud platforms does he work with?",
  "Tell me about his current role",
  "What are his top technical skills?",
]

// Typewriter hook
function useTypewriter(texts, speed = 60, pause = 1800) {
  const [displayed, setDisplayed] = useState('')
  const [textIndex, setTextIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = texts[textIndex]
    let timeout

    if (!deleting && charIndex < current.length) {
      timeout = setTimeout(() => setCharIndex(i => i + 1), speed)
    } else if (!deleting && charIndex === current.length) {
      timeout = setTimeout(() => setDeleting(true), pause)
    } else if (deleting && charIndex > 0) {
      timeout = setTimeout(() => setCharIndex(i => i - 1), speed / 2)
    } else if (deleting && charIndex === 0) {
      setDeleting(false)
      setTextIndex(i => (i + 1) % texts.length)
    }

    setDisplayed(current.slice(0, charIndex))
    return () => clearTimeout(timeout)
  }, [charIndex, deleting, textIndex, texts, speed, pause])

  return displayed
}

// Text-to-speech — picks the most natural voice available
function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const clean = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\n/g, ' ')
  const utter = new SpeechSynthesisUtterance(clean)

  const voices = window.speechSynthesis.getVoices()
  // Preference order: natural-sounding voices on Mac/Chrome/Windows
  const preferred = voices.find(v => v.name === 'Samantha')           // macOS
    || voices.find(v => v.name === 'Google US English')               // Chrome
    || voices.find(v => v.name === 'Microsoft Aria Online (Natural)') // Windows
    || voices.find(v => v.name === 'Alex')                            // macOS fallback
    || voices.find(v => v.lang === 'en-US' && v.localService)        // any local en-US
    || voices.find(v => v.lang === 'en-US')

  if (preferred) utter.voice = preferred
  utter.rate = 0.9    // slightly slower = clearer, less robotic
  utter.pitch = 1.05  // slightly warmer tone
  utter.lang = 'en-US'
  window.speechSynthesis.speak(utter)
}

function stopSpeaking() {
  window.speechSynthesis?.cancel()
}

// Render **bold** text
function renderText(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}

// Speaker icon SVG
function SpeakerIcon({ active }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {active
        ? <><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></>
        : <line x1="23" y1="9" x2="17" y2="15" />
      }
    </svg>
  )
}

function Message({ role, content, suggestions = [], showContact = false, onSpeak, isSpeaking, isMobile, onSuggest }) {
  const isUser = role === 'user'
  const [copied, setCopied] = useState(false)

  function copyText() {
    navigator.clipboard.writeText(content.replace(/\*\*/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '20px',
      padding: isMobile ? '0 12px' : '0 24px',
      animation: 'fadeSlideIn 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', width: '100%' }}>
        {!isUser && (
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c6ef2, #a78bfa)',
            boxShadow: '0 0 12px rgba(124, 110, 242, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: '#fff',
            flexShrink: 0, marginRight: 10, marginTop: 2,
          }}>M</div>
        )}
        <div style={{ maxWidth: isMobile ? '88%' : '70%' }}>
          <div style={{
            background: isUser ? 'linear-gradient(135deg, #7c6ef2, #a78bfa)' : '#1e1e2e',
            color: '#f0f0f0',
            borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
            padding: isMobile ? '10px 13px' : '12px 16px',
            fontSize: isMobile ? 14 : 14.5,
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
            boxShadow: isUser ? '0 4px 20px rgba(124,110,242,0.3)' : '0 2px 12px rgba(0,0,0,0.3)',
            border: isUser ? 'none' : '1px solid #2a2a3e',
          }}>
            {renderText(content)}
          </div>
          {!isUser && (
            <div style={{ display: 'flex', gap: 4, marginTop: 6, paddingLeft: 4 }}>
              {/* Listen button */}
              <button
                onClick={() => isSpeaking ? stopSpeaking() : onSpeak(content)}
                title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: isSpeaking ? '#a78bfa' : '#555',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, padding: '2px 6px', borderRadius: 4,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#a78bfa'}
                onMouseLeave={e => e.currentTarget.style.color = isSpeaking ? '#a78bfa' : '#555'}
              >
                <SpeakerIcon active={isSpeaking} />
                {isSpeaking ? 'Stop' : 'Listen'}
              </button>
              {/* Copy button */}
              <button
                onClick={copyText}
                title="Copy to clipboard"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: copied ? '#a78bfa' : '#555',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, padding: '2px 6px', borderRadius: 4,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#a78bfa'}
                onMouseLeave={e => e.currentTarget.style.color = copied ? '#a78bfa' : '#555'}
              >
                {copied
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                }
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Suggestion chips — appear below bot message after typing finishes */}
      {!isUser && suggestions.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          marginTop: 10, paddingLeft: isMobile ? 0 : 40,
          animation: 'fadeSlideIn 0.4s ease',
        }}>
          {suggestions.map((s, idx) => (
            <button key={idx} onClick={() => onSuggest(s)} style={{
              background: 'transparent',
              border: '1px solid #2a2a4a',
              borderRadius: 20, padding: '6px 14px',
              color: '#a78bfa', fontSize: 12.5, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(124,110,242,0.12)'
                e.currentTarget.style.borderColor = '#7c6ef2'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = '#2a2a4a'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', marginBottom: 16 }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'linear-gradient(135deg, #7c6ef2, #a78bfa)',
        boxShadow: '0 0 12px rgba(124, 110, 242, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 14, color: '#fff', flexShrink: 0, marginRight: 12,
      }}>M</div>
      <div style={{
        background: '#1e1e2e', border: '1px solid #2a2a3e',
        borderRadius: '4px 18px 18px 18px',
        padding: '14px 18px', display: 'flex', gap: 6,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#7c6ef2',
            animation: 'bounce 1.2s infinite',
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

// Welcome screen with typewriter
function WelcomeScreen({ onSuggest, isMobile }) {
  const roles = [
    'Data Engineer',
    'Cloud & Spark Expert',
    'ETL/ELT Architect',
    'AI & LLM Enthusiast',
  ]
  const typed = useTypewriter(roles, 65, 2000)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 28, padding: '0 24px',
    }}>
      {/* Avatar with pulse glow */}
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: -8, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,110,242,0.3) 0%, transparent 70%)',
          animation: 'pulse 2.5s ease-in-out infinite',
        }} />
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c6ef2, #a78bfa)',
          boxShadow: '0 0 30px rgba(124, 110, 242, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 28, color: '#fff',
          position: 'relative',
        }}>M</div>
      </div>

      {/* Name & typewriter role */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: 26, fontWeight: 700, color: '#f0f0f0',
          marginBottom: 8, letterSpacing: '-0.3px',
        }}>
          Hi, I'm Meet's AI Assistant
        </h1>
        <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#a78bfa', fontSize: 16, fontWeight: 500 }}>
            {typed}
            <span style={{ animation: 'blink 1s step-end infinite', opacity: 1 }}>|</span>
          </span>
        </div>
        <p style={{ color: '#666', fontSize: 14, marginTop: 10, maxWidth: 380 }}>
          Ask me anything about Meetkumar Patel's background, skills, or experience.
        </p>
      </div>

      {/* Suggestion chips */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, maxWidth: 560, width: '100%', padding: isMobile ? '0 8px' : 0 }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => onSuggest(s)} style={{
            background: '#1a1a2e',
            border: '1px solid #2a2a4a',
            borderRadius: 12, padding: '13px 15px',
            color: '#ccc', fontSize: 13, cursor: 'pointer',
            textAlign: 'left', lineHeight: 1.4,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#7c6ef2'
              e.currentTarget.style.boxShadow = '0 0 12px rgba(124,110,242,0.2)'
              e.currentTarget.style.color = '#f0f0f0'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#2a2a4a'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.color = '#ccc'
            }}
          >{s}</button>
        ))}
      </div>
    </div>
  )
}


// ── Share modal ───────────────────────────────────────────────────────────────
const SHARE_RECIPIENTS = [
  {
    icon: '👔',
    who: 'Hiring manager',
    why: "They can review Meet's answers without joining the call — no summary email needed.",
  },
  {
    icon: '⚙️',
    who: 'Engineering lead',
    why: "Let them see how Meet explains his technical stack in his own words.",
  },
  {
    icon: '🤝',
    who: 'HR / Talent team',
    why: "Skip the manual writeup — forward the link and they get the full picture.",
  },
  {
    icon: '🔗',
    who: 'LinkedIn or email',
    why: "Share as a proof point: 'We spoke with this candidate — worth a look.'",
  },
]

function ShareModal({ messages, onClose, isMobile }) {
  const [shareUrl, setShareUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function generate() {
      setLoading(true)
      try {
        const res = await fetch('/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages }),
        })
        if (!res.ok) throw new Error()
        const { id } = await res.json()
        setShareUrl(`${window.location.origin}${window.location.pathname}?share=${id}`)
      } catch {
        setError("Couldn't generate link. Make sure the backend is running.")
      } finally {
        setLoading(false)
      }
    }
    generate()
  }, [])

  function copyLink() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? 16 : 24,
        animation: 'fadeSlideIn 0.2s ease',
      }}
    >
      <div style={{
        background: '#0f0f1a',
        border: '1px solid #2a2a4a',
        borderRadius: 20,
        padding: isMobile ? 20 : 28,
        width: '100%', maxWidth: 520,
        display: 'flex', flexDirection: 'column', gap: 22,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        position: 'relative',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#555', fontSize: 20, lineHeight: 1, padding: 4,
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = '#f0f0f0'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >✕</button>

        {/* Header */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, color: '#f0f0f0', marginBottom: 6 }}>
            Share this conversation
          </div>
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.55 }}>
            Anyone with the link can read this chat — no login needed. Great for forwarding to someone who should know about Meet.
          </p>
        </div>

        {/* Link box */}
        <div style={{
          background: '#1a1a2e',
          border: `1px solid ${copied ? '#7c6ef2' : '#2a2a4a'}`,
          borderRadius: 12, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          transition: 'border-color 0.3s',
        }}>
          {loading ? (
            <span style={{ fontSize: 13, color: '#555', flex: 1 }}>Generating link…</span>
          ) : error ? (
            <span style={{ fontSize: 13, color: '#f87171', flex: 1 }}>{error}</span>
          ) : (
            <span style={{
              fontSize: 13, color: '#a78bfa', flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: 'monospace',
            }}>{shareUrl}</span>
          )}
          <button
            onClick={copyLink}
            disabled={!shareUrl}
            style={{
              background: copied
                ? 'rgba(124,110,242,0.2)'
                : shareUrl ? 'rgba(124,110,242,0.12)' : '#1e1e2e',
              border: `1px solid ${copied ? '#7c6ef2' : '#3a3a5a'}`,
              borderRadius: 8, padding: '6px 14px',
              color: copied ? '#a78bfa' : shareUrl ? '#a78bfa' : '#444',
              fontSize: 12, fontWeight: 600, cursor: shareUrl ? 'pointer' : 'default',
              transition: 'all 0.2s', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {copied
              ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
              : 'Copy link'
            }
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#1e1e2e' }} />
          <span style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Who to share with</span>
          <div style={{ flex: 1, height: 1, background: '#1e1e2e' }} />
        </div>

        {/* Recipient cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SHARE_RECIPIENTS.map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: '#1a1a2e', borderRadius: 12, padding: '12px 14px',
              border: '1px solid #1e1e2e',
              transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2a2a4a'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}
            >
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#d0c8ff', marginBottom: 3 }}>{r.who}</div>
                <div style={{ fontSize: 12.5, color: '#666', lineHeight: 1.55 }}>{r.why}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>
          Read-only · no account needed · conversation saved on Meet's server
        </div>
      </div>
    </div>
  )
}

// ── Job Fit Analyzer overlay ──────────────────────────────────────────────────
function JobFitAnalyzer({ onClose, isMobile }) {
  const [jd, setJd] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const JD_MAX = 8000
  const jdCount = jd.length
  const jdNearLimit = jdCount > JD_MAX * 0.85
  const jdAtLimit = jdCount >= JD_MAX

  async function analyze() {
    if (!jd.trim() || jdAtLimit) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd }),
      })
      if (!res.ok) throw new Error('Server error')
      setResult(await res.json())
    } catch {
      setError("Couldn't reach the server. Make sure the backend is running.")
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = result
    ? result.score >= 80 ? '#4ade80'
    : result.score >= 60 ? '#facc15'
    : '#f87171'
    : '#a78bfa'

  return (
    // Backdrop
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? 16 : 24,
        animation: 'fadeSlideIn 0.2s ease',
      }}
    >
      {/* Card */}
      <div style={{
        background: '#0f0f1a',
        border: '1px solid #2a2a4a',
        borderRadius: 20,
        padding: isMobile ? 20 : 28,
        width: '100%',
        maxWidth: 560,
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        position: 'relative',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#555', fontSize: 20, lineHeight: 1, padding: 4,
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = '#f0f0f0'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >✕</button>

        {/* Header */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c6ef2, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>M</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#f0f0f0' }}>
              See if Meet fits your role
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, paddingLeft: 42 }}>
            Paste a job description and get an instant fit score with matched skills and any gaps.
          </p>
        </div>

        {!result ? (
          <>
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value.slice(0, JD_MAX))}
              placeholder="Paste the job description here — title, requirements, responsibilities, tech stack…"
              style={{
                width: '100%', minHeight: 180,
                background: '#1a1a2e',
                border: `1px solid ${jdAtLimit ? '#f87171' : jdNearLimit ? '#facc15' : '#2a2a4a'}`,
                borderRadius: 12, padding: '14px 16px',
                color: '#f0f0f0', fontSize: 14, lineHeight: 1.6,
                resize: 'vertical', fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { if (!jdAtLimit && !jdNearLimit) e.target.style.borderColor = '#7c6ef2' }}
              onBlur={e => e.target.style.borderColor = jdAtLimit ? '#f87171' : jdNearLimit ? '#facc15' : '#2a2a4a'}
            />
            {/* Character counter */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end',
              marginTop: -8,
            }}>
              <span style={{
                fontSize: 11.5,
                color: jdAtLimit ? '#f87171' : jdNearLimit ? '#facc15' : '#444',
                transition: 'color 0.2s',
              }}>
                {jdCount.toLocaleString()} / {JD_MAX.toLocaleString()} characters
                {jdAtLimit && ' — limit reached'}
              </span>
            </div>
            {error && (
              <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>
            )}
            <button
              onClick={analyze}
              disabled={!jd.trim() || loading}
              style={{
                background: jd.trim() && !loading
                  ? 'linear-gradient(135deg, #7c6ef2, #a78bfa)'
                  : '#2a2a3e',
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '13px 24px', fontSize: 14, fontWeight: 600,
                cursor: jd.trim() && !loading ? 'pointer' : 'default',
                transition: 'all 0.2s',
                boxShadow: jd.trim() && !loading
                  ? '0 4px 20px rgba(124,110,242,0.35)' : 'none',
              }}
            >
              {loading ? 'Analyzing…' : 'Analyze →'}
            </button>
          </>
        ) : (
          <>
            {/* Score */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 20,
              background: '#1a1a2e', borderRadius: 14, padding: '18px 20px',
              border: '1px solid #2a2a4a',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                border: `3px solid ${scoreColor}`,
                boxShadow: `0 0 20px ${scoreColor}44`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                  {result.score}
                </span>
                <span style={{ fontSize: 10, color: '#555' }}>/100</span>
              </div>
              <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.65 }}>
                {result.summary}
              </p>
            </div>

            {/* Matches */}
            {result.matches.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Strong matches
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.matches.map((m, i) => (
                    <span key={i} style={{
                      background: 'rgba(74,222,128,0.1)',
                      border: '1px solid rgba(74,222,128,0.3)',
                      color: '#4ade80', borderRadius: 99,
                      padding: '5px 13px', fontSize: 13,
                    }}>{m}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Gaps */}
            {result.gaps.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Worth discussing
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.gaps.map((g, i) => (
                    <span key={i} style={{
                      background: 'rgba(250,204,21,0.08)',
                      border: '1px solid rgba(250,204,21,0.25)',
                      color: '#facc15', borderRadius: 99,
                      padding: '5px 13px', fontSize: 13,
                    }}>{g}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div style={{
              display: 'flex', gap: 10, paddingTop: 4,
              borderTop: '1px solid #1e1e2e',
            }}>
              <button
                onClick={() => { setResult(null); setJd('') }}
                style={{
                  flex: 1, background: 'none', border: '1px solid #2a2a4a',
                  borderRadius: 10, padding: '10px', color: '#888',
                  fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c6ef2'; e.currentTarget.style.color = '#f0f0f0' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a4a'; e.currentTarget.style.color = '#888' }}
              >
                Try another role
              </button>
              <a
                href="mailto:meetpatel0996@gmail.com"
                style={{
                  flex: 1, background: 'linear-gradient(135deg, #7c6ef2, #a78bfa)',
                  borderRadius: 10, padding: '10px',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', textAlign: 'center',
                  boxShadow: '0 4px 16px rgba(124,110,242,0.3)',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Contact Meet →
              </a>
            </div>

            <div style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>
              Powered by LLaMA 3.3 70B via Groq · AI-generated, not a guarantee
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ChatWindow() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [speakingIndex, setSpeakingIndex] = useState(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [stats, setStats] = useState({ visitors: null, chats: null })
  const [showAnalyzer, setShowAnalyzer] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [sharedView, setSharedView] = useState(null) // { messages } — read-only mode
  const isMobile = useIsMobile()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const chatAreaRef = useRef(null)

  // Ping /visit once on mount, then fetch /stats
  useEffect(() => {
    fetch('/visit', { method: 'POST' }).catch(() => {})
    fetch('/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})

    // Load shared conversation if ?share=id is in the URL
    const shareId = new URLSearchParams(window.location.search).get('share')
    if (shareId) {
      fetch(`/share/${shareId}`)
        .then(r => r.json())
        .then(data => {
          setSharedView(data.messages)
          setStarted(true)
          setMessages(data.messages)
        })
        .catch(() => {})
    }
  }, [])

  // Auto-scroll only when near bottom
  useEffect(() => {
    const el = chatAreaRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom < 120) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setShowScrollBtn(false)
    } else {
      setShowScrollBtn(true)
    }
  }, [messages, loading])

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollBtn(false)
  }

  function handleChatScroll(e) {
    const el = e.currentTarget
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBtn(distFromBottom > 120)
  }

  const handleSpeak = useCallback((content, index) => {
    if (speakingIndex === index) {
      stopSpeaking()
      setSpeakingIndex(null)
    } else {
      speak(content)
      setSpeakingIndex(index)
      // Auto-clear speaking state when done
      const clean = content.replace(/\*\*/g, '')
      const duration = (clean.length / 15) * 1000
      setTimeout(() => setSpeakingIndex(null), duration)
    }
  }, [speakingIndex])

  async function sendMessage(text) {
    const userMsg = text.trim()
    if (!userMsg || loading) return

    stopSpeaking()
    setSpeakingIndex(null)
    setStarted(true)
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const history = newMessages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history }),
      })

      if (!res.ok) throw new Error(`Server error: ${res.status}`)

      const data = await res.json()
      const { reply, suggestions = [], showContact = false } = data

      // Type out the reply character by character
      setLoading(false)
      setMessages(prev => [...prev, { role: 'assistant', content: '', suggestions: [], showContact: false }])

      for (let i = 0; i < reply.length; i++) {
        await new Promise(r => setTimeout(r, 18))
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: reply.slice(0, i + 1),
            suggestions: [],
            showContact: false,
          }
          return updated
        })
      }

      // After typing is done, attach suggestions and contact flag
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: reply,
          suggestions,
          showContact,
        }
        return updated
      })

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't connect to the server. Please make sure the backend is running.",
        suggestions: [],
        showContact: false,
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#0d0d14', color: '#f0f0f0', position: 'relative',
    }}>
      <DataBackground />
      {/* Header */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid #1e1e2e',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(13,13,20,0.85)',
        backdropFilter: 'blur(12px)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c6ef2, #a78bfa)',
          boxShadow: '0 0 14px rgba(124,110,242,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 15, color: '#fff',
        }}>M</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#f0f0f0' }}>Meet Patel</div>
          <div style={{ fontSize: 12, color: '#7c6ef2' }}>Data Engineer · AI Assistant</div>
        </div>

        {/* Live stats counter */}
        {stats.visitors !== null && !isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14,
            marginLeft: 12,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(124,110,242,0.1)',
              border: '1px solid rgba(124,110,242,0.2)',
              borderRadius: 20, padding: '3px 10px',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#4ade80',
                display: 'inline-block',
                boxShadow: '0 0 6px #4ade80',
                animation: 'pulse 2s ease-in-out infinite',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {stats.visitors.toLocaleString()} {isMobile ? '' : 'visitors'}
              </span>
            </div>
            {!isMobile && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(124,110,242,0.1)',
                border: '1px solid rgba(124,110,242,0.2)',
                borderRadius: 20, padding: '3px 10px',
              }}>
                <span style={{ fontSize: 13 }}>💬</span>
                <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {stats.chats.toLocaleString()} chats
                </span>
              </div>
            )}
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14 }}>
          {/* Job fit button */}
          <button
            onClick={() => setShowAnalyzer(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg, #7c6ef2, #a78bfa)',
              color: '#fff', border: 'none', borderRadius: 20,
              padding: isMobile ? '6px 12px' : '7px 16px',
              fontSize: isMobile ? 11.5 : 12.5, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(124,110,242,0.35)',
              transition: 'opacity 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            {isMobile ? 'Fit check' : 'See if Meet fits your role'}
          </button>

          {!isMobile && [
            { label: 'LinkedIn', url: 'https://linkedin.com/in/meet-patel-314050108' },
            { label: 'GitHub', url: 'https://github.com/meetpatel09' },
            { label: 'Email', url: 'mailto:meetpatel0996@gmail.com' },
          ].map(({ label, url }) => (
            <a key={label} href={url} target="_blank" rel="noreferrer" style={{
              color: '#555', textDecoration: 'none', fontSize: 13,
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#a78bfa'}
              onMouseLeave={e => e.currentTarget.style.color = '#555'}
            >{label}</a>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={chatAreaRef}
        onScroll={handleChatScroll}
        style={{ flex: 1, overflowY: 'auto', paddingTop: 24, position: 'relative', zIndex: 1 }}
      >
        {!started ? (
          <WelcomeScreen onSuggest={sendMessage} isMobile={isMobile} />
        ) : (
          <div style={{ maxWidth: 740, margin: '0 auto', width: '100%' }}>
            {messages.map((msg, i) => (
              <Message
                key={i}
                role={msg.role}
                content={msg.content}
                suggestions={msg.suggestions || []}
                showContact={msg.showContact || false}
                onSpeak={(content) => handleSpeak(content, i)}
                isSpeaking={speakingIndex === i}
                isMobile={isMobile}
                onSuggest={sendMessage}
              />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} style={{ height: 20 }} />
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && started && (
        <button onClick={scrollToBottom} style={{
          position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, background: '#1e1e2e', border: '1px solid #3a3a5a',
          borderRadius: 20, padding: '6px 16px', color: '#a78bfa',
          fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          animation: 'fadeSlideIn 0.2s ease',
        }}>
          ↓ New messages
        </button>
      )}

      {/* Input bar */}
      <div style={{ padding: isMobile ? '12px 12px 18px' : '16px 24px 24px', background: 'rgba(13,13,20,0.85)', backdropFilter: 'blur(12px)', position: 'relative', zIndex: 1 }}>
        {/* Share strip — appears above input once there are messages */}
        {messages.length >= 2 && !sharedView && (
          <div style={{
            maxWidth: 740, margin: '0 auto 10px',
            background: 'rgba(124,110,242,0.07)',
            border: '1px solid rgba(124,110,242,0.2)',
            borderRadius: 12, padding: '9px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 10, animation: 'fadeSlideIn 0.4s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c6ef2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span style={{
                fontSize: isMobile ? 11.5 : 12.5, color: '#888',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                <span style={{ color: '#a78bfa', fontWeight: 500 }}>Tip: </span>
                {getShareHint(messages)}
              </span>
            </div>
            <button
              onClick={() => setShowShare(true)}
              style={{
                background: 'rgba(124,110,242,0.15)',
                border: '1px solid rgba(124,110,242,0.3)',
                borderRadius: 8, padding: '5px 13px',
                color: '#a78bfa', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', flexShrink: 0,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,110,242,0.25)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,110,242,0.15)'; e.currentTarget.style.color = '#a78bfa' }}
            >
              Share →
            </button>
          </div>
        )}

        {/* Read-only banner for shared view */}
        {sharedView && (
          <div style={{
            maxWidth: 740, margin: '0 auto 12px',
            background: '#1a1a2e', border: '1px solid #2a2a4a',
            borderRadius: 12, padding: '12px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span style={{ fontSize: 13, color: '#888' }}>Read-only shared view</span>
            </div>
            <a href={window.location.pathname} style={{
              fontSize: 12.5, fontWeight: 600, color: '#a78bfa',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.color = '#a78bfa'}
            >
              Start your own conversation →
            </a>
          </div>
        )}
        <div style={{
          maxWidth: 740, margin: '0 auto',
          background: '#1a1a2e',
          borderRadius: 16,
          border: '1px solid #2a2a4a',
          display: 'flex', alignItems: 'flex-end', gap: 10, padding: '12px 16px',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
          onFocus={() => { }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#7c6ef2'
            e.currentTarget.style.boxShadow = '0 0 20px rgba(124,110,242,0.15)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#2a2a4a'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => !sharedView && setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sharedView ? 'This is a read-only shared conversation' : "Ask about Meet's experience, skills, or projects..."}
            disabled={!!sharedView}
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#f0f0f0', fontSize: 14.5, resize: 'none', lineHeight: 1.5,
              maxHeight: 140, overflowY: 'auto', fontFamily: 'inherit',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
            }}
          />
          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none',
              background: input.trim() && !loading
                ? 'linear-gradient(135deg, #7c6ef2, #a78bfa)'
                : '#2a2a3e',
              boxShadow: input.trim() && !loading
                ? '0 0 14px rgba(124,110,242,0.4)'
                : 'none',
              color: '#fff', cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.2s', fontSize: 16,
            }}
          >↑</button>
        </div>
        <p style={{ textAlign: 'center', color: '#333', fontSize: 12, marginTop: 10 }}>
          This AI only knows about Meet Patel's professional background.
        </p>
      </div>

      {/* ── Share modal ──────────────────────────────────────────────────────── */}
      {showShare && (
        <ShareModal
          messages={messages}
          onClose={() => setShowShare(false)}
          isMobile={isMobile}
        />
      )}

      {/* ── Job Fit Analyzer overlay ─────────────────────────────────────────── */}
      {showAnalyzer && (
        <JobFitAnalyzer onClose={() => setShowAnalyzer(false)} isMobile={isMobile} />
      )}

      {/* ── Floating Contact Card ───────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: isMobile ? 90 : 100,
        right: isMobile ? 12 : 24,
        zIndex: 20,
        background: 'rgba(18,18,30,0.92)',
        border: '1px solid #3a2a6a',
        borderRadius: 16,
        padding: '12px 16px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 0 24px rgba(124,110,242,0.25), 0 8px 32px rgba(0,0,0,0.5)',
        minWidth: isMobile ? 180 : 210,
        animation: 'contactGlow 3s ease-in-out infinite',
      }}>
        {/* Label */}
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          color: '#7c6ef2', textTransform: 'uppercase', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#7c6ef2',
            display: 'inline-block',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          To Hire Meet
        </div>
        {/* Schedule a meeting */}
        <a
          href="https://calendly.com/meetpatel0996/30min"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: '#d0c8ff', textDecoration: 'none', fontSize: 12.5,
            marginBottom: 8, transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#d0c8ff'}
        >
          <span style={{
            width: 26, height: 26, borderRadius: 8,
            background: 'rgba(124,110,242,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </span>
          Schedule a meeting
        </a>

        {/* Download resume */}
        <a
          href="/resume"
          download="Meetkumar_Patel_Resume.pdf"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: '#d0c8ff', textDecoration: 'none', fontSize: 12.5,
            marginBottom: 8, transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#d0c8ff'}
        >
          <span style={{
            width: 26, height: 26, borderRadius: 8,
            background: 'rgba(124,110,242,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </span>
          Download resume
        </a>

        {/* Email */}
        <a href="mailto:meetpatel0996@gmail.com" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: '#d0c8ff', textDecoration: 'none', fontSize: 12.5,
          marginBottom: 8, transition: 'color 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#d0c8ff'}
        >
          <span style={{
            width: 26, height: 26, borderRadius: 8,
            background: 'rgba(124,110,242,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </span>
          meetpatel0996@gmail.com
        </a>
        {/* Phone */}
        <a href="tel:+919687023460" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: '#d0c8ff', textDecoration: 'none', fontSize: 12.5,
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#d0c8ff'}
        >
          <span style={{
            width: 26, height: 26, borderRadius: 8,
            background: 'rgba(124,110,242,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.55a16 16 0 0 0 6 6l.92-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </span>
          +91 96870 23460
        </a>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes contactGlow {
          0%, 100% { box-shadow: 0 0 24px rgba(124,110,242,0.25), 0 8px 32px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 36px rgba(124,110,242,0.5), 0 8px 32px rgba(0,0,0,0.5); }
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 3px; }
        ::placeholder { color: #444; }
      `}</style>
    </div>
  )
}
