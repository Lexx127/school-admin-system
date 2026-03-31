'use client'

import { useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { api } from '@/lib/api'

export default function GlobalCalendarDrawer() {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [terms, setTerms] = useState([])
  const [calendarView, setCalendarView] = useState('month')
  const [selectedTermId, setSelectedTermId] = useState('')

  useEffect(() => {
    async function loadCalendar() {
      const [termsResult, eventsResult] = await Promise.allSettled([
        api.get('/calendar/terms'),
        api.get('/notices/events/upcoming'),
      ])

      const calendarEvents = []

      if (eventsResult.status === 'fulfilled') {
        for (const e of eventsResult.value || []) {
          calendarEvents.push({
            title: e.title,
            start: e.start_datetime,
            end: e.end_datetime || e.start_datetime,
            color: '#2563eb',
          })
        }
      }

      if (termsResult.status === 'fulfilled') {
        setTerms(termsResult.value || [])
        if ((termsResult.value || []).length > 0) {
          setSelectedTermId(String(termsResult.value[0].id))
        }
        for (const term of termsResult.value || []) {
          calendarEvents.push({
            title: `${term.name} (${term.academic_year})`,
            start: term.start_date,
            end: term.end_date,
            display: 'background',
            color: '#dbeafe',
          })
        }
      }

      setEvents(calendarEvents)
    }

    loadCalendar()
  }, [])

  const stripDays = useMemo(() => {
    const days = []
    const base = new Date()
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      days.push(d)
    }
    return days
  }, [])

  const selectedTerm = useMemo(
    () => terms.find(t => String(t.id) === String(selectedTermId)),
    [terms, selectedTermId]
  )
  const initialView = calendarView === 'week' ? 'timeGridWeek' : 'dayGridMonth'
  const validRange = calendarView === 'term' && selectedTerm
    ? { start: selectedTerm.start_date, end: selectedTerm.end_date }
    : undefined

  return (
    <>
      <div style={{
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: 60,
      }}>
        <button
          onClick={() => setOpen(prev => !prev)}
          style={{
            background: 'var(--blue-deep)',
            color: 'white',
            border: 'none',
            borderRadius: '999px',
            padding: '12px 18px',
            fontSize: '13px',
            fontWeight: '700',
            boxShadow: 'var(--shadow-lg)',
            cursor: 'pointer',
          }}
        >
          Calendar
        </button>
      </div>

      {open && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 'min(92vw, 820px)',
          height: '100vh',
          background: '#fff',
          borderLeft: '1px solid #e5e7eb',
          boxShadow: '-10px 0 30px rgba(15,32,68,0.16)',
          zIndex: 55,
          padding: '20px',
          overflow: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-dark)' }}>School Calendar</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select value={calendarView} onChange={(e) => setCalendarView(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 8px', fontSize: '12px' }}>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="term">Term</option>
              </select>
              {calendarView === 'term' && (
                <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 8px', fontSize: '12px' }}>
                  {terms.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.academic_year})</option>
                  ))}
                </select>
              )}
              <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '14px' }}>
            {stripDays.map((d) => (
              <div key={d.toISOString()} style={{ padding: '8px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                  {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)' }}>{d.getDate()}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{d.toLocaleDateString('en-GB', { month: 'short' })}</div>
              </div>
            ))}
          </div>

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={initialView}
            key={`${calendarView}-${selectedTermId || 'none'}`}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,dayGridMonth',
            }}
            height="auto"
            events={events}
            validRange={validRange}
            initialDate={selectedTerm?.start_date}
            eventDisplay="block"
            dayMaxEvents={3}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          />
        </div>
      )}
    </>
  )
}
