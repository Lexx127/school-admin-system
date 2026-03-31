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
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [inbox, setInbox] = useState([])
  const [parentsList, setParentsList] = useState([])
  const [staffList, setStaffList] = useState([])
  const [studentsList, setStudentsList] = useState([])
  const [messageForm, setMessageForm] = useState({ receiver_id: '', subject: '', body: '' })
  const [parentSearch, setParentSearch] = useState('')
  const [showParentDropdown, setShowParentDropdown] = useState(false)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clockInStatus, setClockInStatus] = useState('')
  
  // Teaching Modules State
  const [selectedClassId, setSelectedClassId] = useState('')
  const [classStudents, setClassStudents] = useState([])
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceRecords, setAttendanceRecords] = useState({})
  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [attendanceMode, setAttendanceMode] = useState('mark') // 'mark' or 'history'

  const [hwForm, setHwForm] = useState({ class_subject_id: '', title: '', description: '', due_date: '', max_marks: 100 })
  const [editingHw, setEditingHw] = useState(null)
  
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [gradingStudents, setGradingStudents] = useState([])
  const [gradeEntries, setGradeEntries] = useState({})

  const [noticeForm, setNoticeForm] = useState({ title: '', body: '', audience: 'ALL', target_class_id: '' })
  const [eventForm, setEventForm] = useState({ title: '', description: '', event_type: 'ACADEMIC', location: '', start_datetime: '', end_datetime: '', audience: 'ALL', target_class_id: '' })

  useEffect(() => {
    async function loadData() {
  try {
    const [userData, dashData, assignData, noticeData, eventData, inboxData, parentsData, staffData, studentsData] = await Promise.allSettled([
      api.get('/auth/me'),
      api.get('/users/teacher/dashboard'),
      api.get('/homework/teacher/mine'),
      api.get('/notices/mine'),
      api.get('/notices/events/upcoming'),
      api.get('/communications/inbox'),
      api.get('/users/parents/with-students'),
      api.get('/users/staff/all'),
      api.get('/users/students/all'),
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
    if (inboxData?.status === 'fulfilled') setInbox(inboxData.value)
    if (parentsData?.status === 'fulfilled') setParentsList(parentsData.value)
    if (staffData?.status === 'fulfilled') setStaffList(staffData.value)
    if (studentsData?.status === 'fulfilled') setStudentsList(studentsData.value)

    // Log any failures so you can see them in the browser console
    const failures = [userData, dashData, assignData, noticeData, eventData, inboxData, parentsData, staffData, studentsData]
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

  async function handleCreateNotice(e) {
    e.preventDefault()
    try {
      const payload = { ...noticeForm }
      if (payload.target_class_id) payload.target_class_id = parseInt(payload.target_class_id)
      else delete payload.target_class_id
      await api.post('/notices/create', payload)
      const res = await api.get('/notices/mine')
      setNotices(res)
      setNoticeForm({ title: '', body: '', audience: 'ALL', target_class_id: '' })
      alert('Notice posted!')
    } catch (err) { alert(err.message) }
  }

  async function handleCreateEvent(e) {
    e.preventDefault()
    try {
      const payload = { ...eventForm }
      if (payload.target_class_id) payload.target_class_id = parseInt(payload.target_class_id)
      else delete payload.target_class_id
      await api.post('/notices/events/create', payload)
      const res = await api.get('/notices/events/upcoming')
      setEvents(res)
      setEventForm({ title: '', description: '', event_type: 'ACADEMIC', location: '', start_datetime: '', end_datetime: '', audience: 'ALL', target_class_id: '' })
      alert('Event created!')
    } catch (err) { alert(err.message) }
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
              { name: 'Communications', icon: '💬' },
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
                <div key={item.name} 
                  onClick={() => setActiveTab(item.name)}
                  style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', borderRadius: '8px',
                  color: activeTab === item.name ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                  background: activeTab === item.name ? 'rgba(37,99,235,0.15)' : 'transparent',
                  fontSize: '14px', fontWeight: activeTab === item.name ? '500' : '400',
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

        {activeTab === 'Dashboard' ? (
          <>
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
                  value: assignments.filter(a => !a.is_past_due).length,
                  label: 'Upcoming Assignments',
                  sub: 'Active this term',
                },
                {
                  icon: '⚠️',
                  value: assignments.filter(a => a.is_past_due && a.grades_entered < a.student_count).length,
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
          </>
        ) : activeTab === 'Attendance' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)' }}>Attendance Management</h2>
              <div style={{ display: 'flex', gap: '8px', background: 'white', padding: '4px', borderRadius: '8px', border: '1px solid #eef0f8' }}>
                <button onClick={() => setAttendanceMode('mark')} style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', background: attendanceMode === 'mark' ? 'var(--blue-deep)' : 'transparent', color: attendanceMode === 'mark' ? 'white' : 'var(--text-muted)' }}>Mark Attendance</button>
                <button onClick={() => setAttendanceMode('history')} style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', background: attendanceMode === 'history' ? 'var(--blue-deep)' : 'transparent', color: attendanceMode === 'history' ? 'white' : 'var(--text-muted)' }}>History</button>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #eef0f8', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Select Class</label>
                  <select 
                    value={selectedClassId} 
                    onChange={async (e) => {
                      const cid = e.target.value
                      setSelectedClassId(cid)
                      if (cid) {
                        try {
                          const res = await api.get(`/attendance/students/class/${cid}`)
                          setAttendanceHistory(res)
                          // Also need students in class to mark attendance
                          // Using a generic students list for now or getting from dashboard
                          const cls = dashboard.classes.find(c => c.class_id == cid)
                          if (cls) {
                            // Fetching class details to get student list
                            const details = await api.get(`/users/classes/${cid}/info`)
                            setClassStudents(details.students || [])
                            const initial = {}
                            details.students.forEach(s => initial[s.student_id] = 'PRESENT')
                            setAttendanceRecords(initial)
                          }
                        } catch (err) { console.error(err) }
                      }
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="">-- Choose Class --</option>
                    {dashboard?.classes?.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name} ({c.subject_name})</option>)}
                  </select>
                </div>
                <div style={{ width: '200px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Date</label>
                  <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                </div>
              </div>

              {attendanceMode === 'mark' ? (
                <div>
                  {!selectedClassId ? <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Please select a class to start marking attendance.</p> : (
                    <>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', borderBottom: '1px solid #eef0f8' }}>
                            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Student Name</th>
                            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Status</th>
                            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classStudents.map(s => (
                            <tr key={s.student_id} style={{ borderBottom: '1px solid #f9fafb' }}>
                              <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{s.name}</td>
                              <td style={{ padding: '12px' }}>
                                <select 
                                  value={attendanceRecords[s.student_id]} 
                                  onChange={e => setAttendanceRecords({...attendanceRecords, [s.student_id]: e.target.value})}
                                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
                                >
                                  <option value="PRESENT">Present</option>
                                  <option value="ABSENT">Absent</option>
                                  <option value="LATE">Late</option>
                                </select>
                              </td>
                              <td style={{ padding: '12px' }}>
                                <input placeholder="Optional note..." style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px', width: '100%' }} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button 
                        onClick={async () => {
                          try {
                            const payload = {
                              class_id: parseInt(selectedClassId),
                              date: attendanceDate,
                              records: Object.entries(attendanceRecords).map(([sid, status]) => ({
                                student_id: parseInt(sid),
                                status: status
                              }))
                            }
                            await api.post('/attendance/students/take', payload)
                            alert('Attendance submitted successfully!')
                          } catch (err) { alert(err.message) }
                        }}
                        style={{ marginTop: '24px', padding: '12px 24px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                      >Submit Attendance</button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  {!attendanceHistory.length ? <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No history records for this class.</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #eef0f8' }}>
                          <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Date</th>
                          <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Student</th>
                          <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Status</th>
                          <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Recorded By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceHistory.map((h, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                            <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(h.date).toLocaleDateString()}</td>
                            <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500' }}>{h.student_name}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: h.status === 'PRESENT' ? '#dcfce7' : '#fee2e2', color: h.status === 'PRESENT' ? '#16a34a' : '#c0392b' }}>{h.status}</span>
                            </td>
                            <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>{h.recorded_by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'Homework' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)' }}>Homework / Assignments</h2>
              <button 
                onClick={() => setEditingHw({ class_subject_id: '', title: '', description: '', due_date: '', max_marks: 100 })}
                style={{ padding: '8px 16px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >+ Create New</button>
            </div>

            {editingHw ? (
              <div style={{ background: 'white', borderRadius: '12px', padding: '32px', border: '1px solid #eef0f8', boxShadow: 'var(--shadow)', maxWidth: '600px' }}>
                <h3 style={{ marginBottom: '20px' }}>{editingHw.id ? 'Edit Assignment' : 'Create Assignment'}</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  try {
                    if (editingHw.id) {
                      await api.put(`/homework/update/${editingHw.id}`, editingHw)
                    } else {
                      await api.post('/homework/create', editingHw)
                    }
                    const res = await api.get('/homework/teacher/mine')
                    setAssignments(res)
                    setEditingHw(null)
                  } catch (err) { alert(err.message) }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Class / Subject</label>
                    <select value={editingHw.class_subject_id} onChange={e => setEditingHw({...editingHw, class_subject_id: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                      <option value="">-- Select Class-Subject --</option>
                      {dashboard?.classes?.map(c => <option key={c.class_subject_id} value={c.class_subject_id}>{c.class_name} - {c.subject_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Title</label>
                    <input value={editingHw.title} onChange={e => setEditingHw({...editingHw, title: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Description</label>
                    <textarea value={editingHw.description} onChange={e => setEditingHw({...editingHw, description: e.target.value})} rows={4} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Due Date</label>
                      <input type="date" value={editingHw.due_date} onChange={e => setEditingHw({...editingHw, due_date: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                    </div>
                    <div style={{ width: '100px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Max Marks</label>
                      <input type="number" value={editingHw.max_marks} onChange={e => setEditingHw({...editingHw, max_marks: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Save Assignment</button>
                    <button type="button" onClick={() => setEditingHw(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', padding: '12px 24px' }}>Cancel</button>
                  </div>
                </form>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eef0f8', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', background: '#fafbfc', borderBottom: '1px solid #eef0f8' }}>
                      <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Assignment</th>
                      <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Class</th>
                      <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Due Date</th>
                      <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                      <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => (
                      <tr key={a.assignment_id} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{a.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.subject_name}</div>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '13px' }}>{a.class_name}</td>
                        <td style={{ padding: '16px 24px', fontSize: '13px' }}>{new Date(a.due_date).toLocaleDateString()}</td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: a.is_past_due ? '#fff7ed' : '#f0fdf4', color: a.is_past_due ? '#c2410c' : '#16a34a' }}>
                            {a.is_past_due ? 'Past Due' : 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <button onClick={() => setEditingHw(a)} style={{ background: 'none', border: 'none', color: 'var(--blue-accent)', cursor: 'pointer', fontSize: '13px', fontWeight: '600', marginRight: '12px' }}>Edit</button>
                          <button onClick={async () => {
                            if (confirm('Delete this assignment?')) {
                              try {
                                await api.delete(`/homework/delete/${a.assignment_id}`)
                                const res = await api.get('/homework/teacher/mine')
                                setAssignments(res)
                              } catch (err) { alert(err.message) }
                            }
                          }} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'Grades' ? (
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>Grade Management</h2>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #eef0f8', boxShadow: 'var(--shadow)' }}>
              <div style={{ maxWidth: '400px', marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Select Assignment to Grade</label>
                <select 
                  value={selectedAssignmentId} 
                  onChange={async (e) => {
                    const aid = e.target.value
                    setSelectedAssignmentId(aid)
                    if (aid) {
                      try {
                        // Find class id for this assignment
                        const assign = assignments.find(a => a.assignment_id == aid)
                        // Use the class_id directly from the assignment object
                        if (assign && assign.class_id) {
                          const details = await api.get(`/users/classes/${assign.class_id}/info`)
                          setGradingStudents(details.students || [])
                          const initial = {}
                          details.students.forEach(s => initial[s.student_id] = { marks: '', feedback: '' })
                          setGradeEntries(initial)
                        }
                      } catch (err) { alert(`Failed to load class students: ${err.message}`) }
                    }
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                >
                  <option value="">-- Choose Assignment --</option>
                  {assignments.map(a => <option key={a.assignment_id} value={a.assignment_id}>{a.title} ({a.class_name})</option>)}
                </select>
              </div>

              {!selectedAssignmentId ? <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Select an assignment to start entering grades.</p> : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid #eef0f8' }}>
                        <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Student Name</th>
                        <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Marks (out of {assignments.find(a => a.assignment_id == selectedAssignmentId)?.max_marks})</th>
                        <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Feedback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradingStudents.map(s => (
                        <tr key={s.student_id} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{s.name}</td>
                          <td style={{ padding: '12px', width: '150px' }}>
                            <input 
                              type="number" 
                              value={gradeEntries[s.student_id]?.marks} 
                              onChange={e => setGradeEntries({...gradeEntries, [s.student_id]: {...gradeEntries[s.student_id], marks: e.target.value}})}
                              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }} 
                            />
                          </td>
                          <td style={{ padding: '12px' }}>
                            <input 
                              value={gradeEntries[s.student_id]?.feedback} 
                              onChange={e => setGradeEntries({...gradeEntries, [s.student_id]: {...gradeEntries[s.student_id], feedback: e.target.value}})}
                              placeholder="Add feedback..."
                              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }} 
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={async () => {
                        try {
                          const payload = {
                            assignment_id: parseInt(selectedAssignmentId),
                            grades: Object.entries(gradeEntries).map(([sid, g]) => ({
                              student_id: parseInt(sid),
                              marks_awarded: parseFloat(g.marks),
                              feedback: g.feedback
                            })).filter(g => !isNaN(g.marks_awarded))
                          }
                          await api.post('/grades/enter', payload)
                          alert('Grades saved! (They are not yet released to students)')
                        } catch (err) { alert(err.message) }
                      }}
                      style={{ padding: '12px 24px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                    >Save Grades</button>
                    <button 
                      onClick={async () => {
                        if (confirm('Are you sure you want to release these grades? Students and parents will be able to see them immediately.')) {
                          try {
                            await api.post(`/grades/release/${selectedAssignmentId}`)
                            alert('Grades released successfully!')
                          } catch (err) { alert(err.message) }
                        }
                      }}
                      style={{ padding: '12px 24px', background: 'white', border: '1.5px solid var(--blue-accent)', color: 'var(--blue-accent)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                    >Release Grades</button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : activeTab === 'Communications' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '32px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', marginBottom: '16px' }}>Inbox</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {!inbox.length ? <div style={{ background: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid #eef0f8' }}>Empty</div> : inbox.map((msg, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #eef0f8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><div style={{ fontWeight: '700' }}>{msg.sender_name} ({msg.sender_role})</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(msg.sent_at).toLocaleDateString()}</div></div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--blue-deep)' }}>{msg.subject}</div>
                    <div style={{ fontSize: '14px', marginTop: '8px' }}>{msg.body}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', marginBottom: '16px' }}>Compose</h2>
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #eef0f8' }}>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.post('/communications/send', messageForm); 
                    alert('Sent!');
                    setMessageForm({ receiver_id: '', subject: '', body: '' }); 
                    setParentSearch('');
                    const res = await api.get('/communications/inbox');
                    setInbox(res);
                  } catch (err) { alert('Error sending message'); }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <input 
                      placeholder="Search recipient (Parent, Student, Staff)..." 
                      value={parentSearch} 
                      onChange={e => {
                        setParentSearch(e.target.value)
                        setShowParentDropdown(true)
                      }} 
                      onFocus={() => setShowParentDropdown(true)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} 
                    />
                    {showParentDropdown && parentSearch.length > 1 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #eef0f8', borderRadius: '8px', boxShadow: 'var(--shadow)', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
                        {[...parentsList, ...studentsList, ...staffList].filter(p => 
                          (p.first_name + ' ' + p.last_name).toLowerCase().includes(parentSearch.toLowerCase()) ||
                          p.email?.toLowerCase().includes(parentSearch.toLowerCase())
                        ).slice(0, 10).map(p => (
                          <div key={p.user_id} 
                               onClick={() => {
                                 setMessageForm({...messageForm, receiver_id: p.user_id})
                                 setParentSearch(`${p.first_name} ${p.last_name} (${p.role || (p.student_number ? 'Student' : 'Parent')})`)
                                 setShowParentDropdown(false)
                               }}
                               style={{ padding: '10px 14px', borderBottom: '1px solid #f5f6fa', cursor: 'pointer', fontSize: '13px' }}>
                            <div style={{ fontWeight: '600' }}>{p.first_name} {p.last_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.role || (p.student_number ? 'Student' : 'Parent')} · {p.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input placeholder="Subject" value={messageForm.subject} onChange={e => setMessageForm({...messageForm, subject: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                  <textarea placeholder="Message..." rows={5} value={messageForm.body} onChange={e => setMessageForm({...messageForm, body: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', resize: 'vertical' }} />
                  <button type="submit" style={{ padding: '10px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Send Message</button>
                </form>
              </div>
            </div>
          </div>
        ) : activeTab === 'Notices' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)', gap: '32px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', marginBottom: '16px' }}>Active Notices</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {notices.map((n, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #eef0f8', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: n.is_pinned ? 'var(--blue-light)' : '#f0f4ff', color: 'var(--blue-deep)' }}>
                        {n.is_pinned ? '📌 Pinned' : n.audience}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '8px' }}>{n.title}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>{n.body}</p>
                    <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
                      Posted by {n.created_by}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', marginBottom: '16px' }}>Post Notice</h2>
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #eef0f8', boxShadow: 'var(--shadow)' }}>
                <form onSubmit={handleCreateNotice} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input placeholder="Notice Title" value={noticeForm.title} onChange={e => setNoticeForm({...noticeForm, title: e.target.value})} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                  <textarea placeholder="Message body..." rows={4} value={noticeForm.body} onChange={e => setNoticeForm({...noticeForm, body: e.target.value})} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', resize: 'vertical' }} />
                  <select value={noticeForm.audience} onChange={e => setNoticeForm({...noticeForm, audience: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                    <option value="ALL">All School</option>
                    <option value="CLASS">My Class Only</option>
                    <option value="TEACHERS">Teachers Only</option>
                  </select>
                  {noticeForm.audience === 'CLASS' && (
                    <select value={noticeForm.target_class_id} onChange={e => setNoticeForm({...noticeForm, target_class_id: e.target.value})} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                      <option value="">-- Select Class --</option>
                      {dashboard?.classes?.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
                    </select>
                  )}
                  <button type="submit" style={{ padding: '12px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Post Notice</button>
                </form>
              </div>
            </div>
          </div>
        ) : activeTab === 'Events' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)', gap: '32px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', marginBottom: '16px' }}>Upcoming Events</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {events.map((e, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #eef0f8', boxShadow: 'var(--shadow)', display: 'flex', gap: '20px' }}>
                    <div style={{ textAlign: 'center', minWidth: '60px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--blue-accent)', fontWeight: '700', textTransform: 'uppercase' }}>{new Date(e.start_datetime).toLocaleDateString('en-GB', { month: 'short' })}</div>
                      <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '28px', fontWeight: '700', color: 'var(--text-dark)' }}>{new Date(e.start_datetime).getDate()}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '4px' }}>{e.title}</h3>
                        <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', background: '#f0f4ff', color: 'var(--blue-deep)' }}>{e.event_type}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>📍 {e.location || 'No location set'}</div>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{e.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', marginBottom: '16px' }}>Create Event</h2>
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #eef0f8', boxShadow: 'var(--shadow)' }}>
                <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input placeholder="Event Title" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                  <textarea placeholder="Description" rows={3} value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', resize: 'vertical' }} />
                  <select value={eventForm.event_type} onChange={e => setEventForm({...eventForm, event_type: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                    {['ACADEMIC', 'SPORT', 'CULTURAL', 'HOLIDAY', 'MEETING', 'OTHER'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input placeholder="Location" value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Start Date/Time</label>
                    <input type="datetime-local" value={eventForm.start_datetime} onChange={e => setEventForm({...eventForm, start_datetime: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                  </div>
                  <select value={eventForm.audience} onChange={e => setEventForm({...eventForm, audience: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                    <option value="ALL">All School</option>
                    <option value="CLASS">My Class Only</option>
                  </select>
                  {eventForm.audience === 'CLASS' && (
                    <select value={eventForm.target_class_id} onChange={e => setEventForm({...eventForm, target_class_id: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                      <option value="">-- Select Class --</option>
                      {dashboard?.classes?.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
                    </select>
                  )}
                  <button type="submit" style={{ padding: '12px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>Create Event</button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'white', borderRadius: '12px',
            boxShadow: 'var(--shadow)', border: '1px solid #eef0f8',
            padding: '60px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '8px' }}>
              {activeTab} Module
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              The detailed {activeTab.toLowerCase()} page is currently under construction.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
