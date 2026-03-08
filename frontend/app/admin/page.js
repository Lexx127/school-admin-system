'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const TABS = {
  OVERVIEW: 'overview',
  STUDENTS: 'students',
  STAFF: 'staff',
  PARENTS: 'parents',
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(TABS.OVERVIEW)

  // Create forms
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
      const [userData, usersData, dashData] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get('/users/admin/all'),
        api.get('/users/classes/all'),
      ])

      if (userData.status === 'rejected') { router.push('/'); return }
      if (userData.status === 'fulfilled') setUser(userData.value)
      if (usersData.status === 'fulfilled') setAllUsers(usersData.value)
      if (dashData.status === 'fulfilled') {
         setClasses(dashData.value || [])
      }
    

      setLoading(false)
    }
    loadData()
  }, [])

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
      </div>
    </div>
  )
}
