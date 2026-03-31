'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function StudentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })

  const [homework, setHomework] = useState({ upcoming: [], past: [] })
  const [grades, setGrades] = useState([])
  const [attendance, setAttendance] = useState(null)
  const [notices, setNotices] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [inbox, setInbox] = useState([])
  const [staffList, setStaffList] = useState([])
  const [messageForm, setMessageForm] = useState({ receiver_id: '', subject: '', body: '' })
  const [staffSearch, setStaffSearch] = useState('')
  const [showStaffDropdown, setShowStaffDropdown] = useState(false)
  const [timetable, setTimetable] = useState([])
  const [schoolSettings, setSchoolSettings] = useState({})

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  useEffect(() => {
    async function loadData() {
      const [userData, homeworkData, gradesData, attendanceData, noticeData, eventData, inboxData, staffData, timetableData, settingsData] =
        await Promise.allSettled([
          api.get('/auth/me'),
          api.get('/homework/student/mine'),
          api.get('/grades/student/mine'),
          api.get('/attendance/students/me'),
          api.get('/notices/mine'),
          api.get('/notices/events/upcoming'),
          api.get('/communications/inbox'),
          api.get('/users/staff/all'),
          api.get('/timetable/student/year-view'),
          api.get('/settings/'),
        ])

      if (userData.status === 'rejected') { router.push('/'); return }

      if (userData.status === 'fulfilled') setUser(userData.value)
      if (homeworkData.status === 'fulfilled') setHomework(homeworkData.value)
      if (gradesData.status === 'fulfilled') setGrades(gradesData.value.grades_by_subject || [])
      if (attendanceData.status === 'fulfilled') setAttendance(attendanceData.value || null)
      if (noticeData.status === 'fulfilled') setNotices(noticeData.value)
      if (eventData.status === 'fulfilled') setEvents(eventData.value)
      if (inboxData?.status === 'fulfilled') setInbox(inboxData.value)
      if (staffData?.status === 'fulfilled') setStaffList(staffData.value)
      if (timetableData?.status === 'fulfilled') setTimetable(timetableData.value)
      if (settingsData?.status === 'fulfilled') setSchoolSettings(settingsData.value)

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

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: '20px', marginBottom: '16px', color: 'var(--text-dark)', textAlign: 'left' }}>Change Password</h3>
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (passwordForm.new_password !== passwordForm.confirm_password) {
                return alert("New passwords do not match!")
              }
              try {
                const res = await api.put('/auth/change-password', {
                  current_password: passwordForm.current_password,
                  new_password: passwordForm.new_password
                })
                alert("Password changed successfully!")
                setShowPasswordModal(false)
                setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
              } catch (err) { alert(err.message) }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-dark)' }}>Current Password</label>
                <input type="password" required value={passwordForm.current_password} onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-dark)' }}>New Password</label>
                <input type="password" required minLength="6" value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-dark)' }}>Confirm New Password</label>
                <input type="password" required minLength="6" value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowPasswordModal(false)} style={{ padding: '10px 16px', border: '1px solid #d1d5db', background: 'white', color: 'var(--text-dark)', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 16px', border: 'none', background: 'var(--blue-deep)', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}


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
              { name: 'Dashboard', icon: '⊞' },
              { name: 'My Timetable', icon: '⏳' },
              { name: 'Homework', icon: '📖', badge: homework.upcoming?.length || null },
              { name: 'My Grades', icon: '📊' },
              { name: 'Attendance', icon: '✓' },
              { name: 'Notices', icon: '🔔', badge: notices.filter(n => !n.is_read).length || null },
              { name: 'Events', icon: '📅' },
              { name: 'Communications', icon: '💬' },
            ]},
          ].map(section => (
            <div key={section.label}>
              <div style={{
                fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)',
                padding: '0 12px', marginTop: '24px', marginBottom: '8px',
              }}>{section.label}</div>
              {section.items.map(item => (
                <div key={item.name} 
                  onClick={() => setActiveTab(item.name)}
                  style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', borderRadius: '8px',
                  color: activeTab === item.name ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                  background: activeTab === item.name ? 'rgba(37,99,235,0.15)' : 'transparent',
                  fontSize: '14px', fontWeight: activeTab === item.name ? '500' : '400',
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
          display: 'flex', alignItems: 'center', gap: '12px', position: 'relative',
        }}>
          {showProfileDropdown && (
            <div style={{
               position: 'absolute', bottom: '100%', left: '16px', right: '16px',
               background: 'white', borderRadius: '8px', padding: '8px', marginBottom: '8px',
               boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 20
            }}>
               <button 
                  onClick={() => { setShowPasswordModal(true); setShowProfileDropdown(false); }} 
                  style={{ width: '100%', padding: '10px', textAlign: 'left', background: 'none', border: 'none', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', cursor: 'pointer', borderRadius: '6px' }}
                  onMouseOver={(e) => e.target.style.background = '#f5f6fa'}
                  onMouseOut={(e) => e.target.style.background = 'none'}
               >Change Password</button>
            </div>
          )}
          <div onClick={() => setShowProfileDropdown(!showProfileDropdown)} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, cursor: 'pointer' }}>
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
        {activeTab === 'Dashboard' ? (
          <>
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
              value: attendance ? `${attendance.summary?.attendance_percentage ?? attendance.attendance_percentage ?? 0}%` : '—',
              label: 'Attendance Rate',
              sub: attendance ? `${attendance.summary?.days_attended ?? attendance.days_attended ?? 0} of ${attendance.summary?.total_days ?? attendance.total_days ?? 0} days` : 'No data yet',
              subColor: (attendance?.summary?.attendance_percentage ?? attendance?.attendance_percentage) >= 90 ? '#16a34a' : '#e67e22',
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
                homework.upcoming.slice(0, 3).map((a, i) => {
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
                grades.slice(0, 3).map((g, i) => (
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
                {homework.past.slice(0, 3).map((a, i) => (
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
                  {attendance.summary?.attendance_percentage ?? attendance.attendance_percentage ?? 0}%
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
                  {attendance.summary?.days_attended ?? attendance.days_attended ?? 0} present · {attendance.summary?.days_absent ?? attendance.days_absent ?? 0} absent · {attendance.summary?.days_late ?? attendance.days_late ?? 0} late
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '6px' }}>
                  <div style={{
                    height: '6px', borderRadius: '4px',
                    width: `${attendance.summary?.attendance_percentage ?? attendance.attendance_percentage ?? 0}%`,
                    background: (attendance.summary?.attendance_percentage ?? attendance.attendance_percentage ?? 0) >= 90 ? '#4ade80' : '#fbbf24',
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
          </>
        ) : activeTab === 'My Timetable' ? (
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>My Timetable</h2>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', background: '#fafbfc', border: '1px solid #eef0f8' }}>Period</th>
                    {Array.from({ length: parseInt(schoolSettings.cycle_length || 6) }).map((_, i) => (
                      <th key={i} style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', background: '#fafbfc', border: '1px solid #eef0f8' }}>Day {i+1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: parseInt(schoolSettings.periods_per_day || 8) }).map((_, p) => (
                    <tr key={p}>
                      <td style={{ padding: '12px', fontWeight: '700', fontSize: '13px', background: '#fafbfc', border: '1px solid #eef0f8', textAlign: 'center' }}>{p + 1}</td>
                      {Array.from({ length: parseInt(schoolSettings.cycle_length || 6) }).map((_, d) => {
                        const slots = timetable.filter(s => s.cycle_day === d + 1 && s.period_number === p + 1)
                        return (
                          <td key={d} style={{ padding: '10px', border: '1px solid #eef0f8', minWidth: '120px', height: '80px', verticalAlign: 'top' }}>
                            {slots.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', height: '100%' }}>
                                {slots.map(slot => (
                                  <div key={slot.id} style={{
                                    padding: '8px',
                                    background: slot.is_enrolled ? 'var(--blue-light)' : '#f3f4f6',
                                    borderRadius: '8px',
                                    border: slot.is_enrolled ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
                                  }}>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: slot.is_enrolled ? 'var(--blue-deep)' : '#6b7280' }}>
                                      {slot.subject_name} ({slot.class_name})
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{slot.teacher_name}</div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'Homework' ? (
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>Upcoming Assignments</h2>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
              {!homework.upcoming?.length ? <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No upcoming assignments 🎉</p> : homework.upcoming.map((a, i) => (
                <div key={i} style={{ padding: '16px', borderBottom: '1px solid #f5f6fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--blue-light)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--blue-deep)', flexShrink: 0 }}>
                      {a.subject_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{a.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{a.subject_name} · {a.teacher_name} · {a.max_marks} marks</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', color: 'var(--blue-deep)' }}>Due: {new Date(a.due_date).toLocaleDateString('en-GB')}</div>
                  </div>
                </div>
              ))}
            </div>
            {homework.past?.length > 0 && (
              <div style={{ marginTop: '32px', background: 'white', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-dark)' }}>Past Assignments</h3>
                {homework.past.map((a, i) => (
                  <div key={i} style={{ padding: '16px', borderBottom: '1px solid #f5f6fa', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{a.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{a.subject_name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {a.grade ? (
                        <>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: (a.grade.marks_obtained / a.max_marks * 100) >= 75 ? '#16a34a' : (a.grade.marks_obtained / a.max_marks * 100) >= 50 ? '#e67e22' : '#c0392b' }}>
                            {a.grade.marks_obtained}/{a.max_marks}
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: '#f5f6fa', padding: '4px 8px', borderRadius: '4px' }}>Not yet released</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'My Grades' ? (
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>My Grades</h2>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
              {!grades.length ? <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No released grades yet.</p> : grades.map((g, i) => (
                <div key={i} style={{ padding: '16px', borderBottom: '1px solid #f5f6fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{g.subject_name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{g.grade_count} assessment{g.grade_count !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '18px', color: g.overall_percentage >= 75 ? '#16a34a' : g.overall_percentage >= 50 ? '#e67e22' : '#c0392b' }}>
                    {Math.round(g.overall_percentage)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'Notices' ? (
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>School Notices</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {!notices.length ? (
                <div style={{ background: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
                  No notices available.
                </div>
              ) : (
                notices.map((n, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', borderLeft: n.is_pinned ? '4px solid var(--blue-accent)' : '1px solid #eef0f8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{
                          display: 'inline-block', padding: '4px 10px', borderRadius: '4px',
                          fontSize: '11px', fontWeight: '600', textTransform: 'uppercase',
                          letterSpacing: '0.06em', marginBottom: '8px',
                          background: n.is_pinned ? 'var(--blue-light)' : '#f0f4ff',
                          color: n.is_pinned ? 'var(--blue-deep)' : 'var(--blue-accent)',
                        }}>
                          {n.is_pinned ? '📌 Pinned Announcement' : `To: ${n.audience}`}
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-dark)', lineHeight: '1.4' }}>
                          {n.title}
                        </h3>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-dark)' }}>
                          {n.created_by}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '15px', color: 'var(--text-dark)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {n.body}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'Attendance' ? (
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>My Attendance</h2>
            {!attendance ? (
              <div style={{ background: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>No attendance records yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
                  {[
                    { label: 'Total Days', value: attendance.summary?.total_days ?? attendance.total_days ?? 0, color: 'var(--blue-accent)' },
                    { label: 'Present', value: attendance.summary?.days_attended ?? attendance.days_attended ?? 0, color: '#16a34a' },
                    { label: 'Absent', value: attendance.summary?.days_absent ?? attendance.days_absent ?? 0, color: '#c0392b' },
                    { label: 'Late', value: attendance.summary?.days_late ?? attendance.days_late ?? 0, color: '#e67e22' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '36px', fontWeight: '700', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fafbfc', borderBottom: '1px solid #eef0f8', textAlign: 'left' }}>
                        {['Date', 'Day', 'Status', 'Notes'].map(h => <th key={h} style={{ padding: '14px 24px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {(attendance.records || []).map((r, i) => {
                        const d = new Date(r.date)
                        const statusColor = r.status === 'PRESENT' ? '#16a34a' : r.status === 'ABSENT' ? '#c0392b' : '#e67e22'
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f5f6fa' }}>
                            <td style={{ padding: '14px 24px', fontSize: '14px', color: 'var(--text-dark)', fontWeight: '500' }}>{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>{d.toLocaleDateString('en-GB', { weekday: 'long' })}</td>
                            <td style={{ padding: '14px 24px' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: `${statusColor}18`, color: statusColor }}>{r.status}</span>
                            </td>
                            <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>{r.notes || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'Events' ? (
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>Upcoming Events</h2>
            {!events.length ? (
              <div style={{ background: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>No upcoming events.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {events.map((e, i) => {
                  const d = new Date(e.start_datetime)
                  const end = e.end_datetime ? new Date(e.end_datetime) : null
                  return (
                    <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                      <div style={{ textAlign: 'center', flexShrink: 0, width: '56px', background: 'var(--blue-light)', borderRadius: '10px', padding: '10px 0' }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--blue-accent)', fontWeight: '600' }}>{d.toLocaleDateString('en-GB', { month: 'short' })}</div>
                        <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '28px', color: 'var(--blue-deep)', fontWeight: '700', lineHeight: '1' }}>{d.getDate()}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)' }}>{e.title}</h3>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: '#f0f4ff', color: 'var(--blue-accent)' }}>{e.event_type}</span>
                        </div>
                        {e.description && <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '8px' }}>{e.description}</p>}
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {e.location && <span>📍 {e.location}</span>}
                          <span>🕐 {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}{end ? ` – ${end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'Communications' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
            {/* Inbox */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>Inbox</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {!inbox.length ? (
                  <div style={{ background: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid #eef0f8' }}>
                    Your inbox is empty
                  </div>
                ) : (
                  inbox.map((msg, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{msg.sender_name} ({msg.sender_role})</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(msg.sent_at).toLocaleString('en-GB')}</div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--blue-deep)', marginBottom: '8px' }}>{msg.subject}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-dark)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{msg.body}</div>
                      <button 
                        onClick={() => {
                          setMessageForm({ receiver_id: msg.sender_id, subject: `Re: ${msg.subject}`, body: `\n\n--- Original Message ---\n${msg.body}` })
                          setStaffSearch(msg.sender_name)
                        }}
                        style={{ marginTop: '16px', background: 'none', border: '1px solid var(--blue-accent)', color: 'var(--blue-accent)', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Reply
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Compose */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>Compose</h2>
              <div style={{ background: 'white', borderRadius: '12px', padding: '32px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  try {
                    await api.post('/communications/send', messageForm)
                    alert('Message sent successfully!')
                    setMessageForm({ receiver_id: '', subject: '', body: '' })
                    setStaffSearch('')
                    const res = await api.get('/communications/inbox')
                    setInbox(res)
                  } catch (err) { alert('Error sending message') }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-dark)', marginBottom: '8px' }}>Recipient (School Staff)</label>
                    <input 
                      type="text" 
                      placeholder="Search staff name or role..."
                      value={staffSearch}
                      onChange={(e) => {
                        setStaffSearch(e.target.value)
                        setMessageForm({...messageForm, receiver_id: ''})
                        setShowStaffDropdown(true)
                      }}
                      onFocus={() => setShowStaffDropdown(true)}
                      required={!messageForm.receiver_id}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                    />
                    {showStaffDropdown && staffSearch.length > 1 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #eef0f8', borderRadius: '8px', boxShadow: 'var(--shadow)', maxHeight: '300px', overflowY: 'auto', zIndex: 10 }}>
                        {staffList.filter(s => (s.first_name + ' ' + s.last_name).toLowerCase().includes(staffSearch.toLowerCase()) || s.role.toLowerCase().includes(staffSearch.toLowerCase())).map(s => (
                          <div key={s.user_id} onClick={() => { setMessageForm({...messageForm, receiver_id: s.user_id}); setStaffSearch(`${s.first_name} ${s.last_name} (${s.role})`); setShowStaffDropdown(false) }} style={{ padding: '10px 14px', borderBottom: '1px solid #f5f6fa', cursor: 'pointer', fontSize: '13px' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{s.first_name} {s.last_name} ({s.role})</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.department || ''}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-dark)', marginBottom: '8px' }}>Subject</label>
                    <input 
                      type="text" 
                      value={messageForm.subject}
                      onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})}
                      required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-dark)', marginBottom: '8px' }}>Message</label>
                    <textarea 
                      value={messageForm.body}
                      onChange={(e) => setMessageForm({...messageForm, body: e.target.value})}
                      required
                      rows={6}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical' }}
                    />
                  </div>
                  <button type="submit" style={{ padding: '12px 24px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-start' }}>
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>{activeTab}</h2>
            <div style={{ background: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
              Content for {activeTab} is under construction...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
