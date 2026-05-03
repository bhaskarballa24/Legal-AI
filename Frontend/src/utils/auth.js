const AUTH_STORAGE_KEY = "multi_ai_auth";

export function getAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

export function setAuth(authPayload) {
  if (!authPayload?.token || !authPayload?.user) return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authPayload));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAuthToken() {
  return getAuth()?.token || "";
}
