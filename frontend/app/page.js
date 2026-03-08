'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/auth/login', { email, password })
      const role = data.role

      if (role === 'TEACHER') router.push('/teacher')
      else if (role === 'STUDENT') router.push('/student')
      else if (role === 'PARENT') router.push('/parent')
      else if (role === 'PRINCIPAL') router.push('/principal')
      else if (role === 'SUPER_ADMIN') router.push('/admin')
      else setError('Unknown role. Please contact the school administrator.')
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>

      {/* LEFT PANEL */}
      <div style={{
        background: 'var(--blue-deep)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '80px 72px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Background glow */}
        <div style={{
          position: 'absolute',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
          top: '-100px', right: '-200px',
          pointerEvents: 'none',
        }} />

        {/* Crest placeholder */}
        <div style={{
          width: '72px', height: '72px',
          background: 'var(--white)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '32px',
          fontFamily: 'var(--font-playfair)',
          fontSize: '24px',
          color: 'var(--blue-deep)',
          fontWeight: '700',
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
        }}>
          AC
        </div>

        <h1 style={{
          fontFamily: 'var(--font-playfair)',
          fontSize: '42px',
          fontWeight: '700',
          color: 'var(--white)',
          lineHeight: '1.15',
          marginBottom: '16px',
          position: 'relative',
          zIndex: 1,
        }}>
          Welcome to<br />
          <span style={{ color: '#93c5fd' }}>Agape College</span>
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: '15px',
          lineHeight: '1.7',
          maxWidth: '340px',
          position: 'relative',
          zIndex: 1,
          marginBottom: '56px',
        }}>
          Empowering Students, Staff & Families
        </p>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: '40px',
          position: 'relative',
          zIndex: 1,
        }}>
          {[
            { value: '480', label: 'Students' },
            { value: '36', label: 'Staff' },
            { value: '18', label: 'Classes' },
          ].map((stat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
              {i > 0 && <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.12)', marginRight: '-20px' }} />}
              <div>
                <div style={{
                  fontFamily: 'var(--font-playfair)',
                  fontSize: '28px',
                  color: '#93c5fd',
                  fontWeight: '600',
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: '2px',
                }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 72px',
        background: 'var(--off-white)',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          <h2 style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '28px',
            color: 'var(--text-dark)',
            marginBottom: '8px',
          }}>
            Sign in to your account
          </h2>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '14px',
            marginBottom: '40px',
          }}>
            Enter your school credentials to continue
          </p>

          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-dark)',
              marginBottom: '8px',
            }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@agapecollege.ac.zw"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1.5px solid #dde4f0',
                borderRadius: '8px',
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '14px',
                color: 'var(--text-dark)',
                background: 'white',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--blue-accent)'}
              onBlur={e => e.target.style.borderColor = '#dde4f0'}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-dark)',
              marginBottom: '8px',
            }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1.5px solid #dde4f0',
                borderRadius: '8px',
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '14px',
                color: 'var(--text-dark)',
                background: 'white',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--blue-accent)'}
              onBlur={e => e.target.style.borderColor = '#dde4f0'}
            />
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#fde8e8',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              color: '#c0392b',
              fontSize: '13px',
              marginBottom: '16px',
              marginTop: '12px',
            }}>
              {error}
            </div>
          )}

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              background: loading ? '#93c5fd' : 'var(--blue-deep)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>

          {/* Role hint */}
          <div style={{
            marginTop: '32px',
            padding: '16px',
            background: 'var(--blue-light)',
            borderRadius: '8px',
            borderLeft: '3px solid var(--blue-accent)',
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-dark)', lineHeight: '1.6' }}>
              Your dashboard is tailored to your role.{' '}
              <strong style={{ color: 'var(--blue-accent)' }}>Teachers</strong>,{' '}
              <strong style={{ color: 'var(--blue-accent)' }}>students</strong>,{' '}
              <strong style={{ color: 'var(--blue-accent)' }}>parents</strong> and{' '}
              <strong style={{ color: 'var(--blue-accent)' }}>administrators</strong>{' '}
              each see a personalised view after signing in.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}