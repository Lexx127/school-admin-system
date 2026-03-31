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
  const [users, setUsers] = useState([])
  const [allFees, setAllFees] = useState([])
  const [students, setStudents] = useState([])
  const [messageForm, setMessageForm] = useState({ receiver_id: '', subject: '', body: '' })
  const [newFeeForm, setNewFeeForm] = useState({ student_id: '', academic_year: '2026', term: 'Term 1', amount_due: '', due_date: '' })
  const [paymentForm, setPaymentForm] = useState({ fee_id: null, amount_paid: '', payment_method: 'Cash' })
  const [feeView, setFeeView] = useState('all')
  const [inbox, setInbox] = useState([])
  const [noticeForm, setNoticeForm] = useState({ title: '', body: '', audience: 'ALL' })
  const [eventForm, setEventForm] = useState({ title: '', description: '', event_type: 'ACADEMIC', location: '', start_datetime: '', end_datetime: '', audience: 'ALL' })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Dashboard')
  
  const [selectedClassId, setSelectedClassId] = useState('')
  const [classDetails, setClassDetails] = useState(null)
  const [classLoading, setClassLoading] = useState(false)
  
  const [parentsList, setParentsList] = useState([])
  const [parentSearch, setParentSearch] = useState('')
  const [showParentDropdown, setShowParentDropdown] = useState(false)
  const [staffSearch, setStaffSearch] = useState('')

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  // Aggregates for staff
  const staffUsers = users.filter(u => ['TEACHER', 'PRINCIPAL'].includes(u.role))

  useEffect(() => {
    async function loadData() {
      const [userData, dashData, clockinData, gradeData, noticeData, eventData, usersData, feesData, studentsData, parentsData, inboxData] =
        await Promise.allSettled([
          api.get('/auth/me'),
          api.get('/users/principal/dashboard'),
          api.get('/attendance/staff/all'),
          api.get('/grades/principal/summary'),
          api.get('/notices/mine'),
          api.get('/notices/events/upcoming'),
          api.get('/users/admin/all'),
          api.get('/fees/all/summary'),
          api.get('/users/students/all'),
          api.get('/users/parents/with-students'),
          api.get('/communications/inbox'),
        ])

      if (userData.status === 'rejected') { router.push('/'); return }

      if (userData.status === 'fulfilled') setUser(userData.value)
      if (dashData.status === 'fulfilled') setDashboard(dashData.value)
      if (clockinData.status === 'fulfilled') setClockIns(clockinData.value.records || [])
      if (gradeData.status === 'fulfilled') setGradeSummary(gradeData.value.class_subject_summaries || [])
      if (noticeData.status === 'fulfilled') setNotices(noticeData.value)
      if (eventData.status === 'fulfilled') setEvents(eventData.value)
      if (usersData.status === 'fulfilled') setUsers(usersData.value)
      if (feesData.status === 'fulfilled') setAllFees(feesData.value)
      if (studentsData.status === 'fulfilled') setStudents(studentsData.value)
      if (parentsData.status === 'fulfilled') setParentsList(parentsData.value)
      if (inboxData.status === 'fulfilled') setInbox(inboxData.value)

      setLoading(false)
    }
    loadData()
  }, [router])

  const fetchFees = async (view) => {
    let endpoint = '/fees/all/summary';
    if (view === 'pending') endpoint = '/fees/pending';
    if (view === 'paid') endpoint = '/fees/paid';
    try {
      const res = await api.get(endpoint);
      setAllFees(res);
      setFeeView(view);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLogout() {
    await api.post('/auth/logout')
    router.push('/')
  }

  const handleCreateNotice = async (e) => {
    e.preventDefault()
    try {
      await api.post('/notices/create', noticeForm)
      setNoticeForm({ title: '', body: '', audience: 'ALL' })
      const res = await api.get('/notices/mine')
      setNotices(res)
      alert("Notice created successfully")
    } catch (err) { alert(err.message) }
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    try {
      await api.post('/notices/events/create', eventForm)
      setEventForm({ title: '', description: '', event_type: 'ACADEMIC', location: '', start_datetime: '', end_datetime: '', audience: 'ALL' })
      const res = await api.get('/notices/events/upcoming')
      setEvents(res)
      alert("Event created successfully")
    } catch (err) { alert(err.message) }
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
              { name: 'Dashboard', icon: '⊞' },
            ]},
            { label: 'Administration', items: [
              { name: 'Staff Management', icon: '👥' },
              { name: 'Staff Attendance', icon: '✓', badge: lateCount || null },
              { name: 'All Classes', icon: '🏫' },
              { name: 'Fees Management', icon: '💰' },
              { name: 'Notices & Events', icon: '🔔' },
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

      <div style={{ marginLeft: '260px', flex: 1, padding: '40px 48px' }}>
        {activeTab === 'Dashboard' ? (
          <div>
            {/* Header, Stats, Content Grid as before but balanced */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '36px' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '30px', color: 'var(--text-dark)', marginBottom: '4px' }}>School Overview</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{today}</p>
              </div>
              <button style={{ padding: '10px 20px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-dm-sans)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ Post Notice</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
              {[
                { icon: '👨‍🎓', value: dashboard?.total_students || '—', label: 'Total Students', sub: `${dashboard?.total_classes || 0} classes`, subColor: 'var(--blue-accent)' },
                { icon: '👨‍🏫', value: dashboard?.total_staff || '—', label: 'Total Staff', sub: 'Teachers & admin', subColor: 'var(--blue-accent)' },
                { icon: '⚠️', value: lateCount, label: 'Late Arrivals Today', sub: lateCount > 0 ? 'Flagged for review' : 'All on time', subColor: lateCount > 0 ? '#c0392b' : '#16a34a' },
                { icon: '✅', value: onTimeCount, label: 'On Time Today', sub: `${todayClockIns.length} staff clocked in`, subColor: '#16a34a' },
              ].map((stat, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', borderTop: `3px solid ${i === 2 && lateCount > 0 ? '#c0392b' : 'var(--blue-accent)'}` }}>
                  <div style={{ width: '40px', height: '40px', background: 'var(--blue-light)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '16px' }}>{stat.icon}</div>
                  <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '32px', fontWeight: '700', color: 'var(--text-dark)', lineHeight: '1', marginBottom: '4px' }}>{stat.value}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{stat.label}</div>
                  <div style={{ fontSize: '12px', color: stat.subColor, marginTop: '8px' }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>Staff Clock-In — Today</h3>
                    {lateCount > 0 && <span style={{ padding: '4px 12px', background: '#fde8e8', color: '#c0392b', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{lateCount} late</span>}
                  </div>
                  {todayClockIns.length === 0 ? <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>No records yet</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody style={{ fontSize: '13px' }}>
                        {todayClockIns.map((c, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f5f6fa' }}>
                            <td style={{ padding: '14px 24px', fontWeight: '500' }}>{c.staff_name}</td>
                            <td style={{ padding: '14px 24px', color: 'var(--text-muted)' }}>{c.clock_in_time ? new Date(c.clock_in_time).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : '—'}</td>
                            <td style={{ padding: '14px 24px' }}><span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: c.flagged ? '#fde8e8' : '#e8f8f0', color: c.flagged ? '#c0392b' : '#1a8a4a' }}>{c.flagged ? 'Late' : 'On Time'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}><h3 style={{ fontSize: '15px', fontWeight: '600' }}>Class Performance</h3></div>
                  {gradeSummary.filter(g => g.class_average !== null).map((g, i) => (
                    <div key={i} style={{ padding: '16px 24px', borderBottom: '1px solid #f5f6fa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>{g.class_name} · {g.subject_name}</div>
                        <span style={{ fontWeight: '600', color: g.class_average >= 75 ? '#16a34a' : '#c0392b' }}>{Math.round(g.class_average)}%</span>
                      </div>
                      <div style={{ background: '#eef0f8', borderRadius: '4px', height: '6px' }}><div style={{ height: '6px', borderRadius: '4px', width: `${g.class_average}%`, background: 'var(--blue-accent)' }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}><h3 style={{ fontSize: '15px', fontWeight: '600' }}>Recent Notices</h3></div>
                  {notices.slice(0, 3).map((n, i) => (
                    <div key={i} style={{ padding: '14px 24px', borderBottom: '1px solid #f5f6fa' }}>
                       <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{n.title}</div>
                       <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{n.audience} · {new Date(n.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'All Classes' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px' }}>All Classes</h2>
              <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                <option value="">-- Select Class --</option>
                {dashboard?.classes?.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
              </select>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eef0f8', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#fafbfc' }}>{['Class', 'Grade', 'Students', 'Teacher'].map(h => <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                <tbody>{dashboard?.classes?.map(c => (<tr key={c.class_id} style={{ borderBottom: '1px solid #f5f6fa' }}><td style={{ padding: '14px 24px', fontSize: '14px' }}>{c.class_name}</td><td style={{ padding: '14px 24px' }}>{c.grade_level}</td><td style={{ padding: '14px 24px' }}>{c.student_count}</td><td style={{ padding: '14px 24px' }}>{c.homeroom_teacher || '—'}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'Fees Management' ? (
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>Fees Management</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* Create Fee Form */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '16px' }}>Create New Fee Charge</h3>
                <form onSubmit={async(e) => {
                  e.preventDefault();
                  try {
                    await api.post('/fees/', newFeeForm);
                    alert("Fee charge created!");
                    setNewFeeForm({ student_id: '', academic_year: '2026', term: 'Term 1', amount_due: '', due_date: '' });
                    const res = await api.get('/fees/all/summary');
                    setAllFees(res);
                  } catch (err) { alert("Error creating fee"); }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <select required value={newFeeForm.student_id} onChange={e => setNewFeeForm({...newFeeForm, student_id: parseInt(e.target.value)})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    <option value="">-- Select Student --</option>
                    {students.map(s => <option key={s.student_id} value={s.student_id}>{s.first_name} {s.last_name} ({s.student_number})</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input required type="text" placeholder="Year (e.g. 2026)" value={newFeeForm.academic_year} onChange={e => setNewFeeForm({...newFeeForm, academic_year: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                    <input required type="text" placeholder="Term (e.g. Term 1)" value={newFeeForm.term} onChange={e => setNewFeeForm({...newFeeForm, term: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input required type="number" placeholder="Amount Due ($)" value={newFeeForm.amount_due} onChange={e => setNewFeeForm({...newFeeForm, amount_due: parseFloat(e.target.value)})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                    <input required type="date" value={newFeeForm.due_date} onChange={e => setNewFeeForm({...newFeeForm, due_date: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                  </div>
                  <button type="submit" style={{ padding: '10px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Charge Fee</button>
                </form>
              </div>

              {/* Record Payment Form */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '16px' }}>Record Payment</h3>
                <form onSubmit={async(e) => {
                  e.preventDefault();
                  if (!paymentForm.fee_id) return alert("Please select a fee from the table below first.");
                  try {
                    await api.post(`/fees/${paymentForm.fee_id}/pay`, { amount_paid: parseFloat(paymentForm.amount_paid), payment_method: paymentForm.payment_method });
                    alert("Payment recorded! Parent has been notified directly via system message.");
                    setPaymentForm({ fee_id: null, amount_paid: '', payment_method: 'Cash' });
                    const res = await api.get('/fees/all/summary');
                    setAllFees(res);
                  } catch (err) { alert("Error recording payment"); }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '8px', background: '#f5f6fa', borderRadius: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Selected Fee ID: {paymentForm.fee_id || 'None'}
                  </div>
                  <input required type="number" placeholder="Amount Paid ($)" value={paymentForm.amount_paid} onChange={e => setPaymentForm({...paymentForm, amount_paid: parseFloat(e.target.value)})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                  <select required value={paymentForm.payment_method} onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                  </select>
                  <button type="submit" disabled={!paymentForm.fee_id} style={{ padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: paymentForm.fee_id ? 'pointer' : 'not-allowed', opacity: paymentForm.fee_id ? 1 : 0.5, fontWeight: '600' }}>Submit Payment & Notify Parent</button>
                </form>
              </div>
            </div>

            {/* Fees Table */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-dark)' }}>School Ledger</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => fetchFees('all')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', borderRadius: '6px', border: '1px solid #d1d5db', background: feeView === 'all' ? '#e2e8f0' : 'white', color: 'var(--text-dark)' }}>All Fees</button>
                <button onClick={() => fetchFees('pending')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', borderRadius: '6px', border: '1px solid #d1d5db', background: feeView === 'pending' ? '#fefcbf' : 'white', color: feeView === 'pending' ? '#b45309' : 'var(--text-dark)' }}>Pending / Partial</button>
                <button onClick={() => fetchFees('paid')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', borderRadius: '6px', border: '1px solid #d1d5db', background: feeView === 'paid' ? '#dcfce7' : 'white', color: feeView === 'paid' ? '#16a34a' : 'var(--text-dark)' }}>Fully Paid</button>
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: '1px solid #eef0f8', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>ID</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Student</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Term</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Amount</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allFees.map(f => (
                    <tr key={f.fee_id} style={{ borderBottom: '1px solid #f5f6fa' }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600' }}>#{f.fee_id}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>{f.student_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>{f.academic_year} {f.term}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600' }}>${f.amount_paid}/${f.amount_due}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                         <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: f.payment_status === 'PAID' ? '#dcfce7' : f.payment_status === 'PARTIAL' ? '#e0f2fe' : '#fefcbf', color: f.payment_status === 'PAID' ? '#16a34a' : f.payment_status === 'PARTIAL' ? '#0369a1' : '#b45309' }}>
                          {f.payment_status === 'PAID' ? 'Paid' : f.payment_status === 'PARTIAL' ? 'Partially Paid' : 'Pending'}
                         </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                        {f.payment_status !== 'PAID' && (
                          <button onClick={() => setPaymentForm({...paymentForm, fee_id: f.fee_id})} style={{ padding: '6px 14px', background: 'var(--blue-light)', color: 'var(--blue-deep)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            Collect
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {allFees.length === 0 && (
                    <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No fee records found in this view.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        ) : activeTab === 'Communications' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '32px' }}>
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
                        <div style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{msg.sender_name || 'System'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(msg.sent_at).toLocaleString('en-GB')}</div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--blue-deep)', marginBottom: '8px' }}>{msg.subject}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-dark)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{msg.body}</div>
                      <button 
                        onClick={() => {
                          setMessageForm({ receiver_id: msg.sender_id, subject: `Re: ${msg.subject}`, body: `\n\n--- Original Message ---\n${msg.body}` })
                          setParentSearch(msg.sender_name)
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
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>Compose Message</h2>
              <div style={{ background: 'white', borderRadius: '12px', padding: '32px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '24px' }}>Send Communication</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  try {
                    await api.post('/communications/send', messageForm)
                    alert('Message sent successfully!')
                    setMessageForm({ receiver_id: '', subject: '', body: '' })
                    setParentSearch('')
                  } catch (err) {
                    alert('Error sending message')
                  }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-dark)', marginBottom: '8px' }}>Select Parent or Search Student Name</label>
                  <input 
                    type="text" 
                    placeholder="Type name of parent or student..."
                    value={parentSearch}
                    onChange={(e) => {
                      setParentSearch(e.target.value)
                      setMessageForm({...messageForm, receiver_id: ''})
                      setShowParentDropdown(true)
                    }}
                    onFocus={() => setShowParentDropdown(true)}
                    required={!messageForm.receiver_id}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  />
                  {showParentDropdown && parentSearch.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #eef0f8', borderRadius: '8px', boxShadow: 'var(--shadow)', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
                      {parentsList.filter(p => 
                        (p.first_name + ' ' + p.last_name).toLowerCase().includes(parentSearch.toLowerCase()) || 
                        p.children_names.some(c => c.toLowerCase().includes(parentSearch.toLowerCase()))
                      ).map(p => (
                        <div key={p.user_id} 
                             onClick={() => {
                               setMessageForm({...messageForm, receiver_id: p.user_id})
                               setParentSearch(p.first_name + ' ' + p.last_name + ' (' + p.email + ')')
                               setShowParentDropdown(false)
                             }}
                             style={{ padding: '10px 14px', borderBottom: '1px solid #f5f6fa', cursor: 'pointer', fontSize: '13px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{p.first_name} {p.last_name} ({p.email})</div>
                          {p.children_names.length > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Parent of: {p.children_names.join(', ')}</div>
                          )}
                        </div>
                      ))}
                      {parentsList.filter(p => 
                        (p.first_name + ' ' + p.last_name).toLowerCase().includes(parentSearch.toLowerCase()) || 
                        p.children_names.some(c => c.toLowerCase().includes(parentSearch.toLowerCase()))
                      ).length === 0 && (
                        <div style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-muted)' }}>No matches found...</div>
                      )}
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-dark)', marginBottom: '8px' }}>Message Body</label>
                  <textarea 
                    value={messageForm.body}
                    onChange={(e) => setMessageForm({...messageForm, body: e.target.value})}
                    required
                    rows={5}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical' }}
                  />
                </div>
                <button type="submit" style={{ padding: '12px 24px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '8px' }}>
                  Send Message
                </button>
              </form>
            </div>
          </div>
          </div>
        ) : activeTab === 'Staff Management' ? (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '4px' }}>Staff Management</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Manage access for Teachers and Principal staff. Access can be toggled to restrict or grant login permissions.</p>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: '1px solid #eef0f8', textAlign: 'left' }}>
                    {['Staff Name', 'Email', 'Role', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {staffUsers.map((u, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f5f6fa' }}>
                      <td style={{ padding: '14px 24px', fontSize: '14px', color: 'var(--text-dark)', fontWeight: '500' }}>{u.first_name} {u.last_name}</td>
                      <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>{u.role}</td>
                      <td style={{ padding: '14px 24px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: u.is_active ? '#16a34a18' : '#c0392b18', color: u.is_active ? '#16a34a' : '#c0392b' }}>
                          {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <button 
                          onClick={async () => {
                            const targetId = u.user_id || u.id
                            if (!targetId) return
                            try {
                              await api.put(`/users/admin/toggle-active/${targetId}`)
                              setUsers(prev => prev.map(old => {
                                const oldId = old.user_id || old.id
                                return oldId === targetId ? {...old, is_active: !old.is_active} : old
                              }))
                            } catch (e) { alert(e.message) }
                          }}
                          style={{ background: 'none', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                        >
                          Toggle Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'Fees Management' ? (
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>Fees Management</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Create New Fee Charge</h3>
                <form onSubmit={async(e) => {
                  e.preventDefault();
                  try {
                    await api.post('/fees/', newFeeForm);
                    setNewFeeForm({ student_id: '', academic_year: '2026', term: 'Term 1', amount_due: '', due_date: '' });
                    const res = await api.get('/fees/all/summary'); setAllFees(res);
                    alert("Fee charge created!");
                  } catch (err) { alert("Error creating fee"); }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <select required value={newFeeForm.student_id} onChange={e => setNewFeeForm({...newFeeForm, student_id: parseInt(e.target.value)})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    <option value="">-- Select Student --</option>
                    {students.map(s => <option key={s.student_id} value={s.student_id}>{s.first_name} {s.last_name} ({s.student_number})</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input required type="text" placeholder="Year" value={newFeeForm.academic_year} onChange={e => setNewFeeForm({...newFeeForm, academic_year: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                    <input required type="text" placeholder="Term" value={newFeeForm.term} onChange={e => setNewFeeForm({...newFeeForm, term: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input required type="number" placeholder="Amount ($)" value={newFeeForm.amount_due} onChange={e => setNewFeeForm({...newFeeForm, amount_due: parseFloat(e.target.value)})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                    <input required type="date" value={newFeeForm.due_date} onChange={e => setNewFeeForm({...newFeeForm, due_date: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                  </div>
                  <button type="submit" style={{ padding: '10px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600' }}>Charge Fee</button>
                </form>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Record Payment</h3>
                <form onSubmit={async(e) => {
                  e.preventDefault();
                  if (!paymentForm.fee_id) return alert("Select a fee from the table below.");
                  try {
                    await api.post(`/fees/${paymentForm.fee_id}/pay`, { amount_paid: parseFloat(paymentForm.amount_paid), payment_method: paymentForm.payment_method });
                    setPaymentForm({ fee_id: null, amount_paid: '', payment_method: 'Cash' });
                    const res = await api.get('/fees/all/summary'); setAllFees(res);
                    alert("Payment recorded!");
                  } catch (err) { alert("Error recording payment"); }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '8px', background: '#f5f6fa', borderRadius: '6px', fontSize: '13px' }}>Selected Fee ID: {paymentForm.fee_id || 'None'}</div>
                  <input required type="number" placeholder="Amount Paid ($)" value={paymentForm.amount_paid} onChange={e => setPaymentForm({...paymentForm, amount_paid: parseFloat(e.target.value)})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                  <select required value={paymentForm.payment_method} onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    <option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="Card">Card</option>
                  </select>
                  <button type="submit" disabled={!paymentForm.fee_id} style={{ padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', opacity: paymentForm.fee_id ? 1 : 0.5 }}>Submit Payment</button>
                </form>
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eef0f8', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#fafbfc' }}>{['ID', 'Student', 'Term', 'Amount', 'Status', 'Action'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                <tbody>{allFees.map(f => (
                  <tr key={f.fee_id} style={{ borderBottom: '1px solid #f5f6fa' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>#{f.fee_id}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{f.student_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{f.academic_year} {f.term}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600' }}>${f.amount_paid}/${f.amount_due}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: f.payment_status === 'PAID' ? '#dcfce7' : '#fefcbf', color: f.payment_status === 'PAID' ? '#16a34a' : '#b45309' }}>{f.payment_status}</span></td>
                    <td style={{ padding: '12px 16px' }}><button onClick={() => setPaymentForm({...paymentForm, fee_id: f.fee_id})} style={{ padding: '6px 12px', background: 'var(--blue-light)', border: 'none', borderRadius: '4px', cursor:'pointer' }}>Collect</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'Communications' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '32px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', marginBottom: '16px' }}>Inbox</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {!inbox.length ? <div style={{ background: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid #eef0f8' }}>Empty</div> : inbox.map((msg, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #eef0f8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><div style={{ fontWeight: '700' }}>{msg.sender_name}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(msg.sent_at).toLocaleDateString()}</div></div>
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
                    await api.post('/communications/send', messageForm); alert('Sent!');
                    setMessageForm({ receiver_id: '', subject: '', body: '' }); setParentSearch('');
                  } catch (err) { alert('Error'); }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input placeholder="Recipient..." value={parentSearch} onChange={e => setParentSearch(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                  <input placeholder="Subject" value={messageForm.subject} onChange={e => setMessageForm({...messageForm, subject: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                  <textarea placeholder="Message..." rows={5} value={messageForm.body} onChange={e => setMessageForm({...messageForm, body: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', resize: 'vertical' }} />
                  <button type="submit" style={{ padding: '10px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600' }}>Send</button>
                </form>
              </div>
            </div>
          </div>
        ) : activeTab === 'Staff Management' ? (
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', marginBottom: '16px' }}>Staff Management</h2>
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eef0f8', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#fafbfc' }}>{['Name', 'Email', 'Role', 'Status', 'Action'].map(h => <th key={h} style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                <tbody>{staffUsers.map((u, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f5f6fa' }}>
                    <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: '500' }}>{u.first_name} {u.last_name}</td>
                    <td style={{ padding: '14px 24px', fontSize: '13px' }}>{u.email}</td>
                    <td style={{ padding: '14px 24px', fontSize: '13px' }}>{u.role}</td>
                    <td style={{ padding: '14px 24px' }}><span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: u.is_active ? '#e8f8f0' : '#fde8e8', color: u.is_active ? '#16a34a' : '#c0392b' }}>{u.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                    <td style={{ padding: '14px 24px' }}>
                      <button onClick={async () => {
                        const tid = u.user_id || u.id;
                        try { await api.put(`/users/admin/toggle-active/${tid}`); setUsers(prev => prev.map(old => (old.user_id || old.id) === tid ? {...old, is_active: !old.is_active} : old)); } catch (e) { alert(e.message); }
                      }} style={{ padding: '6px 12px', background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Toggle</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'Staff Attendance' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '4px' }}>Staff Attendance</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Monitor staff clock-in/out records across all dates.</p>
              </div>
              <div style={{ position: 'relative', width: '300px' }}>
                <input 
                  type="text" 
                  placeholder="Search staff name..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
              </div>
            </div>

            {/* Attendance Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
               <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', borderLeft: '4px solid #16a34a' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Present Today</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-dark)' }}>{onTimeCount + lateCount}</div>
               </div>
               <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', borderLeft: '4px solid #c0392b' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Late Today</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#c0392b' }}>{lateCount}</div>
               </div>
               <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', borderLeft: '4px solid var(--blue-accent)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Staff</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-dark)' }}>{staffUsers.length}</div>
               </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {(() => {
                const filtered = clockins.filter(c => c.staff_name.toLowerCase().includes(staffSearch.toLowerCase()))
                const grouped = filtered.reduce((acc, c) => {
                  if (!acc[c.date]) acc[c.date] = []
                  acc[c.date].push(c)
                  return acc
                }, {})
                const dates = Object.keys(grouped).sort((a,b) => new Date(b) - new Date(a))

                if (dates.length === 0) return <div style={{ padding: '60px', textAlign: 'center', background: 'white', borderRadius: '12px', color: 'var(--text-muted)', border: '1px solid #eef0f8' }}>No records found matching your search.</div>

                return dates.map(date => (
                  <div key={date}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      <div style={{ flex: 1, height: '1px', background: '#eef0f8' }} />
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                      {grouped[date].map((c, i) => (
                        <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px 24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <div style={{ width: '40px', height: '40px', background: 'var(--blue-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: 'var(--blue-deep)' }}>
                            {c.staff_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>{c.staff_name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{clockins.find(o => o.staff_id === c.staff_id)?.role || 'Staff Member'}</div>
                          </div>
                          <div style={{ textAlign: 'center', width: '100px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Clock In</div>
                            <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-dark)' }}>{c.clock_in_time || '—'}</div>
                          </div>
                          <div style={{ textAlign: 'center', width: '100px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Clock Out</div>
                            <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-dark)' }}>{c.clock_out_time || '—'}</div>
                          </div>
                          <div style={{ width: '100px', textAlign: 'right' }}>
                            <span style={{ 
                                padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', 
                                background: c.flagged ? '#fde8e8' : '#e8f8f0', 
                                color: c.flagged ? '#c0392b' : '#1a8a4a' 
                            }}>
                              {c.flagged ? 'LATE' : 'ON TIME'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        ) : activeTab === 'Notices & Events' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
               {/* POST NOTICE */}
               <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #eef0f8', boxShadow: 'var(--shadow)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--text-dark)' }}>Post New Notice</h3>
                  <form onSubmit={handleCreateNotice} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input 
                      placeholder="Notice Title" 
                      value={noticeForm.title} 
                      onChange={e => setNoticeForm({...noticeForm, title: e.target.value})}
                      required
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    />
                    <textarea 
                      placeholder="Message body..." 
                      rows={4} 
                      value={noticeForm.body} 
                      onChange={e => setNoticeForm({...noticeForm, body: e.target.value})}
                      required
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', resize: 'vertical' }}
                    />
                    <select 
                      value={noticeForm.audience} 
                      onChange={e => setNoticeForm({...noticeForm, audience: e.target.value})}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    >
                      {['ALL', 'STUDENTS', 'PARENTS', 'TEACHERS'].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <button type="submit" style={{ padding: '12px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                      Post Notice
                    </button>
                  </form>
               </div>

               {/* CREATE EVENT */}
               <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #eef0f8', boxShadow: 'var(--shadow)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--text-dark)' }}>Create New Event</h3>
                  <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input 
                      placeholder="Event Title" 
                      value={eventForm.title} 
                      onChange={e => setEventForm({...eventForm, title: e.target.value})}
                      required
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <select 
                        value={eventForm.event_type} 
                        onChange={e => setEventForm({...eventForm, event_type: e.target.value})}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                      >
                        {['ACADEMIC', 'SPORT', 'CULTURAL', 'HOLIDAY', 'MEETING', 'OTHER'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select 
                        value={eventForm.audience} 
                        onChange={e => setEventForm({...eventForm, audience: e.target.value})}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                      >
                        {['ALL', 'STUDENTS', 'PARENTS', 'TEACHERS'].map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <input 
                      placeholder="Location" 
                      value={eventForm.location} 
                      onChange={e => setEventForm({...eventForm, location: e.target.value})}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Start Date/Time</label>
                        <input 
                          type="datetime-local" 
                          value={eventForm.start_datetime} 
                          onChange={e => setEventForm({...eventForm, start_datetime: e.target.value})}
                          required
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>End Date/Time (Optional)</label>
                        <input 
                          type="datetime-local" 
                          value={eventForm.end_datetime} 
                          onChange={e => setEventForm({...eventForm, end_datetime: e.target.value})}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        />
                      </div>
                    </div>
                    <button type="submit" style={{ padding: '12px', background: 'var(--blue-deep)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '4px' }}>
                      Create Event
                    </button>
                  </form>
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
               <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Recent Notices</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {notices.slice(0, 5).map((n, i) => (
                      <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #eef0f8' }}>
                         <div style={{ fontSize: '14px', fontWeight: '600' }}>{n.title}</div>
                         <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{n.audience} · {new Date(n.created_at).toLocaleDateString('en-GB')}</div>
                      </div>
                    ))}
                  </div>
               </div>
               <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Upcoming Events</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {events.slice(0, 5).map((e, i) => (
                      <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #eef0f8' }}>
                         <div style={{ fontSize: '14px', fontWeight: '600' }}>{e.title}</div>
                         <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{e.location} · {new Date(e.start_datetime).toLocaleDateString('en-GB')}</div>
                      </div>
                    ))}
                  </div>
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
