/*
 * Adapter lokal pengganti Supabase (auth + storage + tabel profiles).
 * Meniru subset API supabase-js yang dipakai aplikasi sehingga import
 * `import { supabase } from "@/lib/supabase"` tetap berfungsi.
 * Backend: Express lokal (server/), auth JWT + bcrypt, file di /uploads.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const TOKEN_KEY = "elektromart_token";
const USER_KEY = "elektromart_user";

export type ShimError = { message: string } | null;

function hasStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function getToken(): string | null {
  if (!hasStorage()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function setSession(user: unknown, token: string) {
  if (!hasStorage()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user ?? null));
}

function getUserCached(): Record<string, unknown> | null {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearSession() {
  if (!hasStorage()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

type AuthListener = (event: string) => void;
const listeners = new Set<AuthListener>();

function emit(event: string) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      /* abaikan */
    }
  });
}

async function request(path: string, options: RequestInit = {}): Promise<{ ok: boolean; status: number; payload: any }> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, payload };
}

function errorOf(payload: any, fallback: string): { message: string } {
  return { message: payload?.error || payload?.message || fallback };
}

/* ------------------------------- auth ------------------------------- */

const auth = {
  async getSession(): Promise<{ data: { session: any | null }; error: ShimError }> {
    const token = getToken();
    if (!token) return { data: { session: null }, error: null };
    const user = getUserCached();
    return { data: { session: { access_token: token, user } }, error: null };
  },

  async getUser(): Promise<{ data: { user: any | null }; error: ShimError }> {
    const token = getToken();
    if (!token) return { data: { user: null }, error: null };
    try {
      const { ok, payload } = await request("/api/auth/user");
      if (!ok) {
        clearSession();
        return { data: { user: null }, error: errorOf(payload, "Sesi tidak valid.") };
      }
      setSession(payload.user, token);
      return { data: { user: payload.user }, error: null };
    } catch {
      const cached = getUserCached();
      return { data: { user: cached }, error: null };
    }
  },

  async signInWithPassword({ email, phone, password }: { email?: string; phone?: string; password: string }) {
    try {
      const { ok, payload } = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, phone, password }),
      });
      if (!ok) return { data: { user: null, session: null }, error: errorOf(payload, "Login gagal.") };
      setSession(payload.user, payload.session.access_token);
      emit("SIGNED_IN");
      return { data: { user: payload.user, session: payload.session }, error: null };
    } catch {
      return { data: { user: null, session: null }, error: { message: "Backend tidak dapat dihubungi." } };
    }
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
    try {
      const { ok, payload } = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, data: options?.data ?? {} }),
      });
      if (!ok) return { data: { user: null, session: null }, error: errorOf(payload, "Registrasi gagal.") };
      setSession(payload.user, payload.session.access_token);
      emit("SIGNED_IN");
      return { data: { user: payload.user, session: payload.session }, error: null };
    } catch {
      return { data: { user: null, session: null }, error: { message: "Backend tidak dapat dihubungi." } };
    }
  },

  async signOut() {
    clearSession();
    emit("SIGNED_OUT");
    return { error: null as ShimError };
  },

  async updateUser({ email, password }: { email?: string; password?: string }) {
    try {
      const { ok, payload } = await request("/api/auth/update", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!ok) return { data: { user: null }, error: errorOf(payload, "Gagal memperbarui akun.") };
      const token = getToken();
      if (token) setSession(payload.user, token);
      emit("USER_UPDATED");
      return { data: { user: payload.user }, error: null };
    } catch {
      return { data: { user: null }, error: { message: "Backend tidak dapat dihubungi." } };
    }
  },

  async resetPasswordForEmail(email: string, _options?: { redirectTo?: string }) {
    try {
      const { ok, payload } = await request("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (!ok) return { data: {}, error: errorOf(payload, "Email tidak terdaftar.") };
      return { data: {}, error: null as ShimError };
    } catch {
      return { data: {}, error: { message: "Backend tidak dapat dihubungi." } };
    }
  },

  async resetPassword({ email, password }: { email: string; password: string }) {
    try {
      const { ok, payload } = await request("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!ok) return { data: {}, error: errorOf(payload, "Gagal mengganti password.") };
      return { data: {}, error: null as ShimError };
    } catch {
      return { data: {}, error: { message: "Backend tidak dapat dihubungi." } };
    }
  },

  onAuthStateChange(callback: AuthListener) {
    listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe() {
            listeners.delete(callback);
          },
        },
      },
    };
  },
};

/* ------------------------------ storage ----------------------------- */

const storage = {
  from(bucket: string) {
    return {
      async upload(path: string, file: File, _options?: { upsert?: boolean; contentType?: string; cacheControl?: string }) {
        try {
          const form = new FormData();
          form.append("bucket", bucket);
          form.append("path", path);
          form.append("file", file, file.name);
          const { ok, payload } = await request("/api/upload", { method: "POST", body: form });
          if (!ok) return { data: null, error: errorOf(payload, "Upload gagal.") };
          return { data: { path: payload.path, publicUrl: payload.url }, error: null as ShimError };
        } catch {
          return { data: null, error: { message: "Upload gagal: backend tidak dapat dihubungi." } };
        }
      },
      getPublicUrl(path: string) {
        return { data: { publicUrl: `${API_BASE}/uploads/${bucket}/${path}` } };
      },
    };
  },
};

/* --------------------------- from("profiles") ----------------------- */

type Filter = Record<string, string>;

class ProfileQuery {
  private action: "select" | "insert" | "update" | "upsert" = "select";
  private payload: Record<string, unknown> | null = null;
  private filters: Filter = {};

  select(_columns?: string) {
    this.action = "select";
    return this;
  }

  eq(column: string, value: string) {
    this.filters[column] = value;
    return this;
  }

  insert(values: Record<string, unknown>) {
    this.action = "insert";
    this.payload = values;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.action = "update";
    this.payload = values;
    return this;
  }

  upsert(values: Record<string, unknown>) {
    this.action = "upsert";
    this.payload = values;
    return this;
  }

  maybeSingle() {
    return this;
  }

  single() {
    return this;
  }

  then<TResult1 = { data: any; error: ShimError }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: ShimError }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }

  private async exec(): Promise<{ data: any; error: ShimError }> {
    try {
      if (this.action === "select") {
        const id = this.filters.id;
        const path = id ? `/api/profiles?id=${encodeURIComponent(id)}` : "/api/profiles";
        const { ok, payload } = await request(path);
        if (!ok) return { data: null, error: errorOf(payload, "Gagal memuat profil.") };
        return { data: payload.data ?? null, error: null };
      }
      if (this.action === "update") {
        const id = this.filters.id || (this.payload?.id as string | undefined);
        const { ok, payload } = await request(`/api/profiles?id=${encodeURIComponent(String(id))}`, {
          method: "PATCH",
          body: JSON.stringify(this.payload),
        });
        if (!ok) return { data: null, error: errorOf(payload, "Gagal memperbarui profil.") };
        return { data: payload.data ?? null, error: null };
      }
      const { ok, payload } = await request("/api/profiles", {
        method: "POST",
        body: JSON.stringify(this.payload),
      });
      if (!ok) return { data: null, error: errorOf(payload, "Gagal menyimpan profil.") };
      return { data: payload.data ?? null, error: null };
    } catch {
      return { data: null, error: { message: "Backend tidak dapat dihubungi." } };
    }
  }
}

export const supabase = {
  auth,
  storage,
  from(table: string) {
    if (table !== "profiles") {
      throw new Error(`Tabel "${table}" tidak didukung adapter lokal.`);
    }
    return new ProfileQuery();
  },
};
