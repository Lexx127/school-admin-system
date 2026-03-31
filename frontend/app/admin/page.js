'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const TABS = {
  OVERVIEW: 'overview',
  STUDENTS: 'students',
  STAFF: 'staff',
  PARENTS: 'parents',
  FEES: 'fees',
  COMMUNICATIONS: 'communications',
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(TABS.OVERVIEW)
  const [inbox, setInbox] = useState([])
  const [messageForm, setMessageForm] = useState({ receiver_id: '', subject: '', body: '' })
  const [recipientSearch, setRecipientSearch] = useState('')
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false)

  const [allFees, setAllFees] = useState([])
  const [studentRecords, setStudentRecords] = useState([])
  const [feeView, setFeeView] = useState('all')

  // Create forms
  const [newFeeForm, setNewFeeForm] = useState({ student_id: '', academic_year: '2026', term: 'Term 1', amount_due: '', due_date: '' })
  const [paymentForm, setPaymentForm] = useState({ fee_id: null, amount_paid: '', payment_method: 'Cash' })
  const [studentForm, setStudentForm] = useState({ first_name: '', last_name: '', email: '', password: '', student_number: '', class_id: '', grade_level: '' })
  const [staffForm, setStaffForm] = useState({ first_name: '', last_name: '', email: '', password: '', job_title: '', role: 'TEACHER' })
  const [parentForm, setParentForm] = useState({ first_name: '', last_name: '', email: '', password: '', whatsapp_number: '' })
  const [linkForm, setLinkForm] = useState({ parent_id: '', student_id: '' })

  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [linkError, setLinkError] = useState('')
  const [linkSuccess, setLinkSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadData() {
      const [userData, usersData, dashData, feesData, studentsData, parentsSubData, inboxData] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get('/users/admin/all'),
        api.get('/users/classes/all'),
        api.get('/fees/all/summary'),
        api.get('/users/students/all'),
        api.get('/users/parents/with-students'),
        api.get('/communications/inbox'),
      ])

      if (userData.status === 'rejected') { router.push('/'); return }
      if (userData.status === 'fulfilled') setUser(userData.value)
      if (usersData.status === 'fulfilled') setAllUsers(usersData.value)
      if (dashData.status === 'fulfilled') {
         setClasses(dashData.value || [])
      }
      if (feesData.status === 'fulfilled') setAllFees(feesData.value)
      if (studentsData.status === 'fulfilled') setStudentRecords(studentsData.value)
      // parentsSubData is for reference if needed, but setParentsList doesn't exist here
      if (inboxData.status === 'fulfilled') setInbox(inboxData.value)

      setLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (tab === TABS.FEES) {
      fetchFees(feeView)
    }
  }, [tab, feeView])

  const fetchFees = async (view) => {
    let endpoint = '/fees/all/summary';
    if (view === 'pending') endpoint = '/fees/pending';
    if (view === 'paid') endpoint = '/fees/paid';
    try {
      const res = await api.get(endpoint);
      setAllFees(res);
      setFeeView(view);
    } catch (err) { console.error(err); }
  }

  async function handleLogout() {
    await api.post('/auth/logout')
    router.push('/')
  }

  async function handleToggleActive(userId) {
    try {
      await api.put(`/users/admin/toggle-active/${userId}`)
      setAllUsers(prev => prev.map(u =>
        u.user_id === userId ? { ...u, is_active: !u.is_active } : u
      ))
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleCreateStudent() {
    setFormError(''); setFormSuccess(''); setSubmitting(true)
    try {
      await api.post('/users/admin/create/student', {
        ...studentForm,
        class_id: parseInt(studentForm.class_id),
      })
      setFormSuccess('Student created successfully')
      setStudentForm({ first_name: '', last_name: '', email: '', password: '', student_number: '', class_id: '', grade_level: '' })
      const usersData = await api.get('/users/admin/all')
      setAllUsers(usersData)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateStaff() {
    setFormError(''); setFormSuccess(''); setSubmitting(true)
    try {
      await api.post('/users/admin/create/staff', staffForm)
      setFormSuccess('Staff member created successfully')
      setStaffForm({ first_name: '', last_name: '', email: '', password: '', job_title: '', role: 'TEACHER' })
      const usersData = await api.get('/users/admin/all')
      setAllUsers(usersData)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateParent() {
    setFormError(''); setFormSuccess(''); setSubmitting(true)
    try {
      await api.post('/users/admin/create/parent', parentForm)
      setFormSuccess('Parent created successfully')
      setParentForm({ first_name: '', last_name: '', email: '', password: '', whatsapp_number: '' })
      const usersData = await api.get('/users/admin/all')
      setAllUsers(usersData)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

 async function handleLinkParent() {
    setLinkError(''); setLinkSuccess(''); setSubmitting(true)
    try {
      await api.post('/users/admin/link/parent-student', {
        parent_id: parseInt(linkForm.parent_id),
        student_id: parseInt(linkForm.student_id),
      })
      setLinkSuccess('Parent linked to student successfully')
      setLinkForm({ parent_id: '', student_id: '' })
    } catch (err) {
      setLinkError(err.message)
    } finally {
      setSubmitting(false)
    }
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
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading admin panel...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const students = allUsers.filter(u => u.role === 'STUDENT')
  const staff = allUsers.filter(u => ['TEACHER', 'PRINCIPAL', 'SUPER_ADMIN'].includes(u.role))
  const parents = allUsers.filter(u => u.role === 'PARENT')

  // Reusable styles
  const inputStyle = {
    width: '100%', padding: '12px 14px',
    border: '1.5px solid #dde4f0', borderRadius: '8px',
    fontFamily: 'var(--font-dm-sans)', fontSize: '14px',
    color: 'var(--text-dark)', outline: 'none', background: 'white',
  }

  const labelStyle = {
    display: 'block', fontSize: '12px', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--text-dark)', marginBottom: '6px',
  }

  const formGroupStyle = { marginBottom: '16px' }

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
          }}>Super Admin</span>
        </div>

        <nav style={{ flex: 1, padding: '16px' }}>
          <div style={{
            fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)',
            padding: '0 12px', marginTop: '8px', marginBottom: '8px',
          }}>Management</div>
          {[
            { name: 'Overview', icon: '⊞', key: TABS.OVERVIEW },
            { name: 'Students', icon: '👨‍🎓', key: TABS.STUDENTS, count: students.length },
            { name: 'Staff', icon: '👨‍🏫', key: TABS.STAFF, count: staff.length },
            { name: 'Parents', icon: '👨‍👩‍👧', key: TABS.PARENTS, count: parents.length },
            { name: 'Fees Management', icon: '💰', key: TABS.FEES },
            { name: 'Communications', icon: '💬', key: TABS.COMMUNICATIONS },
          ].map(item => (
            <div key={item.key}
              onClick={() => { setTab(item.key); setFormError(''); setFormSuccess('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: '8px',
                color: tab === item.key ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                background: tab === item.key ? 'rgba(37,99,235,0.15)' : 'transparent',
                fontSize: '14px', fontWeight: tab === item.key ? '500' : '400',
                cursor: 'pointer', marginBottom: '2px',
              }}>
              <span>{item.icon}</span>
              {item.name}
              {item.count !== undefined && (
                <span style={{
                  marginLeft: 'auto', background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.4)', fontSize: '11px',
                  padding: '2px 7px', borderRadius: '20px',
                }}>{item.count}</span>
              )}
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
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Super Admin</div>
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
          }}>User Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Create and manage students, staff and parents
          </p>
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === TABS.OVERVIEW && (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px', marginBottom: '32px',
            }}>
              {[
                { icon: '👨‍🎓', value: students.length, label: 'Total Students', color: '#2563eb' },
                { icon: '👨‍🏫', value: staff.length, label: 'Total Staff', color: '#16a34a' },
                { icon: '👨‍👩‍👧', value: parents.length, label: 'Total Parents', color: '#9333ea' },
              ].map((s, i) => (
                <div key={i} style={{
                  background: 'white', borderRadius: '12px', padding: '24px',
                  boxShadow: 'var(--shadow)', border: '1px solid #eef0f8',
                  borderTop: `3px solid ${s.color}`,
                }}>
                  <div style={{
                    width: '40px', height: '40px', background: 'var(--blue-light)',
                    borderRadius: '10px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '18px', marginBottom: '16px',
                  }}>{s.icon}</div>
                  <div style={{
                    fontFamily: 'var(--font-playfair)', fontSize: '36px', fontWeight: '700',
                    color: 'var(--text-dark)', lineHeight: '1', marginBottom: '4px',
                  }}>{s.value}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* All users table */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  All Users
                </h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafbfc' }}>
                    {['Name', 'Email', 'Role', 'Status', 'Action'].map(h => (
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
                  {allUsers.map((u, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f5f6fa' }}>
                      <td style={{ padding: '14px 24px', fontSize: '13px', fontWeight: '500', color: 'var(--text-dark)' }}>
                        {u.first_name} {u.last_name}
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                          background: u.role === 'STUDENT' ? '#e8f0fe'
                            : u.role === 'PARENT' ? '#f3e8ff'
                            : u.role === 'SUPER_ADMIN' ? '#fef3c7'
                            : '#e8f8f0',
                          color: u.role === 'STUDENT' ? '#1a73e8'
                            : u.role === 'PARENT' ? '#9333ea'
                            : u.role === 'SUPER_ADMIN' ? '#b45309'
                            : '#16a34a',
                        }}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                          background: u.is_active ? '#e8f8f0' : '#fde8e8',
                          color: u.is_active ? '#16a34a' : '#c0392b',
                        }}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <button
                          onClick={() => handleToggleActive(u.user_id)}
                          style={{
                            padding: '6px 14px',
                            background: u.is_active ? '#fde8e8' : '#e8f8f0',
                            color: u.is_active ? '#c0392b' : '#16a34a',
                            border: 'none', borderRadius: '6px',
                            fontFamily: 'var(--font-dm-sans)',
                            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                          }}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── STUDENTS TAB ── */}
        {tab === TABS.STUDENTS && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

            {/* Create student form */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  Create New Student
                </h3>
              </div>
              <div style={{ padding: '24px' }}>
                {[
                  { label: 'First Name', key: 'first_name', type: 'text', placeholder: 'Takoda' },
                  { label: 'Last Name', key: 'last_name', type: 'text', placeholder: 'Moyo' },
                  { label: 'Email', key: 'email', type: 'email', placeholder: 'takoda@student.agape.ac.zw' },
                  { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
                  { label: 'Student Number', key: 'student_number', type: 'text', placeholder: 'STU009' },
                  { label: 'Grade Level', key: 'grade_level', type: 'text', placeholder: 'Grade 10' },
                ].map(field => (
                  <div key={field.key} style={formGroupStyle}>
                    <label style={labelStyle}>{field.label}</label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={studentForm[field.key]}
                      onChange={e => setStudentForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ))}

                <div style={formGroupStyle}>
                  <label style={labelStyle}>Class</label>
                  <select
                    value={studentForm.class_id}
                    onChange={e => setStudentForm(prev => ({ ...prev, class_id: e.target.value }))}
                    style={inputStyle}>
                    <option value="">Select a class...</option>
                    {classes.map(c => (
                      <option key={c.class_id} value={c.class_id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                {formError && tab === TABS.STUDENTS && (
                  <div style={{
                    padding: '10px 14px', background: '#fde8e8',
                    border: '1px solid #fca5a5', borderRadius: '8px',
                    color: '#c0392b', fontSize: '13px', marginBottom: '16px',
                  }}>{formError}</div>
                )}
                {formSuccess && tab === TABS.STUDENTS && (
                  <div style={{
                    padding: '10px 14px', background: '#e8f8f0',
                    border: '1px solid #86efac', borderRadius: '8px',
                    color: '#16a34a', fontSize: '13px', marginBottom: '16px',
                  }}>{formSuccess}</div>
                )}

                <button
                  onClick={handleCreateStudent}
                  disabled={submitting}
                  style={{
                    width: '100%', padding: '12px',
                    background: submitting ? '#93c5fd' : 'var(--blue-deep)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer',
                  }}>
                  {submitting ? 'Creating...' : 'Create Student'}
                </button>
              </div>
            </div>

            {/* Students list */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  Students ({students.length})
                </h3>
              </div>
              <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                {students.map((s, i) => (
                  <div key={i} style={{
                    padding: '14px 24px', borderBottom: '1px solid #f5f6fa',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                        {s.first_name} {s.last_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {s.email}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                        background: s.is_active ? '#e8f8f0' : '#fde8e8',
                        color: s.is_active ? '#16a34a' : '#c0392b',
                      }}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleToggleActive(s.user_id)}
                        style={{
                          padding: '4px 10px',
                          background: '#f5f7fc', color: 'var(--text-muted)',
                          border: '1px solid #dde4f0', borderRadius: '6px',
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: '11px', cursor: 'pointer',
                        }}>
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STAFF TAB ── */}
        {tab === TABS.STAFF && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  Create New Staff Member
                </h3>
              </div>
              <div style={{ padding: '24px' }}>
                {[
                  { label: 'First Name', key: 'first_name', type: 'text', placeholder: 'James' },
                  { label: 'Last Name', key: 'last_name', type: 'text', placeholder: 'Banda' },
                  { label: 'Email', key: 'email', type: 'email', placeholder: 'j.banda@agape.ac.zw' },
                  { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
                  { label: 'Job Title', key: 'job_title', type: 'text', placeholder: 'Biology Teacher' },
                ].map(field => (
                  <div key={field.key} style={formGroupStyle}>
                    <label style={labelStyle}>{field.label}</label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={staffForm[field.key]}
                      onChange={e => setStaffForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ))}

                <div style={formGroupStyle}>
                  <label style={labelStyle}>Role</label>
                  <select
                    value={staffForm.role}
                    onChange={e => setStaffForm(prev => ({ ...prev, role: e.target.value }))}
                    style={{ ...inputStyle }}>
                    <option value="TEACHER">Teacher</option>
                    <option value="PRINCIPAL">Principal</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                {formError && tab === TABS.STAFF && (
                  <div style={{
                    padding: '10px 14px', background: '#fde8e8',
                    border: '1px solid #fca5a5', borderRadius: '8px',
                    color: '#c0392b', fontSize: '13px', marginBottom: '16px',
                  }}>{formError}</div>
                )}
                {formSuccess && tab === TABS.STAFF && (
                  <div style={{
                    padding: '10px 14px', background: '#e8f8f0',
                    border: '1px solid #86efac', borderRadius: '8px',
                    color: '#16a34a', fontSize: '13px', marginBottom: '16px',
                  }}>{formSuccess}</div>
                )}

                <button
                  onClick={handleCreateStaff}
                  disabled={submitting}
                  style={{
                    width: '100%', padding: '12px',
                    background: submitting ? '#93c5fd' : 'var(--blue-deep)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer',
                  }}>
                  {submitting ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </div>

            {/* Staff list */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  Staff ({staff.length})
                </h3>
              </div>
              <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                {staff.map((s, i) => (
                  <div key={i} style={{
                    padding: '14px 24px', borderBottom: '1px solid #f5f6fa',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                        {s.first_name} {s.last_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {s.email} · {s.role}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                        background: s.is_active ? '#e8f8f0' : '#fde8e8',
                        color: s.is_active ? '#16a34a' : '#c0392b',
                      }}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleToggleActive(s.user_id)}
                        style={{
                          padding: '4px 10px',
                          background: '#f5f7fc', color: 'var(--text-muted)',
                          border: '1px solid #dde4f0', borderRadius: '6px',
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: '11px', cursor: 'pointer',
                        }}>
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PARENTS TAB ── */}
        {tab === TABS.PARENTS && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Create parent */}
              <div style={{
                background: 'white', borderRadius: '12px',
                boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
              }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                    Create New Parent
                  </h3>
                </div>
                <div style={{ padding: '24px' }}>
                  {[
                    { label: 'First Name', key: 'first_name', type: 'text', placeholder: 'Mr. John' },
                    { label: 'Last Name', key: 'last_name', type: 'text', placeholder: 'Moyo' },
                    { label: 'Email', key: 'email', type: 'email', placeholder: 'john.moyo@gmail.com' },
                    { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
                    { label: 'WhatsApp Number', key: 'whatsapp_number', type: 'text', placeholder: '+263771234567' },
                  ].map(field => (
                    <div key={field.key} style={formGroupStyle}>
                      <label style={labelStyle}>{field.label}</label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={parentForm[field.key]}
                        onChange={e => setParentForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                  ))}

                  {linkError && (
                    <div style={{
                       padding: '10px 14px', background: '#fde8e8',
                       border: '1px solid #fca5a5', borderRadius: '8px',
                       color: '#c0392b', fontSize: '13px', marginBottom: '16px',
                    }}>{linkError}</div>
                  )}
                  {linkSuccess && (
                    <div style={{
                       padding: '10px 14px', background: '#e8f8f0',
                       border: '1px solid #86efac', borderRadius: '8px',
                       color: '#16a34a', fontSize: '13px', marginBottom: '16px',
                       }}>{linkSuccess}</div>
                  )}

                  <button
                    onClick={handleCreateParent}
                    disabled={submitting}
                    style={{
                      width: '100%', padding: '12px',
                      background: submitting ? '#93c5fd' : 'var(--blue-deep)',
                      color: 'white', border: 'none', borderRadius: '8px',
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer',
                    }}>
                    {submitting ? 'Creating...' : 'Create Parent'}
                  </button>
                </div>
              </div>

              {/* Link parent to student */}
              <div style={{
                background: 'white', borderRadius: '12px',
                boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
              }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                    Link Parent to Student
                  </h3>
                </div>
                <div style={{ padding: '24px' }}>
                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Parent</label>
                    <select
                      value={linkForm.parent_id}
                      onChange={e => setLinkForm(prev => ({ ...prev, parent_id: e.target.value }))}
                      style={inputStyle}>
                      <option value="">Select a parent...</option>
                      {parents.map(p => (
                        <option key={p.user_id} value={p.user_id}>
                          {p.first_name} {p.last_name} — {p.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Student</label>
                    <select
                      value={linkForm.student_id}
                      onChange={e => setLinkForm(prev => ({ ...prev, student_id: e.target.value }))}
                      style={inputStyle}>
                      <option value="">Select a student...</option>
                      {students.map(s => (
                        <option key={s.user_id} value={s.user_id}>
                          {s.first_name} {s.last_name} — {s.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleLinkParent}
                    disabled={submitting}
                    style={{
                      width: '100%', padding: '12px',
                      background: submitting ? '#93c5fd' : 'var(--blue-deep)',
                      color: 'white', border: 'none', borderRadius: '8px',
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer',
                    }}>
                    {submitting ? 'Linking...' : 'Link Parent to Student'}
                  </button>
                </div>
              </div>
            </div>

            {/* Parents list */}
            <div style={{
              background: 'white', borderRadius: '12px',
              boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef0f8' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  Parents ({parents.length})
                </h3>
              </div>
              <div style={{ maxHeight: '620px', overflowY: 'auto' }}>
                {parents.map((p, i) => (
                  <div key={i} style={{
                    padding: '14px 24px', borderBottom: '1px solid #f5f6fa',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                        {p.first_name} {p.last_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {p.email}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                        background: p.is_active ? '#e8f8f0' : '#fde8e8',
                        color: p.is_active ? '#16a34a' : '#c0392b',
                      }}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleToggleActive(p.user_id)}
                        style={{
                          padding: '4px 10px',
                          background: '#f5f7fc', color: 'var(--text-muted)',
                          border: '1px solid #dde4f0', borderRadius: '6px',
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: '11px', cursor: 'pointer',
                        }}>
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FEES TAB ── */}
        {tab === TABS.FEES && (
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
                    fetchFees(feeView);
                  } catch (err) { alert("Error creating fee"); }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <select required value={newFeeForm.student_id} onChange={e => setNewFeeForm({...newFeeForm, student_id: parseInt(e.target.value)})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    <option value="">-- Select Student --</option>
                    {studentRecords.map(s => <option key={s.student_id} value={s.student_id}>{s.first_name} {s.last_name} ({s.student_number})</option>)}
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
                    fetchFees(feeView);
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
                <button onClick={() => setFeeView('all')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', borderRadius: '6px', border: '1px solid #d1d5db', background: feeView === 'all' ? '#e2e8f0' : 'white', color: 'var(--text-dark)' }}>All Fees</button>
                <button onClick={() => setFeeView('pending')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', borderRadius: '6px', border: '1px solid #d1d5db', background: feeView === 'pending' ? '#fefcbf' : 'white', color: feeView === 'pending' ? '#b45309' : 'var(--text-dark)' }}>Pending / Partial</button>
                <button onClick={() => setFeeView('paid')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', borderRadius: '6px', border: '1px solid #d1d5db', background: feeView === 'paid' ? '#dcfce7' : 'white', color: feeView === 'paid' ? '#16a34a' : 'var(--text-dark)' }}>Fully Paid</button>
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
        )}

        {tab === TABS.COMMUNICATIONS && (
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
                          setRecipientSearch(msg.sender_name)
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
                    setRecipientSearch('')
                    const res = await api.get('/communications/inbox')
                    setInbox(res)
                  } catch (err) { alert('Error sending message') }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-dark)', marginBottom: '8px' }}>Recipient (Staff, Parent, or Student)</label>
                    <input 
                      type="text" 
                      placeholder="Search name..."
                      value={recipientSearch}
                      onChange={(e) => {
                        setRecipientSearch(e.target.value)
                        setMessageForm({...messageForm, receiver_id: ''})
                        setShowRecipientDropdown(true)
                      }}
                      onFocus={() => setShowRecipientDropdown(true)}
                      required={!messageForm.receiver_id}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                    />
                    {showRecipientDropdown && recipientSearch.length > 1 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #eef0f8', borderRadius: '8px', boxShadow: 'var(--shadow)', maxHeight: '300px', overflowY: 'auto', zIndex: 10 }}>
                        {allUsers.filter(u => (`${u.first_name} ${u.last_name}`).toLowerCase().includes(recipientSearch.toLowerCase())).map(u => (
                          <div key={u.user_id} onClick={() => { setMessageForm({...messageForm, receiver_id: u.user_id}); setRecipientSearch(`${u.first_name} ${u.last_name} (${u.role})`); setShowRecipientDropdown(false) }} style={{ padding: '10px 14px', borderBottom: '1px solid #f5f6fa', cursor: 'pointer', fontSize: '13px' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{u.first_name} {u.last_name} ({u.role})</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
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
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-dark)', marginBottom: '8px' }}>Message Body</label>
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
        )}
      </div>
    </div>
  )
}
