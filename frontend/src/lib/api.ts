// apiClient.ts

const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>;
const primaryBase = env?.VITE_API_URL || env?.VITE_API_BASE || '';
const fallbacks: string[] = [primaryBase || '', 'http://localhost:3015'];

export async function apiGet<T>(path: string): Promise<T> {
  for (const base of fallbacks) {
    try {
      const res = await fetch(`${base}${path}`);
      if (res.ok) {
        return res.json() as Promise<T>;
      }
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
    } catch (err) {
      // swallow and try next fallback
    }
  }
  throw new Error(`DELETE ${path} failed`);
}
