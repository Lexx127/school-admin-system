import re
import os

state_injection = """
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
"""

modal_jsx = """
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
"""

def update_page(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "showPasswordModal" in content:
        return

    # state injection
    state_pattern = r"(const\s+\[user,\s*setUser\]\s*=\s*useState\(null\))"
    content = re.sub(state_pattern, r"\1" + "\n" + state_injection, content, 1)

    # modal injection
    main_div = r"(<div style={{(?:\s|\\n)*display:\s*'flex',\s*minHeight:\s*'100vh',\s*background:\s*'var\(--off-white\)'(?:\s|\\n)*}}>)"
    content = re.sub(main_div, r"\1" + "\n" + modal_jsx, content, 1)

    # Add `position: 'relative'` to the parent container of the profile dropdown
    content = re.sub(r"(padding:\s*'16px 24px',\s*borderTop:\s*'1px solid rgba\(255,255,255,0\.08\)',\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'12px',)", r"\1 position: 'relative',", content, 1)

    # profile dropdown injection
    profile_pattern = r"(<div style={{\s*padding:\s*'16px 24px',\s*borderTop:\s*'1px solid rgba\(255,255,255,0\.08\)',\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'12px',\s*position:\s*'relative',\s*}}>)"
    
    dropdown_replacement = r"""\1
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
          <div onClick={() => setShowProfileDropdown(!showProfileDropdown)} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, cursor: 'pointer' }}>"""
          
    content = re.sub(profile_pattern, dropdown_replacement, content, 1)
    
    # Close the div before logout button
    logout_pattern = r"(<button\s*onClick={handleLogout})"
    content = re.sub(logout_pattern, r"</div>\n          \1", content, 1)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

pages = [
    "c:/Users/lexxa/school-admin-system/frontend/app/admin/page.js",
    "c:/Users/lexxa/school-admin-system/frontend/app/principal/page.js",
    "c:/Users/lexxa/school-admin-system/frontend/app/teacher/page.js",
    "c:/Users/lexxa/school-admin-system/frontend/app/student/page.js",
    "c:/Users/lexxa/school-admin-system/frontend/app/parent/page.js"
]

for page in pages:
    if os.path.exists(page):
        update_page(page)
        print(f"Updated {page}")
