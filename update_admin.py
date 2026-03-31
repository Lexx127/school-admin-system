import os

file_path = "c:/Users/lexxa/school-admin-system/frontend/app/admin/page.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add TABS.CLASSES
content = content.replace("COMMUNICATIONS: 'communications',", "COMMUNICATIONS: 'communications',\n  CLASSES: 'classes',")

# 2. Add State variables
state_vars = """  const [parentForm, setParentForm] = useState({ first_name: '', last_name: '', email: '', password: '', whatsapp_number: '' })
  const [linkForm, setLinkForm] = useState({ parent_id: '', student_id: '' })
  const [allSubjects, setAllSubjects] = useState([])
  const [classAssignments, setClassAssignments] = useState([])"""
content = content.replace("  const [parentForm, setParentForm] = useState({ first_name: '', last_name: '', email: '', password: '', whatsapp_number: '' })\n  const [linkForm, setLinkForm] = useState({ parent_id: '', student_id: '' })", state_vars)

# 3. Add to loadData
load_data_find = "const [userData, usersData, dashData, feesData, studentsData, parentsSubData, inboxData] = await Promise.allSettled([\n        api.get('/auth/me'),\n        api.get('/users/admin/all'),\n        api.get('/users/classes/all'),\n        api.get('/fees/all/summary'),\n        api.get('/users/students/all'),\n        api.get('/users/parents/with-students'),\n        api.get('/communications/inbox'),\n      ])"
load_data_replace = """const [userData, usersData, dashData, feesData, studentsData, parentsSubData, inboxData, subjectsData, assignmentsData] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get('/users/admin/all'),
        api.get('/users/classes/all'),
        api.get('/fees/all/summary'),
        api.get('/users/students/all'),
        api.get('/users/parents/with-students'),
        api.get('/communications/inbox'),
        api.get('/classes/all-subjects'),
        api.get('/classes/all-assignments'),
      ])"""
content = content.replace(load_data_find, load_data_replace)

fulfilled_find = "if (inboxData.status === 'fulfilled') setInbox(inboxData.value)"
fulfilled_replace = """if (inboxData.status === 'fulfilled') setInbox(inboxData.value)
      if (subjectsData?.status === 'fulfilled') setAllSubjects(subjectsData.value)
      if (assignmentsData?.status === 'fulfilled') setClassAssignments(assignmentsData.value)"""
content = content.replace(fulfilled_find, fulfilled_replace)

# 4. Add to sidebar
sidebar_find = "{ name: 'Communications', icon: '💬', key: TABS.COMMUNICATIONS },"
sidebar_replace = """{ name: 'Communications', icon: '💬', key: TABS.COMMUNICATIONS },
            { name: 'Class Assignments', icon: '🏫', key: TABS.CLASSES },"""
content = content.replace(sidebar_find, sidebar_replace)

# 5. Add UI section
ui_find = "      </div>\n    </div>\n  )\n}"
ui_replace = """
        {tab === TABS.CLASSES && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '24px', color: 'var(--text-dark)', marginBottom: '16px' }}>Class-Subject Matrix</h2>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', border: '1px solid #eef0f8', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: '1px solid #eef0f8' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)' }}>Class</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: 'var(--blue-deep)' }}>Homeroom</th>
                    {allSubjects.map(sub => (
                      <th key={sub.id} style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)' }}>{sub.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classes.map(c => (
                    <tr key={c.class_id} style={{ borderBottom: '1px solid #f5f6fa' }}>
                      <td style={{ padding: '12px', fontWeight: '600', fontSize: '13px', color: 'var(--text-dark)' }}>{c.class_name}</td>
                      <td style={{ padding: '8px', background: '#e0f2fe' }}>
                        <select 
                          value={c.homeroom_teacher_id || ''}
                          onChange={async (e) => {
                            const teacherUserId = parseInt(e.target.value);
                            try {
                              await api.put(`/classes/${c.class_id}/homeroom`, { teacher_id: teacherUserId });
                              const res = await api.get('/users/classes/all');
                              setClasses(res);
                            } catch (err) { alert('Failed to assign homeroom teacher'); }
                          }}
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #bae6fd', fontSize: '12px', background: 'white' }}
                        >
                          <option value="">-- Unassigned --</option>
                          {staff.map(t => (
                            <option key={t.user_id} value={t.user_id}>{t.first_name} {t.last_name}</option>
                          ))}
                        </select>
                      </td>
                      {allSubjects.map(sub => {
                        const assignment = classAssignments.find(a => a.class_id === c.class_id && a.subject_id === sub.id);
                        return (
                          <td key={sub.id} style={{ padding: '8px' }}>
                            <select 
                              value={assignment ? assignment.teacher_id : ''}
                              onChange={async (e) => {
                                const teacherUserId = parseInt(e.target.value);
                                try {
                                  await api.post(`/classes/${c.class_id}/subjects`, { subject_id: sub.id, teacher_id: teacherUserId });
                                  const res = await api.get('/classes/all-assignments');
                                  setClassAssignments(res);
                                } catch (err) { alert('Failed to assign teacher'); }
                              }}
                              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px' }}
                            >
                              <option value="">-- Unassigned --</option>
                              {staff.map(t => (
                                <option key={t.user_id} value={t.user_id}>{t.first_name} {t.last_name}</option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div style={{ marginTop: '24px', borderTop: '1px solid #eef0f8', paddingTop: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '16px' }}>Bulk Assign Subjects via CSV</h3>
                <input type="file" accept=".csv" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('file', file);
                  try {
                    const tokenMatch = document.cookie.match(/(?:^|; )access_token=([^;]*)/);
                    const token = tokenMatch ? tokenMatch[1] : '';
                    const res = await fetch('http://localhost:8000/classes/bulk-assign-subjects', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` },
                      body: formData,
                    });
                    if (!res.ok) throw new Error('Upload failed');
                    alert('Bulk assignment successful!');
                    const assignRes = await api.get('/classes/all-assignments');
                    setClassAssignments(assignRes);
                  } catch (err) { alert('Failed to process CSV file'); }
                  finally { e.target.value = null; }
                }} style={{ padding: '8px', border: '1px dashed #d1d5db', borderRadius: '6px', width: '100%' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
"""
content = content.replace("      </div>\n    </div>\n  )\n}", ui_replace)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated page.js")
