'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function TeacherDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [notices, setNotices] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clockInStatus, setClockInStatus] = useState('')

  useEffect(() => {
    async function loadData() {
  try {
    const [userData, dashData, assignData, noticeData, eventData] = await Promise.allSettled([
      api.get('/auth/me'),
      api.get('/users/teacher/dashboard'),
      api.get('/homework/teacher/mine'),
      api.get('/notices/mine'),
      api.get('/notices/events/upcoming'),
    ])

    // If auth fails, redirect to login immediately
    if (userData.status === 'rejected') {
      router.push('/')
      return
    }

    // Set each piece of data independently — a failure in one won't affect others
    if (userData.status === 'fulfilled') setUser(userData.value)
    if (dashData.status === 'fulfilled') setDashboard(dashData.value)
    if (assignData.status === 'fulfilled') setAssignments(assignData.value)
    if (noticeData.status === 'fulfilled') setNotices(noticeData.value)
    if (eventData.status === 'fulfilled') setEvents(eventData.value)

    // Log any failures so you can see them in the browser console
    const failures = [userData, dashData, assignData, noticeData, eventData]
      .map((r, i) => r.status === 'rejected' ? `Request ${i}: ${r.reason}` : null)
      .filter(Boolean)

    if (failures.length > 0) console.warn('Some dashboard requests failed:', failures)

  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
    loadData()
  }, [])

  async function handleClockIn() {
    try {
      const data = await api.post('/attendance/staff/clockin')
      setClockInStatus(`Clocked in at ${data.time}${data.flagged ? ' — Late' : ''}`)
    } catch (err) {
      setClockInStatus(err.message)
    }
  }

  async function handleClockOut() {
    try {
      const data = await api.post('/attendance/staff/clockout')
      setClockInStatus(`Clocked out at ${data.time}`)
    } catch (err) {
      setClockInStatus(err.message)
    }
  }

  async function handleLogout() {
    await api.post('/auth/logout')
    router.push('/')
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const upcomingAssignments = assignments.filter(a => !a.is_past_due)
  const awaitingGrades = assignments.filter(a => a.is_past_due && a.grades_entered === 0)
  const pendingGrades = assignments.filter(a => a.is_past_due)

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
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading your dashboard...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--off-white)' }}>

      {/* SIDEBAR */}
      <div style={{
        width: '260px', background: 'var(--blue-deep)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0,
        height: '100vh', overflowY: 'auto',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          padding: '28px 24px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            width: '42px', height: '42px',
            background: 'white',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-playfair)',
            fontSize: '16px', fontWeight: '700',
            color: 'var(--blue-deep)',
            marginBottom: '12px',
          }}>AC</div>
          <div style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '15px', color: 'white', lineHeight: '1.3',
          }}>
            Agape College
          </div>
          <span style={{
            display: 'inline-block', marginTop: '8px',
            padding: '3px 10px',
            background: 'rgba(37,99,235,0.25)',
            border: '1px solid rgba(37,99,235,0.4)',
            borderRadius: '20px',
            fontSize: '11px', color: '#93c5fd',
            fontWeight: '500', textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>Teacher</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px' }}>
          {[
            { label: 'Overview', items: [
              { name: 'Dashboard', icon: '⊞', active: true },
            ]},
            { label: 'Teaching', items: [
              { name: 'Attendance', icon: '✓' },
              { name: 'Homework', icon: '📖', badge: upcomingAssignments.length || null },
              { name: 'Grades', icon: '📊', badge: awaitingGrades.length || null },
            ]},
            { label: 'School', items: [
              { name: 'Notices', icon: '🔔' },
              { name: 'Events', icon: '📅' },
            ]},
          ].map(section => (
            <div key={section.label}>
              <div style={{
                fontSize: '10px', fontWeight: '600',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.3)',
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
                  transition: 'all 0.15s',
                }}>
                  <span>{item.icon}</span>
                  {item.name}
                  {item.badge ? (
                    <span style={{
                      marginLeft: 'auto',
                      background: 'var(--blue-accent)',
                      color: 'white', fontSize: '10px',
                      fontWeight: '700', padding: '2px 7px',
                      borderRadius: '20px',
                    }}>{item.badge}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'rgba(37,99,235,0.3)',
            border: '2px solid rgba(37,99,235,0.5)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: '600', color: '#93c5fd',
            flexShrink: 0,
          }}>
            {user ? `${user.first_name[0]}${user.last_name[0]}` : 'TM'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user ? `${user.first_name} ${user.last_name}` : ''}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </div>
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
              fontFamily: 'var(--font-playfair)',
              fontSize: '30px', color: 'var(--text-dark)', marginBottom: '4px',
            }}>
              Good morning, {user?.first_name}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{today}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleClockIn} style={{
                padding: '10px 20px',
                background: 'var(--blue-deep)', color: 'white',
                border: 'none', borderRadius: '8px',
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              }}>Clock In</button>
              <button onClick={handleClockOut} style={{
                padding: '10px 20px',
                background: 'white', color: 'var(--blue-deep)',
                border: '1.5px solid var(--blue-deep)', borderRadius: '8px',
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              }}>Clock Out</button>
            </div>
            {clockInStatus && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {clockInStatus}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', background: '#fde8e8',
            border: '1px solid #fca5a5', borderRadius: '8px',
            color: '#c0392b', fontSize: '13px', marginBottom: '24px',
          }}>{error}</div>
        )}

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px', marginBottom: '32px',
        }}>
          {[
            {
              icon: '👨‍🎓',
              value: dashboard?.classes?.reduce((sum, c) => sum + c.student_count, 0) || 0,
              label: 'Students Across Classes',
              sub: `${dashboard?.classes?.length || 0} classes this term`,
            },
            {
              icon: '📋',
              value: upcomingAssignments.length,
              label: 'Upcoming Assignments',
              sub: 'Active this term',
            },
            {
              icon: '⚠️',
              value: awaitingGrades.length,
              label: 'Awaiting Grades',
              sub: 'Need grading',
            },
            {
              icon: '📢',
              value: notices.length,
              label: 'Active Notices',
              sub: 'Visible to your class',
            },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: '12px',
              padding: '24px', boxShadow: 'var(--shadow)',
              border: '1px solid #eef0f8',
              borderTop: '3px solid var(--blue-accent)',
            }}>
              <div style={{
                width: '40px', height: '40px',
                background: 'var(--blue-light)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', marginBottom: '16px',
              }}>{stat.icon}</div>
              <div style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: '32px', fontWeight: '700',
                color: 'var(--text-dark)', lineHeight: '1', marginBottom: '4px',
              }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{stat.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--blue-accent)', marginTop: '8px' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* My Classes */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid #eef0f8',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  My Classes
                </h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafbfc' }}>
                    {['Class', 'Subject', 'Students'].map(h => (
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
                  {dashboard?.classes?.map((cls, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f5f6fa' }}>
                      <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-dark)', fontWeight: '500' }}>
                        {cls.class_name}
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {cls.subject_name}
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {cls.student_count} students
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Assignments */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid #eef0f8',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  Assignments
                </h3>
              </div>
              {assignments.length === 0 ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No assignments yet
                </div>
              ) : (
                assignments.map((a, i) => (
                  <div key={i} style={{
                    padding: '16px 24px', borderBottom: '1px solid #f5f6fa',
                    display: 'flex', alignItems: 'center', gap: '16px',
                  }}>
                    <div style={{
                      width: '40px', height: '40px',
                      background: 'var(--blue-light)', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: '700', color: 'var(--blue-deep)',
                      flexShrink: 0,
                    }}>
                      {a.subject_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                        {a.title} — {a.class_name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {a.subject_name} · {a.max_marks} marks · {a.grades_entered} grades entered
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {a.is_past_due ? (
                        <>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#e67e22' }}>
                            Awaiting Grades
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Due {new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-dark)' }}>
                            {new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Due date</div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column */}
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
              </div>
              {notices.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No notices
                </div>
              ) : (
                notices.slice(0, 4).map((n, i) => (
                  <div key={i} style={{
                    padding: '14px 24px', borderBottom: '1px solid #f5f6fa', cursor: 'pointer',
                  }}>
                    <div style={{
                      display: 'inline-block', padding: '2px 8px',
                      borderRadius: '4px', fontSize: '10px', fontWeight: '600',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      marginBottom: '6px',
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
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>Upcoming Events</h3>
              </div>
              {events.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No upcoming events
                </div>
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
