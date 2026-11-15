// Constant-time comparison to avoid timing side-channels.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function verifyApiKey(key: string | null): boolean {
  if (!key) return false;
  const expected = process.env.ASTRA_API_KEY;
  if (!expected) {
    // No key configured: deny all requests so a missing secret is safe by default.
    return false;
  }
  return constantTimeEqual(key, expected);
}
