// apiClient.ts

const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {};
const mode = String(metaEnv?.MODE || '');
const isProd = mode === 'production';
const explicitBaseRaw = String(metaEnv?.VITE_API_URL || metaEnv?.VITE_API_BASE || metaEnv?.FRONTEND_BASE_URL || '').trim();
const shouldIgnoreExplicitInProd = isProd && /^https?:\/\/localhost(?::\d+)?\/?$/i.test(explicitBaseRaw);
const explicitBase = shouldIgnoreExplicitInProd ? '' : explicitBaseRaw;
const originBase = (typeof window !== 'undefined' && window?.location?.origin) ? window.location.origin : '';
const devDefault = 'http://localhost:3011';
const base = explicitBase || (isProd ? originBase : devDefault);
try { console.info('[API] base:', base || '(same-origin)') } catch (_e) { void 0 }

export async function apiGet<T>(path: string): Promise<T> {
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url);
  if (!res.ok) {
    let msg = ''
    let isBlocked = false;
    try {
      const j = await res.json().catch(() => null) as unknown as { error?: string; message?: string; blocked?: boolean } | null
      msg = (j?.error || j?.message || res.statusText || '').trim()
      isBlocked = !!j?.blocked || msg.toLowerCase().includes('blocked');
    } catch (_) { /* ignore */ }
    
    if (res.status === 403 && isBlocked) {
      try {
        localStorage.removeItem("auth");
        window.location.href = "/signin?error=blocked";
      } catch { /* ignore */ }
    }
    
    throw new Error(msg || `GET ${path} ${res.status}`)
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T, B extends object>(path: string, body: B): Promise<T> {
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = ''
    let isBlocked = false;
    try {
      const j = await res.json().catch(() => null) as unknown as { error?: string; message?: string; blocked?: boolean } | null
      msg = (j?.error || j?.message || res.statusText || '').trim()
      isBlocked = !!j?.blocked || msg.toLowerCase().includes('blocked');
    } catch (_) { /* ignore */ }

    if (res.status === 403 && isBlocked) {
      try {
        localStorage.removeItem("auth");
        window.location.href = "/signin?error=blocked";
      } catch { /* ignore */ }
    }

    throw new Error(msg || `POST ${path} ${res.status}`)
  }
  return res.json() as Promise<T>;
}

export async function apiDelete<T = { status: string }>(path: string): Promise<T> {
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    let msg = ''
    let isBlocked = false;
    try {
      const j = await res.json().catch(() => null) as unknown as { error?: string; message?: string; blocked?: boolean } | null
      msg = (j?.error || j?.message || res.statusText || '').trim()
      isBlocked = !!j?.blocked || msg.toLowerCase().includes('blocked');
    } catch (_) { /* ignore */ }

    if (res.status === 403 && isBlocked) {
      try {
        localStorage.removeItem("auth");
        window.location.href = "/signin?error=blocked";
      } catch { /* ignore */ }
    }

    throw new Error(msg || `DELETE ${path} ${res.status}`)
  }
  return res.json() as Promise<T>;
}
