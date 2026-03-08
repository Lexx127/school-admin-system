const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'An error occurred' }))
    const detail = error.detail
    const message = Array.isArray(detail)
      ? detail.map(e => `${e.loc?.slice(-1)[0]}: ${e.msg}`).join(', ')
      : typeof detail === 'string'
      ? detail
      : 'An error occurred'
    throw new Error(message)
  }

  return res.json()
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
}