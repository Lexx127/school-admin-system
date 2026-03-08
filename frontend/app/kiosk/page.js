'use client'

import { useState, useEffect } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const SCREENS = {
  ACCESS: 'access',
  CLOCKIN: 'clockin',
  CONFIRM: 'confirm',
}

export default function KioskPage() {
  const [screen, setScreen] = useState(SCREENS.ACCESS)
  const [accessCode, setAccessCode] = useState('')
  const [accessError, setAccessError] = useState('')
  const [verifiedCode, setVerifiedCode] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [action, setAction] = useState('in')
  const [submitting, setSubmitting] = useState(false)
  const [clockError, setClockError] = useState('')

  const [confirmation, setConfirmation] = useState(null)
  const [countdown, setCountdown] = useState(5)
  const [currentTime, setCurrentTime] = useState('')

  // Live clock
  useEffect(() => {
    function updateTime() {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Countdown after confirmation
  useEffect(() => {
    if (screen !== SCREENS.CONFIRM) return
    setCountdown(5)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          resetToClockIn()
          return 5
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [screen])

  function resetToClockIn() {
    setEmail('')
    setPassword('')
    setAction('in')
    setClockError('')
    setConfirmation(null)
    setScreen(SCREENS.CLOCKIN)
  }

  function handleAccessSubmit() {
    if (!accessCode.trim()) {
      setAccessError('Please enter the access code')
      return
    }
    // We verify the code on the backend when the first clock action is made.
    // Store it and proceed to clock-in screen.
    setVerifiedCode(accessCode)
    setAccessCode('')
    setAccessError('')
    setScreen(SCREENS.CLOCKIN)
  }

  async function handleClockAction() {
    if (!email.trim() || !password.trim()) {
      setClockError('Please enter your email and password')
      return
    }
    setSubmitting(true)
    setClockError('')

    try {
      const res = await fetch(`${API_BASE}/attendance/staff/kiosk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          action,
          kiosk_code: verifiedCode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // If the kiosk code was rejected, send back to access screen
        if (res.status === 403 && data.detail === 'Invalid kiosk access code') {
          setVerifiedCode('')
          setScreen(SCREENS.ACCESS)
          setAccessError('Access code was incorrect. Please re-enter.')
          return
        }
        setClockError(data.detail || 'Something went wrong')
        return
      }

      setConfirmation(data)
      setScreen(SCREENS.CONFIRM)
    } catch (err) {
      setClockError('Could not connect to the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      if (screen === SCREENS.ACCESS) handleAccessSubmit()
      else if (screen === SCREENS.CLOCKIN) handleClockAction()
    }
  }

  const todayDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--blue-deep)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background glow */}
      <div style={{
        position: 'absolute', width: '800px', height: '800px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)',
        top: '-200px', right: '-200px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)',
        bottom: '-200px', left: '-200px', pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '64px', height: '64px', background: 'white',
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontFamily: 'var(--font-playfair)',
          fontSize: '24px', fontWeight: '700', color: 'var(--blue-deep)',
          margin: '0 auto 20px',
        }}>AC</div>
        <div style={{
          fontFamily: 'var(--font-playfair)',
          fontSize: '28px', fontWeight: '700', color: 'white',
          marginBottom: '8px',
        }}>Agape College</div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
          Staff Clock-In Kiosk
        </div>
        <div style={{
          marginTop: '16px',
          fontFamily: 'var(--font-playfair)',
          fontSize: '42px', fontWeight: '700',
          color: '#93c5fd', letterSpacing: '0.04em',
          lineHeight: '1',
        }}>
          {currentTime}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
          {todayDate}
        </div>
      </div>

      {/* ── ACCESS CODE SCREEN ── */}
      {screen === SCREENS.ACCESS && (
        <div style={{
          background: 'white', borderRadius: '16px',
          padding: '40px', width: '100%', maxWidth: '420px',
          position: 'relative', zIndex: 1,
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-playfair)', fontSize: '22px',
            color: 'var(--text-dark)', marginBottom: '8px',
          }}>Kiosk Access</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>
            Enter the administrator access code to unlock this kiosk.
          </p>

          <label style={{
            display: 'block', fontSize: '12px', fontWeight: '600',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--text-dark)', marginBottom: '8px',
          }}>Access Code</label>
          <input
            type="password"
            placeholder="••••"
            value={accessCode}
            onChange={e => setAccessCode(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100%', padding: '14px 16px',
              border: `1.5px solid ${accessError ? '#fca5a5' : '#dde4f0'}`,
              borderRadius: '8px', fontFamily: 'var(--font-dm-sans)',
              fontSize: '20px', letterSpacing: '0.3em',
              color: 'var(--text-dark)', outline: 'none',
              textAlign: 'center', marginBottom: '12px',
            }}
          />

          {accessError && (
            <div style={{
              padding: '10px 14px', background: '#fde8e8',
              border: '1px solid #fca5a5', borderRadius: '8px',
              color: '#c0392b', fontSize: '13px', marginBottom: '16px',
            }}>{accessError}</div>
          )}

          <button
            onClick={handleAccessSubmit}
            style={{
              width: '100%', padding: '14px',
              background: 'var(--blue-deep)', color: 'white',
              border: 'none', borderRadius: '8px',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            }}>
            Unlock Kiosk →
          </button>
        </div>
      )}

      {/* ── CLOCK IN/OUT SCREEN ── */}
      {screen === SCREENS.CLOCKIN && (
        <div style={{
          background: 'white', borderRadius: '16px',
          padding: '40px', width: '100%', maxWidth: '420px',
          position: 'relative', zIndex: 1,
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-playfair)', fontSize: '22px',
            color: 'var(--text-dark)', marginBottom: '8px',
          }}>Staff Clock-In</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>
            Enter your credentials and select clock in or out.
          </p>

          {/* Action toggle */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '8px', marginBottom: '24px',
          }}>
            {['in', 'out'].map(a => (
              <button
                key={a}
                onClick={() => setAction(a)}
                style={{
                  padding: '12px',
                  background: action === a ? 'var(--blue-deep)' : '#f5f7fc',
                  color: action === a ? 'white' : 'var(--text-muted)',
                  border: `2px solid ${action === a ? 'var(--blue-deep)' : '#dde4f0'}`,
                  borderRadius: '8px',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                {a === 'in' ? '🟢 Clock In' : '🔴 Clock Out'}
              </button>
            ))}
          </div>

          <label style={{
            display: 'block', fontSize: '12px', fontWeight: '600',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--text-dark)', marginBottom: '8px',
          }}>Email Address</label>
          <input
            type="email"
            placeholder="you@agapecollege.ac.zw"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%', padding: '14px 16px',
              border: '1.5px solid #dde4f0', borderRadius: '8px',
              fontFamily: 'var(--font-dm-sans)', fontSize: '14px',
              color: 'var(--text-dark)', outline: 'none', marginBottom: '16px',
            }}
          />

          <label style={{
            display: 'block', fontSize: '12px', fontWeight: '600',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--text-dark)', marginBottom: '8px',
          }}>Password</label>
          <input
            type="password"
            placeholder="••••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%', padding: '14px 16px',
              border: '1.5px solid #dde4f0', borderRadius: '8px',
              fontFamily: 'var(--font-dm-sans)', fontSize: '14px',
              color: 'var(--text-dark)', outline: 'none', marginBottom: '12px',
            }}
          />

          {clockError && (
            <div style={{
              padding: '10px 14px', background: '#fde8e8',
              border: '1px solid #fca5a5', borderRadius: '8px',
              color: '#c0392b', fontSize: '13px', marginBottom: '16px',
            }}>{clockError}</div>
          )}

          <button
            onClick={handleClockAction}
            disabled={submitting}
            style={{
              width: '100%', padding: '14px',
              background: submitting ? '#93c5fd' : action === 'in' ? 'var(--blue-deep)' : '#c0392b',
              color: 'white', border: 'none', borderRadius: '8px',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '15px', fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}>
            {submitting ? 'Processing...' : action === 'in' ? 'Clock In →' : 'Clock Out →'}
          </button>

          <button
            onClick={() => { setVerifiedCode(''); setScreen(SCREENS.ACCESS) }}
            style={{
              width: '100%', padding: '10px', marginTop: '10px',
              background: 'none', color: 'var(--text-muted)',
              border: 'none', borderRadius: '8px',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '12px', cursor: 'pointer',
            }}>
            Lock Kiosk
          </button>
        </div>
      )}

      {/* ── CONFIRMATION SCREEN ── */}
      {screen === SCREENS.CONFIRM && confirmation && (
        <div style={{
          background: 'white', borderRadius: '16px',
          padding: '48px 40px', width: '100%', maxWidth: '420px',
          position: 'relative', zIndex: 1,
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: confirmation.action === 'in'
              ? '#e8f8f0' : '#fde8e8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', margin: '0 auto 24px',
          }}>
            {confirmation.flagged ? '⚠️' : confirmation.action === 'in' ? '✅' : '👋'}
          </div>

          <h2 style={{
            fontFamily: 'var(--font-playfair)', fontSize: '24px',
            color: 'var(--text-dark)', marginBottom: '8px',
          }}>
            {confirmation.staff_name}
          </h2>

          <div style={{
            fontFamily: 'var(--font-playfair)', fontSize: '48px',
            fontWeight: '700', color: 'var(--blue-deep)',
            lineHeight: '1', marginBottom: '8px',
          }}>
            {confirmation.time}
          </div>

          <div style={{
            fontSize: '15px', fontWeight: '500',
            color: confirmation.flagged ? '#c0392b' : '#16a34a',
            marginBottom: '8px',
          }}>
            {confirmation.message}
          </div>

          {confirmation.flagged && (
            <div style={{
              padding: '10px 16px', background: '#fde8e8',
              border: '1px solid #fca5a5', borderRadius: '8px',
              color: '#c0392b', fontSize: '13px', marginBottom: '16px',
            }}>
              This arrival has been flagged and will appear in the principal's report.
            </div>
          )}

          <div style={{
            fontSize: '13px', color: 'var(--text-muted)', marginTop: '24px',
          }}>
            Returning to clock-in screen in{' '}
            <strong style={{ color: 'var(--blue-deep)' }}>{countdown}</strong> seconds...
          </div>

          <button
            onClick={resetToClockIn}
            style={{
              marginTop: '16px', padding: '10px 24px',
              background: 'var(--blue-light)', color: 'var(--blue-deep)',
              border: 'none', borderRadius: '8px',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            }}>
            Done — Next Person
          </button>
        </div>
      )}
    </div>
  )
}