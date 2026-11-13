const API_ORIGIN = new URL(
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).origin;

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload || payload.success === false) {
    throw new Error(
      payload?.message || `Request failed with status ${response.status}`
    );
  }

  return payload;
}
