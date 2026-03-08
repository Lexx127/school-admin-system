'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function PrincipalDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [clockins, setClockIns] = useState([])
  const [gradeSummary, setGradeSummary] = useState([])
  const [notices, setNotices] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  useEffect(() => {
    async function loadData() {
      const [userData, dashData, clockinData, gradeData, noticeData, eventData] =
        await Promise.allSettled([
          api.get('/auth/me'),
          api.get('/users/principal/dashboard'),
          api.get('/attendance/staff/all'),
          api.get('/grades/principal/summary'),
          api.get('/notices/mine'),
          api.get('/notices/events/upcoming'),
        ])

      if (userData.status === 'rejected') { router.push('/'); return }

      if (userData.status === 'fulfilled') setUser(userData.value)
      if (dashData.status === 'fulfilled') setDashboard(dashData.value)
      if (clockinData.status === 'fulfilled') setClockIns(clockinData.value.records || [])
      if (gradeData.status === 'fulfilled') setGradeSummary(gradeData.value.class_subject_summaries || [])
      if (noticeData.status === 'fulfilled') setNotices(noticeData.value)
      if (eventData.status === 'fulfilled') setEvents(eventData.value)

      setLoading(false)
    }
    loadData()
  }, [])

  async function handleLogout() {
    await api.post('/auth/logout')
    router.push('/')
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--off-white)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px',
          border: '3px solid var(--blue-light)',
          borderTop: '3px solid var(--blue-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading dashboard...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // Derive today's clock-in records
  const todayStr = new Date().toISOString().split('T')[0]
  const todayClockIns = clockins.filter(c => c.date === todayStr)
  const lateCount = todayClockIns.filter(c => c.flagged).length
  const onTimeCount = todayClockIns.filter(c => !c.flagged).length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--off-white)' }}>

      {/* SIDEBAR */}
      <div style={{
        width: '260px', background: 'var(--blue-deep)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0,
        height: '100vh', overflowY: 'auto', zIndex: 10,
      }}>
        <div style={{
          padding: '28px 24px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            width: '42px', height: '42px', background: 'white',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontFamily: 'var(--font-playfair)',
            fontSize: '16px', fontWeight: '700', color: 'var(--blue-deep)',
            marginBottom: '12px',
          }}>AC</div>
          <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '15px', color: 'white', lineHeight: '1.3' }}>
            Agape College
          </div>
          <span style={{
            display: 'inline-block', marginTop: '8px', padding: '3px 10px',
            background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(37,99,235,0.4)',
            borderRadius: '20px', fontSize: '11px', color: '#93c5fd',
            fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>Principal</span>
        </div>

        <nav style={{ flex: 1, padding: '16px' }}>
          {[
            { label: 'Overview', items: [
              { name: 'Dashboard', icon: '⊞', active: true },
            ]},
            { label: 'Administration', items: [
              { name: 'Staff Management', icon: '👥' },
              { name: 'Staff Attendance', icon: '✓', badge: lateCount || null },
              { name: 'Academic Performance', icon: '📊' },
              { name: 'Notices & Events', icon: '🔔' },
            ]},
          ].map(section => (
            <div key={section.label}>
              <div style={{
                fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)',
                padding: '0 12px', marginTop: '24px', marginBottom: '8px',
              }}>{section.label}</div>
              {section.items.map(item => (
                <div key={item.name} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', borderRadius: '8px',
                  color: item.active ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                  background: item.active ? 'rgba(37,99,235,0.15)' : 'transparent',
                  fontSize: '14px', fontWeight: item.active ? '500' : '400',
                  cursor: 'pointer', marginBottom: '2px',
                }}>
                  <span>{item.icon}</span>
                  {item.name}
                  {item.badge ? (
                    <span style={{
                      marginLeft: 'auto', background: '#c0392b',
                      color: 'white', fontSize: '10px', fontWeight: '700',
                      padding: '2px 7px', borderRadius: '20px',
                    }}>{item.badge}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div style={{
          padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '36px', height: '36px', background: 'rgba(37,99,235,0.3)',
            border: '2px solid rgba(37,99,235,0.5)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: '600', color: '#93c5fd', flexShrink: 0,
          }}>
            {user ? `${user.first_name[0]}${user.last_name[0]}` : ''}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user ? `${user.first_name} ${user.last_name}` : ''}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Principal</div>
          </div>
          <button onClick={handleLogout} style={{
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
            fontSize: '18px', flexShrink: 0,
          }} title="Logout">⇥</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: '260px', flex: 1, padding: '40px 48px' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: '36px',
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-playfair)', fontSize: '30px',
              color: 'var(--text-dark)', marginBottom: '4px',
            }}>
              School Overview
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{today}</p>
          </div>
          <button style={{
            padding: '10px 20px', background: 'var(--blue-deep)', color: 'white',
            border: 'none', borderRadius: '8px', fontFamily: 'var(--font-dm-sans)',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          }}>+ Post Notice</button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px', marginBottom: '32px',
        }}>
          {[
            {
              icon: '👨‍🎓',
              value: dashboard?.total_students || '—',
              label: 'Total Students',
              sub: `${dashboard?.total_classes || 0} classes`,
              subColor: 'var(--blue-accent)',
            },
            {
              icon: '👨‍🏫',
              value: dashboard?.total_staff || '—',
              label: 'Total Staff',
              sub: 'Teachers & admin',
              subColor: 'var(--blue-accent)',
            },
            {
              icon: '⚠️',
              value: lateCount,
              label: 'Late Arrivals Today',
              sub: lateCount > 0 ? 'Flagged for review' : 'All on time',
              subColor: lateCount > 0 ? '#c0392b' : '#16a34a',
            },
            {
              icon: '✅',
              value: onTimeCount,
              label: 'On Time Today',
              sub: `${todayClockIns.length} staff clocked in`,
              subColor: '#16a34a',
            },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: '12px', padding: '24px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8',
              borderTop: `3px solid ${i === 2 && lateCount > 0 ? '#c0392b' : 'var(--blue-accent)'}`,
            }}>
              <div style={{
                width: '40px', height: '40px', background: 'var(--blue-light)',
                borderRadius: '10px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '18px', marginBottom: '16px',
              }}>{stat.icon}</div>
              <div style={{
                fontFamily: 'var(--font-playfair)', fontSize: '32px', fontWeight: '700',
                color: 'var(--text-dark)', lineHeight: '1', marginBottom: '4px',
              }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{stat.label}</div>
              <div style={{ fontSize: '12px', color: stat.subColor, marginTop: '8px' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>

          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Staff Clock-In Table */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid #eef0f8',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  Staff Clock-In — Today
                </h3>
                {lateCount > 0 && (
                  <span style={{
                    padding: '4px 12px', background: '#fde8e8',
                    color: '#c0392b', borderRadius: '20px',
                    fontSize: '12px', fontWeight: '600',
                  }}>
                    {lateCount} late arrival{lateCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {todayClockIns.length === 0 ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No clock-ins recorded today yet
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafbfc' }}>
                      {['Staff Member', 'Clock In', 'Clock Out', 'Status'].map(h => (
                        <th key={h} style={{
                          padding: '12px 24px', fontSize: '11px', fontWeight: '600',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          color: 'var(--text-muted)', textAlign: 'left',
                          borderBottom: '1px solid #eef0f8',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todayClockIns.map((c, i) => {
                      const clockIn = c.clock_in_time
                        ? new Date(c.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : '—'
                      const clockOut = c.clock_out_time
                        ? new Date(c.clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : '—'
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f5f6fa' }}>
                          <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-dark)', fontWeight: '500' }}>
                            {c.staff_name}
                          </td>
                          <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {clockIn}
                          </td>
                          <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {clockOut}
                          </td>
                          <td style={{ padding: '14px 24px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center',
                              padding: '4px 10px', borderRadius: '20px',
                              fontSize: '11px', fontWeight: '600',
                              background: c.flagged ? '#fde8e8' : '#e8f8f0',
                              color: c.flagged ? '#c0392b' : '#1a8a4a',
                            }}>
                              {c.flagged ? 'Late' : 'On Time'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Grade Summary */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  Class Performance Summary
                </h3>
              </div>
              {!gradeSummary.length ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No grade data available yet
                </div>
              ) : (
                gradeSummary.filter(g => g.class_average !== null).map((g, i) => (
                  <div key={i} style={{ padding: '16px 24px', borderBottom: '1px solid #f5f6fa' }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: '10px',
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                          {g.class_name} — {g.subject_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {g.teacher_name} · {g.total_grades} grades entered
                        </div>
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-playfair)', fontSize: '18px', fontWeight: '600',
                        color: g.class_average >= 75 ? '#16a34a'
                          : g.class_average >= 50 ? '#e67e22' : '#c0392b',
                      }}>
                        {Math.round(g.class_average)}%
                      </span>
                    </div>
                    <div style={{ background: '#eef0f8', borderRadius: '4px', height: '6px' }}>
                      <div style={{
                        height: '6px', borderRadius: '4px',
                        width: `${g.class_average}%`,
                        background: g.class_average >= 75
                          ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                          : g.class_average >= 50
                          ? 'linear-gradient(90deg, #e67e22, #fbbf24)'
                          : 'linear-gradient(90deg, #c0392b, #f87171)',
                      }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Notices */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid #eef0f8',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>Notices</h3>
                <span style={{ fontSize: '12px', color: 'var(--blue-accent)', cursor: 'pointer', fontWeight: '500' }}>
                  + New
                </span>
              </div>
              {!notices.length ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No notices</div>
              ) : (
                notices.slice(0, 5).map((n, i) => (
                  <div key={i} style={{ padding: '14px 24px', borderBottom: '1px solid #f5f6fa', cursor: 'pointer' }}>
                    <div style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                      fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
                      letterSpacing: '0.06em', marginBottom: '6px',
                      background: n.is_pinned ? 'var(--blue-light)' : '#f0f4ff',
                      color: n.is_pinned ? 'var(--blue-deep)' : 'var(--blue-accent)',
                    }}>
                      {n.is_pinned ? '📌 Pinned' : n.audience}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '4px' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {n.created_by} · {n.comment_count} comments
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Events */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid #eef0f8',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>Upcoming Events</h3>
                <span style={{ fontSize: '12px', color: 'var(--blue-accent)', cursor: 'pointer', fontWeight: '500' }}>
                  + New
                </span>
              </div>
              {!events.length ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No upcoming events</div>
              ) : (
                events.slice(0, 4).map((e, i) => {
                  const d = new Date(e.start_datetime)
                  return (
                    <div key={i} style={{
                      padding: '14px 24px', borderBottom: '1px solid #f5f6fa',
                      display: 'flex', gap: '14px', alignItems: 'flex-start',
                    }}>
                      <div style={{ textAlign: 'center', flexShrink: 0, width: '44px' }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--blue-accent)', fontWeight: '600', letterSpacing: '0.06em' }}>
                          {d.toLocaleDateString('en-GB', { month: 'short' })}
                        </div>
                        <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '22px', color: 'var(--text-dark)', fontWeight: '700', lineHeight: '1' }}>
                          {d.getDate()}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '3px' }}>
                          {e.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {e.location ? `📍 ${e.location}` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
