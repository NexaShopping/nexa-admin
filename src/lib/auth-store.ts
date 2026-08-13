// Where the opaque session token lives on the client. localStorage (not a cookie)
// because the API is on a different host than this panel, which makes cross-site
// cookies unreliable; the token is sent as an Authorization header instead.
const KEY = "nexa_admin_session";

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(KEY);
  },
  set(token: string): void {
    window.localStorage.setItem(KEY, token);
  },
  clear(): void {
    window.localStorage.removeItem(KEY);
  },
};
