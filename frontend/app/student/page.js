'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function StudentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [homework, setHomework] = useState({ upcoming: [], past: [] })
  const [grades, setGrades] = useState([])
  const [attendance, setAttendance] = useState(null)
  const [notices, setNotices] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  useEffect(() => {
    async function loadData() {
      const [userData, homeworkData, gradesData, attendanceData, noticeData, eventData] =
        await Promise.allSettled([
          api.get('/auth/me'),
          api.get('/homework/student/mine'),
          api.get('/grades/student/mine'),
          api.get('/attendance/students/me'),
          api.get('/notices/mine'),
          api.get('/notices/events/upcoming'),
        ])

      if (userData.status === 'rejected') { router.push('/'); return }

      if (userData.status === 'fulfilled') setUser(userData.value)
      if (homeworkData.status === 'fulfilled') setHomework(homeworkData.value)
      if (gradesData.status === 'fulfilled') setGrades(gradesData.value.grades_by_subject || [])
      if (attendanceData.status === 'fulfilled') setAttendance(attendanceData.value.summary || null)
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
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading your dashboard...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const overallAverage = grades.length > 0
  ? Math.round(grades.reduce((sum, g) => sum + (g.overall_percentage || 0), 0) / grades.length)
  : null

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
          }}>Student</span>
        </div>

        <nav style={{ flex: 1, padding: '16px' }}>
          {[
            { label: 'My School', items: [
              { name: 'Dashboard', icon: '⊞', active: true },
              { name: 'Homework', icon: '📖', badge: homework.upcoming?.length || null },
              { name: 'My Grades', icon: '📊' },
              { name: 'Attendance', icon: '✓' },
              { name: 'Notices', icon: '🔔', badge: notices.filter(n => !n.is_read).length || null },
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
                      marginLeft: 'auto', background: 'var(--blue-accent)',
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
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
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
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{
            fontFamily: 'var(--font-playfair)', fontSize: '30px',
            color: 'var(--text-dark)', marginBottom: '4px',
          }}>
            Hello, {user?.first_name}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{today}</p>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px', marginBottom: '32px',
        }}>
          {[
            {
              icon: '📊',
              value: attendance ? `${attendance.attendance_percentage}%` : '—',
              label: 'Attendance Rate',
              sub: attendance ? `${attendance.days_attended} of ${attendance.total_days} days` : 'No data yet',
              subColor: attendance?.attendance_percentage >= 90 ? '#16a34a' : '#e67e22',
            },
            {
              icon: '📚',
              value: homework.upcoming?.length || 0,
              label: 'Upcoming Assignments',
              sub: 'Due this term',
              subColor: 'var(--blue-accent)',
            },
            {
              icon: '🏆',
              value: overallAverage !== null ? `${overallAverage}%` : '—',
              label: 'Overall Average',
              sub: grades.length > 0 ? `Across ${grades.length} subjects` : 'No grades yet',
              subColor: overallAverage >= 75 ? '#16a34a' : overallAverage >= 50 ? '#e67e22' : '#c0392b',
            },
            {
              icon: '📢',
              value: notices.length,
              label: 'Active Notices',
              sub: 'From school',
              subColor: 'var(--blue-accent)',
            },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: '12px', padding: '24px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8',
              borderTop: '3px solid var(--blue-accent)',
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

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Upcoming Homework */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid #eef0f8',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  Upcoming Homework
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {homework.upcoming?.length || 0} assignments
                </span>
              </div>
              {!homework.upcoming?.length ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No upcoming assignments 🎉
                </div>
              ) : (
                homework.upcoming.map((a, i) => {
                  const due = new Date(a.due_date)
                  const daysLeft = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={i} style={{
                      padding: '16px 24px', borderBottom: '1px solid #f5f6fa',
                      display: 'flex', alignItems: 'center', gap: '16px',
                    }}>
                      <div style={{
                        width: '40px', height: '40px', background: 'var(--blue-light)',
                        borderRadius: '10px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '12px', fontWeight: '700',
                        color: 'var(--blue-deep)', flexShrink: 0,
                      }}>
                        {a.subject_name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                          {a.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {a.subject_name} · {a.teacher_name} · {a.max_marks} marks
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: '12px', fontWeight: '600',
                          color: daysLeft <= 2 ? '#c0392b' : daysLeft <= 5 ? '#e67e22' : 'var(--text-dark)',
                        }}>
                          {daysLeft === 0 ? 'Due Today' : daysLeft === 1 ? 'Due Tomorrow' : `${daysLeft} days left`}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Grades by Subject */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid #eef0f8',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  My Grades by Subject
                </h3>
              </div>
              {!grades.length ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No released grades yet
                </div>
              ) : (
                grades.map((g, i) => (
                  <div key={i} style={{ padding: '16px 24px', borderBottom: '1px solid #f5f6fa' }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: '10px',
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                          {g.subject_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {g.grade_count} assessment{g.grade_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-playfair)',
                        fontSize: '18px', fontWeight: '600',
                        color: g.overall_percentage >= 75 ? '#16a34a'
                          : g.overall_percentage >= 50 ? '#e67e22' : '#c0392b',
                      }}>
                        {Math.round(g.overall_percentage)}%
                      </span>
                    </div>
                    <div style={{ background: '#eef0f8', borderRadius: '4px', height: '6px' }}>
                      <div style={{
                        height: '6px', borderRadius: '4px',
                        width: `${g.overall_percentage}%`,
                        background: g.overall_percentage >= 75
                          ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                          : g.overall_percentage >= 50
                          ? 'linear-gradient(90deg, #e67e22, #fbbf24)'
                          : 'linear-gradient(90deg, #c0392b, #f87171)',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Past Homework with Grades */}
            {homework.past?.length > 0 && (
              <div style={{
                background: 'white', borderRadius: '12px',
                boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
              }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                    Past Assignments
                  </h3>
                </div>
                {homework.past.map((a, i) => (
                  <div key={i} style={{
                    padding: '16px 24px', borderBottom: '1px solid #f5f6fa',
                    display: 'flex', alignItems: 'center', gap: '16px',
                  }}>
                    <div style={{
                      width: '40px', height: '40px', background: '#f5f6fa',
                      borderRadius: '10px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '12px', fontWeight: '700',
                      color: 'var(--text-muted)', flexShrink: 0,
                    }}>
                      {a.subject_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {a.subject_name} · Due {new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {a.grade ? (
                        <>
                          <div style={{
                            fontSize: '14px', fontWeight: '700',
                            color: (a.grade.marks_obtained / a.max_marks * 100) >= 75 ? '#16a34a'
                              : (a.grade.marks_obtained / a.max_marks * 100) >= 50 ? '#e67e22' : '#c0392b',
                          }}>
                            {a.grade.marks_obtained}/{a.max_marks}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {Math.round(a.grade.marks_obtained / a.max_marks * 100)}%
                          </div>
                        </>
                      ) : (
                        <span style={{
                          fontSize: '11px', color: 'var(--text-muted)',
                          background: '#f5f6fa', padding: '4px 8px', borderRadius: '4px',
                        }}>Not yet released</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Attendance Summary */}
            {attendance && (
              <div style={{
                background: 'var(--blue-deep)', borderRadius: '12px',
                padding: '28px 24px', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', width: '200px', height: '200px',
                  background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)',
                  top: '-60px', right: '-60px', pointerEvents: 'none',
                }} />
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Attendance This Term
                </div>
                <div style={{
                  fontFamily: 'var(--font-playfair)', fontSize: '48px',
                  color: 'white', fontWeight: '700', lineHeight: '1', marginBottom: '4px',
                }}>
                  {attendance.attendance_percentage}%
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
                  {attendance.days_attended} present · {attendance.days_absent} absent · {attendance.days_late} late
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '6px' }}>
                  <div style={{
                    height: '6px', borderRadius: '4px',
                    width: `${attendance.attendance_percentage}%`,
                    background: attendance.attendance_percentage >= 90 ? '#4ade80' : '#fbbf24',
                  }} />
                </div>
              </div>
            )}

            {/* Notices */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>Notices</h3>
              </div>
              {!notices.length ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No notices
                </div>
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
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>Upcoming Events</h3>
              </div>
              {!events.length ? (
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
