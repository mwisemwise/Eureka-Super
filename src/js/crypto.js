const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(passphrase, salt) {
  const base = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function b64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export async function encryptJson(payload, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plain = encoder.encode(JSON.stringify(payload));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return {
    encrypted: true,
    format: "eureka-super-export-v1",
    salt: b64(salt),
    iv: b64(iv),
    data: b64(cipher),
  };
}

export async function isCryptoReady() {
  return Boolean(globalThis.crypto?.subtle);
}
