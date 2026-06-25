import { useEffect, useState, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Sidebar navigation — just labels + icons, no logic needed here.
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { icon: '⬡', label: 'Dashboard', active: true },
  { icon: '📞', label: 'Calls' },
  { icon: '⏺', label: 'Recordings' },
  { icon: '⇶', label: 'Lead Pipeline' },
  { icon: '💬', label: 'WhatsApp' },
  { icon: '👥', label: 'Staff' },
  { icon: '◈', label: 'Audit' },
  { icon: '₹', label: 'Revenue' },
  { icon: '⬇', label: 'Export' },
  { icon: '⚙', label: 'Settings' },
]

// ---------------------------------------------------------------------------
// Turns whatever Exotel's API gives us into the simple shape our table wants.
// Exotel's exact field names can vary slightly by account — if real data
// looks wrong once you test it, check the browser console (it logs the raw
// response) and adjust the field names below.
// ---------------------------------------------------------------------------
function normalizeExotelCalls(raw) {
  const list = raw?.Calls || raw?.calls || []
  return list.map((entry) => {
    const c = entry.Call || entry
    return {
      id: c.Sid || c.sid || Math.random().toString(36).slice(2),
      from: c.From || c.from || 'Unknown',
      to: c.To || c.to || '—',
      direction: (c.Direction || c.direction || '').replace(/-/g, ' ') || 'inbound',
      status: (c.Status || c.status || 'unknown').toLowerCase(),
      startTime: c.StartTime || c.start_time || c.DateCreated || null,
      duration: c.Duration || c.duration || null,
      recordingUrl: c.RecordingUrl || c.recording_url || null,
    }
  })
}

function statusBadgeClass(status) {
  if (status.includes('progress') || status === 'live') return 'live'
  if (status.includes('miss') || status.includes('no-answer') || status.includes('fail')) return 'missed'
  if (status.includes('complete') || status.includes('answer')) return 'answered'
  return 'completed'
}

function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isToday(iso) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

// A few clearly-labeled example rows, only shown when Exotel isn't
// connected yet — so a demo still looks presentable, without pretending
// fake data is real.
const PREVIEW_ROWS = [
  { id: 'p1', from: '+91 98401 23456', direction: 'inbound', status: 'answered', startTime: null, duration: '210', recordingUrl: null, previewLabel: '09:14 AM' },
  { id: 'p2', from: '+91 94470 98765', direction: 'inbound', status: 'in progress', startTime: null, duration: null, recordingUrl: null, previewLabel: '10:02 AM' },
  { id: 'p3', from: '+91 77001 55432', direction: 'inbound', status: 'missed', startTime: null, duration: null, recordingUrl: null, previewLabel: '11:30 AM' },
]

export default function App() {
  const [calls, setCalls] = useState([])
  const [status, setStatus] = useState('loading') // loading | real | not-configured | fetch-error
  const [errorDetail, setErrorDetail] = useState('')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const loadCalls = useCallback(async () => {
    setStatus((s) => (s === 'loading' ? 'loading' : 'loading'))
    try {
      const res = await fetch('/.netlify/functions/calls')
      const data = await res.json()

      if (!res.ok) {
        setStatus('not-configured')
        setErrorDetail(data?.error || 'Exotel function returned an error.')
        return
      }

      console.log('Raw Exotel response:', data) // helpful while wiring things up
      setCalls(normalizeExotelCalls(data))
      setStatus('real')
    } catch (err) {
      setStatus('fetch-error')
      setErrorDetail(err.message)
    }
  }, [])

  useEffect(() => {
    loadCalls()
  }, [loadCalls])

  const callsToday = calls.filter((c) => isToday(c.startTime)).length
  const usingPreview = status !== 'real' || calls.length === 0
  const rows = status === 'real' && calls.length > 0 ? calls : PREVIEW_ROWS

  return (
    <div className="app">
      {/* ---------------- Sidebar ---------------- */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">🤿</div>
          <div className="brand-text">TEMPLE<span>ADVENTURES</span></div>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <a key={item.label} className={`nav-item ${item.active ? 'active' : ''}`} href="#">
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" />
          ALL SYSTEMS OPERATIONAL
        </div>
      </aside>

      {/* ---------------- Main ---------------- */}
      <main className="main">
        <div className="topbar">
          <div>
            <div className="greeting">Good morning 👋</div>
            <div className="greeting-sub">Real-time call intelligence overview</div>
          </div>
          <div className="topbar-right">
            <div className="live-pill">
              <span className="sonar">
                <span className="sonar-ring" />
                <span className="sonar-core" />
              </span>
              LIVE · {now.toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className="stat-grid">
          <div className="card">
            <div className="stat-label">Calls Today</div>
            <div className="stat-value">{status === 'real' ? callsToday : '—'}</div>
            <div className="stat-delta">{status === 'real' ? 'From your connected Exotel number' : 'Connect Exotel to see this'}</div>
          </div>
          <div className="card">
            <div className="stat-label">Avg Response</div>
            <div className="stat-value">—</div>
            <div className="stat-delta">Needs call-scoring setup (not wired yet)</div>
          </div>
          <div className="card">
            <div className="stat-label">Rev This Week</div>
            <div className="stat-value">—</div>
            <div className="stat-delta">Needs lead/booking tracking (not wired yet)</div>
          </div>
        </div>

        <div className="section-title">
          Recent Calls
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {usingPreview ? (
              <span className="data-badge preview">Preview data</span>
            ) : (
              <span className="data-badge real">Live from Exotel</span>
            )}
            <button className="refresh-btn" onClick={loadCalls} disabled={status === 'loading'}>
              ↻ {status === 'loading' ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {status === 'not-configured' && (
          <div className="card" style={{ marginBottom: 16, borderColor: 'var(--gold)' }}>
            <strong style={{ color: 'var(--gold)' }}>Exotel isn't connected yet.</strong>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6 }}>
              {errorDetail || 'Add EXOTEL_API_KEY, EXOTEL_API_TOKEN and EXOTEL_ACCOUNT_SID in Netlify → Site configuration → Environment variables, then redeploy.'}
            </p>
          </div>
        )}

        <div className="table-wrap">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="big">📞</div>
              <div className="title">No calls yet</div>
              <div className="sub">Once a call comes into your Exotel number, it'll show up here automatically.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Caller</th>
                  <th>Direction</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td><span className="caller-name">{c.from}</span></td>
                    <td style={{ textTransform: 'capitalize', color: 'var(--text-dim)' }}>{c.direction}</td>
                    <td><span className={`badge ${statusBadgeClass(c.status)}`}>{c.status}</span></td>
                    <td style={{ color: 'var(--text-dim)' }}>{c.duration ? `${c.duration}s` : '—'}</td>
                    <td style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {c.previewLabel || formatTime(c.startTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
