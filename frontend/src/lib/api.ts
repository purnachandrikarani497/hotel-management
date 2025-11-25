const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || {}
const primaryBase = env?.VITE_API_URL || env?.VITE_API_BASE || 'http://localhost:5000'
const fallbacks = [primaryBase, 'http://localhost:5001']

export async function apiGet<T>(path: string): Promise<T> {
  for (const b of fallbacks) {
    try {
      const res = await fetch(`${b}${path}`)
      if (res.ok) return res.json()
    } catch {}
  }
  throw new Error(`GET ${path} failed`)
}

export async function apiPost<T, B extends object>(path: string, body: B): Promise<T> {
  for (const b of fallbacks) {
    try {
      const res = await fetch(`${b}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) return res.json()
    } catch {}
  }
  throw new Error(`POST ${path} failed`)
}

export async function apiDelete<T = { status: string }>(path: string): Promise<T> {
  for (const b of fallbacks) {
    try {
      const res = await fetch(`${b}${path}`, { method: 'DELETE' })
      if (res.ok) return res.json()
    } catch {}
  }
  throw new Error(`DELETE ${path} failed`)
}
