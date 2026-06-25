import { useEffect, useState, useCallback, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// ---------------------------------------------------------------------------
// Sidebar navigation — each item is now a real tab (id matches the view key).
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { id: 'dashboard', icon: '⬡', label: 'Dashboard' },
  { id: 'calls', icon: '📞', label: 'Calls' },
  { id: 'recordings', icon: '⏺', label: 'Recordings' },
  { id: 'leads', icon: '⇶', label: 'Lead Pipeline' },
  { id: 'whatsapp', icon: '💬', label: 'WhatsApp' },
  { id: 'staff', icon: '👥', label: 'Staff' },
  { id: 'audit', icon: '◈', label: 'Audit' },
  { id: 'revenue', icon: '₹', label: 'Revenue' },
  { id: 'export', icon: '⬇', label: 'Export' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' })
}

function isToday(iso) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function isWithinDays(iso, days) {
  if (!iso) return false
  const d = new Date(iso).getTime()
  return Date.now() - d <= days * 24 * 60 * 60 * 1000
}

function formatINR(n) {
  if (!n) return '₹0'
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

const PREVIEW_ROWS = [
  { id: 'p1', from: '+91 98401 23456', direction: 'inbound', status: 'answered', startTime: null, duration: '210', recordingUrl: null, previewLabel: '09:14 AM' },
  { id: 'p2', from: '+91 94470 98765', direction: 'inbound', status: 'in progress', startTime: null, duration: null, recordingUrl: null, previewLabel: '10:02 AM' },
  { id: 'p3', from: '+91 77001 55432', direction: 'inbound', status: 'missed', startTime: null, duration: null, recordingUrl: null, previewLabel: '11:30 AM' },
]

const LEAD_STAGES = [
  { id: 'new', title: 'New Lead', cards: [
    { name: 'Anjali Krishnan', note: 'Interested in Azhimala dive trip next weekend for 4 people.' },
  ]},
  { id: 'quote', title: 'Quotation Sent', cards: [
    { name: 'James Carter', note: 'Certified diver, equipment rental only.', val: '₹12,000' },
  ]},
  { id: 'follow', title: 'Follow Up', cards: [
    { name: 'Kavya Reddy', note: 'Divemaster enquiring IDC. Very high value. Excellent call.', val: '₹65,000' },
  ]},
  { id: 'booked', title: 'Booking Confirmed', cards: [
    { name: 'Kiran Raj', note: 'IDC course confirmed for next month.', val: '₹65,000' },
  ]},
]

const AUDIT_CRITERIA = [
  { name: 'Communication Clarity', desc: 'How clearly the agent explained packages and next steps' },
  { name: 'Product Knowledge', desc: 'Accuracy on courses, certifications, and trip details' },
  { name: 'Objection Handling', desc: 'How price or scheduling concerns were addressed' },
  { name: 'Closing Quality', desc: 'Whether the call moved the lead toward booking' },
  { name: 'Customer Sentiment', desc: 'Overall tone and satisfaction read from the call' },
]

const WHATSAPP_TEMPLATES = [
  { name: 'New Enquiry Acknowledgement', body: 'Thank you for contacting Temple Adventures. Our team will reach out shortly to help plan your dive.' },
  { name: 'Quotation Follow-up', body: 'Thank you for your interest! For your requested package, here are the details and pricing...' },
  { name: 'Booking Confirmation', body: "Your booking is confirmed! We'll send trip details and prep instructions 48 hours before your dive." },
]

const STAFF = [
  { name: 'Priya Menon', role: 'Senior Dive Consultant' },
  { name: 'Arjun Das', role: 'Dive Consultant' },
  { name: 'Priya Sharma', role: 'Bookings & Operations' },
  { name: 'Arjun Kumar', role: 'Customer Success' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const [calls, setCalls] = useState([])
  const [callStatus, setCallStatus] = useState('loading')
  const [callError, setCallError] = useState('')

  const [bookings, setBookings] = useState([])
  const [bookingStatus, setBookingStatus] = useState('loading')
  const [bookingError, setBookingError] = useState('')
  const [form, setForm] = useState({ customer: '', package: '', amount: '' })
  const [submitting, setSubmitting] = useState(false)

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const loadCalls = useCallback(async () => {
    setCallStatus('loading')
    try {
      const res = await fetch('/api/calls')
      const data = await res.json()
      if (!res.ok) {
        setCallStatus('not-configured')
        setCallError(data?.error || 'Exotel function returned an error.')
        return
      }
      console.log('Raw Exotel response:', data)
      setCalls(normalizeExotelCalls(data))
      setCallStatus('real')
    } catch (err) {
      setCallStatus('fetch-error')
      setCallError(err.message)
    }
  }, [])

  const loadBookings = useCallback(async () => {
    setBookingStatus('loading')
    try {
      const res = await fetch('/api/bookings')
      const data = await res.json()
      if (!res.ok) {
        setBookingStatus('not-configured')
        setBookingError(data?.error || 'Revenue storage not connected.')
        return
      }
      setBookings(data.bookings || [])
      setBookingStatus('real')
    } catch (err) {
      setBookingStatus('fetch-error')
      setBookingError(err.message)
    }
  }, [])

  useEffect(() => {
    loadCalls()
    loadBookings()
  }, [loadCalls, loadBookings])

  async function submitBooking(e) {
    e.preventDefault()
    if (!form.customer || !form.amount) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      })
      const data = await res.json()
      if (res.ok) {
        setBookings(data.bookings || [])
        setBookingStatus('real')
        setForm({ customer: '', package: '', amount: '' })
      } else {
        setBookingError(data?.error || 'Could not save booking.')
        setBookingStatus('not-configured')
      }
    } catch (err) {
      setBookingError(err.message)
      setBookingStatus('fetch-error')
    } finally {
      setSubmitting(false)
    }
  }

  const callsToday = calls.filter((c) => isToday(c.startTime)).length
  const usingPreviewCalls = callStatus !== 'real' || calls.length === 0
  const callRows = callStatus === 'real' && calls.length > 0 ? calls : PREVIEW_ROWS

  const revenueThisWeek = useMemo(
    () => bookings.filter((b) => isWithinDays(b.date, 7)).reduce((sum, b) => sum + Number(b.amount || 0), 0),
    [bookings]
  )
  const revenueThisMonth = useMemo(
    () => bookings.filter((b) => isWithinDays(b.date, 30)).reduce((sum, b) => sum + Number(b.amount || 0), 0),
    [bookings]
  )
  const chartData = useMemo(() => {
    const buckets = WEEKDAYS.map((d) => ({ day: d, revenue: 0 }))
    bookings.forEach((b) => {
      if (!isWithinDays(b.date, 7)) return
      const dow = new Date(b.date).getDay()
      const idx = dow === 0 ? 6 : dow - 1
      buckets[idx].revenue += Number(b.amount || 0)
    })
    return buckets
  }, [bookings])
  const hasRealRevenue = bookingStatus === 'real' && bookings.length > 0

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">🤿</div>
          <div className="brand-text">TEMPLE<span>ADVENTURES</span></div>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" />
          ALL SYSTEMS OPERATIONAL
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="greeting">Good morning 👋</div>
            <div className="greeting-sub">{NAV_ITEMS.find((n) => n.id === activeTab)?.label}</div>
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

        {activeTab === 'dashboard' && (
          <>
            <div className="stat-grid">
              <div className="card">
                <div className="stat-label">Calls Today</div>
                <div className="stat-value">{callStatus === 'real' ? callsToday : '—'}</div>
                <div className="stat-delta">{callStatus === 'real' ? 'From your connected Exotel number' : 'Connect Exotel to see this'}</div>
              </div>
              <div className="card">
                <div className="stat-label">Rev This Week</div>
                <div className="stat-value">{hasRealRevenue ? formatINR(revenueThisWeek) : '—'}</div>
                <div className="stat-delta">{hasRealRevenue ? 'From logged bookings' : 'Log a booking on the Revenue tab'}</div>
              </div>
              <div className="card">
                <div className="stat-label">Bookings</div>
                <div className="stat-value">{bookingStatus === 'real' ? bookings.length : '—'}</div>
                <div className="stat-delta">{bookingStatus === 'real' ? 'Total logged' : 'Connect revenue storage'}</div>
              </div>
            </div>

            <div className="section-title">
              Recent Calls
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {usingPreviewCalls ? <span className="data-badge preview">Preview data</span> : <span className="data-badge real">Live from Exotel</span>}
                <button className="refresh-btn" onClick={loadCalls} disabled={callStatus === 'loading'}>
                  ↻ {callStatus === 'loading' ? 'Loading…' : 'Refresh'}
                </button>
              </div>
            </div>
            <CallsTable rows={callRows} />
          </>
        )}

        {activeTab === 'calls' && (
          <>
            <div className="section-title">
              All Calls
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {usingPreviewCalls ? <span className="data-badge preview">Preview data</span> : <span className="data-badge real">Live from Exotel</span>}
                <button className="refresh-btn" onClick={loadCalls} disabled={callStatus === 'loading'}>
                  ↻ {callStatus === 'loading' ? 'Loading…' : 'Refresh'}
                </button>
              </div>
            </div>
            {callStatus === 'not-configured' && (
              <div className="card" style={{ marginBottom: 16, borderColor: 'var(--gold)' }}>
                <strong style={{ color: 'var(--gold)' }}>Exotel isn't connected yet.</strong>
                <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6 }}>{callError}</p>
              </div>
            )}
            <CallsTable rows={callRows} />
          </>
        )}

        {activeTab === 'recordings' && (
          <>
            <div className="section-title">Recordings</div>
            {(() => {
              const withRecordings = calls.filter((c) => c.recordingUrl)
              if (withRecordings.length === 0) {
                return (
                  <div className="table-wrap">
                    <div className="empty-state">
                      <div className="big">⏺</div>
                      <div className="title">No recordings yet</div>
                      <div className="sub">Recordings appear here automatically once Exotel returns a recording URL for a completed call.</div>
                    </div>
                  </div>
                )
              }
              return (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Caller</th><th>Time</th><th>Recording</th></tr></thead>
                    <tbody>
                      {withRecordings.map((c) => (
                        <tr key={c.id}>
                          <td className="caller-name">{c.from}</td>
                          <td style={{ color: 'var(--text-dim)' }}>{formatTime(c.startTime)}</td>
                          <td><a href={c.recordingUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--aqua)' }}>▶ Play</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </>
        )}

        {activeTab === 'leads' && (
          <>
            <div className="section-title">
              Lead Pipeline
              <span className="data-badge preview">Preview structure</span>
            </div>
            <div className="card" style={{ marginBottom: 16, borderColor: 'var(--gold)' }}>
              <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                This shows the intended pipeline structure. To make it live, leads need their own data source — we can wire this up once Calls/Revenue are confirmed working.
              </p>
            </div>
            <div className="kanban">
              {LEAD_STAGES.map((stage) => (
                <div className="kanban-col" key={stage.id}>
                  <div className="kanban-col-title"><span>{stage.title}</span><span>{stage.cards.length}</span></div>
                  {stage.cards.map((c) => (
                    <div className="kanban-card" key={c.name}>
                      <div className="name">{c.name}</div>
                      <div className="note">{c.note}</div>
                      {c.val && <div className="val">{c.val}</div>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'whatsapp' && (
          <>
            <div className="section-title">
              WhatsApp Templates
              <span className="data-badge preview">Automation not yet connected</span>
            </div>
            <div className="template-list">
              {WHATSAPP_TEMPLATES.map((t) => (
                <div className="template-card" key={t.name}>
                  <div className="tname">{t.name}</div>
                  <div className="tbody">"{t.body}"</div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'staff' && (
          <>
            <div className="section-title">
              Staff
              <span className="data-badge preview">Metrics need agent-tagged calls</span>
            </div>
            <div className="staff-grid">
              {STAFF.map((s) => (
                <div className="staff-card" key={s.name}>
                  <div className="staff-avatar">{s.name.split(' ').map((p) => p[0]).join('')}</div>
                  <div className="staff-name">{s.name}</div>
                  <div className="staff-role">{s.role}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'audit' && (
          <>
            <div className="section-title">
              Call Audit Criteria
              <span className="data-badge preview">AI scoring not yet connected</span>
            </div>
            <div className="audit-list">
              {AUDIT_CRITERIA.map((c) => (
                <div className="audit-row" key={c.name}>
                  <div>
                    <div className="crit">{c.name}</div>
                    <div className="desc">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'revenue' && (
          <>
            <div className="stat-grid">
              <div className="card">
                <div className="stat-label">This Week</div>
                <div className="stat-value">{hasRealRevenue ? formatINR(revenueThisWeek) : '—'}</div>
              </div>
              <div className="card">
                <div className="stat-label">This Month</div>
                <div className="stat-value">{hasRealRevenue ? formatINR(revenueThisMonth) : '—'}</div>
              </div>
              <div className="card">
                <div className="stat-label">Bookings</div>
                <div className="stat-value">{bookingStatus === 'real' ? bookings.length : '—'}</div>
              </div>
            </div>

            <div className="section-title">
              Log a Booking
              {hasRealRevenue ? <span className="data-badge real">Live</span> : <span className="data-badge preview">Add your first booking below</span>}
            </div>

            {bookingStatus === 'not-configured' && (
              <div className="card" style={{ marginBottom: 16, borderColor: 'var(--gold)' }}>
                <strong style={{ color: 'var(--gold)' }}>Revenue storage isn't connected yet.</strong>
                <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6 }}>{bookingError}</p>
              </div>
            )}

            <form className="booking-form" onSubmit={submitBooking}>
              <div>
                <label className="field-label">Customer name</label>
                <input className="field-input" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Anjali Krishnan" required />
              </div>
              <div>
                <label className="field-label">Package</label>
                <input className="field-input" value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} placeholder="PADI Certification" />
              </div>
              <div>
                <label className="field-label">Amount (₹)</label>
                <input className="field-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="65000" required />
              </div>
              <div>
                <label className="field-label">Date</label>
                <input className="field-input" type="date" onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? 'Saving…' : '+ Add'}</button>
            </form>

            <div className="section-title">Daily Revenue (last 7 days)</div>
            <div className="card" style={{ height: 260, marginBottom: 24 }}>
              {hasRealRevenue ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2dd9c8" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#2dd9c8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#232838" vertical={false} />
                    <XAxis dataKey="day" stroke="#8a91a6" fontSize={11} />
                    <YAxis stroke="#8a91a6" fontSize={11} tickFormatter={formatINR} />
                    <Tooltip contentStyle={{ background: '#181c26', border: '1px solid #232838', fontSize: 12 }} formatter={(v) => formatINR(v)} />
                    <Area type="monotone" dataKey="revenue" stroke="#2dd9c8" fill="url(#rev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <div className="big">₹</div>
                  <div className="title">No bookings logged yet</div>
                  <div className="sub">Add your first booking above and this chart fills in automatically.</div>
                </div>
              )}
            </div>

            <div className="section-title">Recent Bookings</div>
            <div className="table-wrap">
              {bookings.length === 0 ? (
                <div className="empty-state"><div className="sub">Nothing logged yet.</div></div>
              ) : (
                <table>
                  <thead><tr><th>Customer</th><th>Package</th><th>Amount</th><th>Date</th></tr></thead>
                  <tbody>
                    {bookings.slice(0, 15).map((b) => (
                      <tr key={b.id}>
                        <td className="caller-name">{b.customer}</td>
                        <td style={{ color: 'var(--text-dim)' }}>{b.package || '—'}</td>
                        <td>{formatINR(b.amount)}</td>
                        <td style={{ color: 'var(--text-dim)' }}>{formatDate(b.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeTab === 'export' && (
          <>
            <div className="section-title">Export Data</div>
            <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => downloadCsv('calls.csv', callRows)}>⬇ Export Calls CSV</button>
              <button className="btn-primary" onClick={() => downloadCsv('bookings.csv', bookings)}>⬇ Export Bookings CSV</button>
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <>
            <div className="section-title">Connections</div>
            <div className="settings-row">
              <div>
                <div className="name">Exotel (Calls)</div>
                <div className="desc">Pulls real call data into Dashboard and Calls tabs</div>
              </div>
              <span className={`conn-pill ${callStatus === 'real' ? 'connected' : 'missing'}`}>
                {callStatus === 'real' ? '● Connected' : '○ Not connected'}
              </span>
            </div>
            <div className="settings-row">
              <div>
                <div className="name">Revenue Storage (Vercel KV)</div>
                <div className="desc">Stores bookings so Revenue numbers are real</div>
              </div>
              <span className={`conn-pill ${bookingStatus === 'real' ? 'connected' : 'missing'}`}>
                {bookingStatus === 'real' ? '● Connected' : '○ Not connected'}
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function CallsTable({ rows }) {
  if (rows.length === 0) {
    return (
      <div className="table-wrap">
        <div className="empty-state">
          <div className="big">📞</div>
          <div className="title">No calls yet</div>
          <div className="sub">Once a call comes into your Exotel number, it'll show up here automatically.</div>
        </div>
      </div>
    )
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Caller</th><th>Direction</th><th>Status</th><th>Duration</th><th>Time</th></tr>
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
    </div>
  )
}

function downloadCsv(filename, rows) {
  if (!rows || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
