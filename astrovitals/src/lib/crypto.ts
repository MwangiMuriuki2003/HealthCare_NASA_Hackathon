/**
 * Crypto Module — WebCrypto AES-256-GCM encryption & Ed25519 signing.
 *
 * Everything runs in the browser; no key material leaves the device.
 * Ed25519 support requires a browser with WebCrypto Ed25519 (Chrome 113+,
 * Firefox 130+, Safari 17+). There is intentionally no insecure fallback:
 * callers must handle a `NotSupportedError`.
 */

const AES_KEY_LENGTH = 256;
const GCM_IV_BYTES = 12;

export interface EncryptedPayload {
  encryptedData: ArrayBuffer;
  iv: Uint8Array;
}

export interface SignedBundle {
  payload: string;
  hash: string;
  signature: string;
  timestamp: number;
}

/** Generate an extractable Ed25519 key pair for sync-bundle signing. */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ]);
}

/** Sign raw bytes with an Ed25519 private key. */
export async function signData(
  privateKey: CryptoKey,
  data: ArrayBuffer | Uint8Array
): Promise<ArrayBuffer> {
  return crypto.subtle.sign({ name: "Ed25519" }, privateKey, toArrayBuffer(data));
}

/** Verify an Ed25519 signature. Returns false on any failure. */
export async function verifySignature(
  publicKey: CryptoKey,
  data: ArrayBuffer | Uint8Array,
  signature: ArrayBuffer
): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      signature,
      toArrayBuffer(data)
    );
  } catch {
    return false;
  }
}

/** Import a base64 PKCS#8/SPKI key (useful for restoring a device identity). */
export async function importPublicKey(base64Spki: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    base64ToBytes(base64Spki) as BufferSource,
    { name: "Ed25519" },
    true,
    ["verify"]
  );
}

/** Export a public key as base64 SPKI. */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  return bytesToBase64(new Uint8Array(spki));
}

/** Generate a non-extractable AES-256-GCM key for local storage. */
export async function generateStorageKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt a string or buffer with AES-256-GCM and a fresh 96-bit IV. */
export async function encryptReading(
  plaintext: string | ArrayBuffer | Uint8Array,
  key: CryptoKey
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_BYTES));
  const data =
    typeof plaintext === "string"
      ? new TextEncoder().encode(plaintext)
      : toArrayBuffer(plaintext);

  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return { encryptedData, iv };
}

/** Decrypt an AES-256-GCM payload and decode it as UTF-8. */
export async function decryptReading(
  { encryptedData, iv }: EncryptedPayload,
  key: CryptoKey
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encryptedData as BufferSource
  );
  return new TextDecoder().decode(decrypted);
}

/** SHA-256 of raw bytes as lowercase hex. */
export async function computeBundleHash(
  bundleData: ArrayBuffer | Uint8Array
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    toArrayBuffer(bundleData) as BufferSource
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create the signed payload expected by `services/api`:
 *   - canonical JSON (sorted keys) so both sides hash identical bytes
 *   - SHA-256 hex digest for cheap integrity checks
 *   - Ed25519 signature over the canonical bytes
 */
export async function createSignedBundle(
  keyPair: CryptoKeyPair,
  payload: object
): Promise<SignedBundle> {
  const payloadString = canonicalJSON(payload);
  const bytes = new TextEncoder().encode(payloadString);
  const hash = await computeBundleHash(bytes);
  const signature = await signData(keyPair.privateKey, bytes);

  return {
    payload: payloadString,
    hash,
    signature: bytesToBase64(new Uint8Array(signature)),
    timestamp: Date.now(),
  };
}

/** JSON.stringify with recursively sorted object keys. */
export function canonicalJSON(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}
