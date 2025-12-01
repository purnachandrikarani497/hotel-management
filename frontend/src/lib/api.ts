// apiClient.ts

const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>;
const primaryBase = env?.VITE_API_URL || env?.VITE_API_BASE || '';
const originBase = (typeof window !== 'undefined' && window?.location?.origin) ? window.location.origin : '';
const fallbacks: string[] = [
  primaryBase || '',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  originBase || '',
  'http://localhost:8080',
  'http://localhost:5001'
];

export async function apiGet<T>(path: string): Promise<T> {
  for (const base of fallbacks) {
    try {
      const res = await fetch(`${base}${path}`);
      if (res.ok) {
        return res.json() as Promise<T>;
      }
      let msg = ''
      try {
        const j = await res.json().catch(() => null) as unknown as { error?: string; message?: string } | null
        msg = (j?.error || j?.message || res.statusText || '').trim()
      } catch (_) { /* ignore */ }
      if (msg) return Promise.reject(new Error(msg))
    } catch (err) {
      // swallow and try next fallback
    }
  }
  throw new Error(`GET ${path} failed`);
}

export async function apiPost<T, B extends object>(path: string, body: B): Promise<T> {
  for (const base of fallbacks) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        return res.json() as Promise<T>;
      }
      let msg = ''
      try {
        const j = await res.json().catch(() => null) as unknown as { error?: string; message?: string } | null
        msg = (j?.error || j?.message || res.statusText || '').trim()
      } catch (_) { /* ignore */ }
      if (msg) return Promise.reject(new Error(msg))
    } catch (err) {
      // swallow and try next fallback
    }
  }
  throw new Error(`POST ${path} failed`);
}

export async function apiDelete<T = { status: string }>(path: string): Promise<T> {
  for (const base of fallbacks) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        return res.json() as Promise<T>;
      }
      try {
        const j = await res.json().catch(() => null) as unknown as { error?: string; message?: string } | null
        const msg = (j?.error || j?.message || res.statusText || '').trim()
        if (msg) throw new Error(msg)
      } catch (_) { void 0 }
    } catch (err) {
      // swallow and try next fallback
    }
  }
  throw new Error(`DELETE ${path} failed`);
}
