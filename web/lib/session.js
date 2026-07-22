// 簡易パスワード認証用のセッショントークン発行・検証。
// middleware（Edge runtime）でも動くよう、Web Crypto APIのみを使用する（Node.jsのBufferは使わない）。

const encoder = new TextEncoder();
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30日

async function getKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createSessionToken(password) {
  const timestamp = Date.now().toString();
  const key = await getKey(password);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp));
  return `${timestamp}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(token, password) {
  if (!token) return false;
  const [timestamp, signatureB64] = token.split(".");
  if (!timestamp || !signatureB64) return false;

  const age = Date.now() - Number(timestamp);
  if (!Number.isFinite(age) || age < 0 || age > SESSION_MAX_AGE_MS) return false;

  const key = await getKey(password);
  const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp));
  const expectedB64 = toBase64Url(expected);

  if (expectedB64.length !== signatureB64.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedB64.length; i++) {
    diff |= expectedB64.charCodeAt(i) ^ signatureB64.charCodeAt(i);
  }
  return diff === 0;
}
