const encoder = new TextEncoder();
const decoder = new TextDecoder();
const KEY_DB_NAME = "eureka-keyring";
const KEY_STORE_NAME = "keys";
const DEVICE_KEY_ID = "vault-device-key-v1";

function toBase64(bytes) {
  let binary = "";
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const chunkSize = 0x8000;
  for (let index = 0; index < array.length; index += chunkSize) {
    binary += String.fromCharCode.apply(null, array.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }
  return output;
}

function isCryptoKey(value) {
  return typeof CryptoKey !== "undefined" && value instanceof CryptoKey;
}

function openKeyDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }

    const request = indexedDB.open(KEY_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(KEY_STORE_NAME)) {
        database.createObjectStore(KEY_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open key database."));
  });
}

function withKeyStore(mode, callback) {
  return openKeyDatabase().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(KEY_STORE_NAME, mode);
      const store = transaction.objectStore(KEY_STORE_NAME);

      transaction.oncomplete = () => {
        database.close();
      };
      transaction.onerror = () => {
        reject(transaction.error ?? new Error("Key store transaction failed."));
      };
      transaction.onabort = () => {
        reject(transaction.error ?? new Error("Key store transaction aborted."));
      };

      Promise.resolve(callback(store)).then(resolve, reject);
    });
  });
}

function readKeyRecord(keyId) {
  return withKeyStore("readonly", (store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(keyId);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Failed to read key record."));
    });
  });
}

function writeKeyRecord(keyId, keyValue) {
  return withKeyStore("readwrite", (store) => {
    return new Promise((resolve, reject) => {
      const request = store.put(keyValue, keyId);
      request.onsuccess = () => resolve(keyValue);
      request.onerror = () => reject(request.error ?? new Error("Failed to store key record."));
    });
  });
}

async function deriveAesKey(secret, saltBytes) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 120000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function createRandomSecret(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return toBase64(bytes);
}

async function createDeviceKey() {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function getOrCreateDeviceKey() {
  const storedKey = await readKeyRecord(DEVICE_KEY_ID).catch(() => null);
  if (storedKey && isCryptoKey(storedKey)) {
    return storedKey;
  }

  const nextKey = await createDeviceKey();
  await writeKeyRecord(DEVICE_KEY_ID, nextKey);
  return nextKey;
}

export async function hashText(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toBase64(new Uint8Array(digest));
}

export async function encryptJson(value, secretOrKey, saltBytes = null) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const usingDeviceKey = isCryptoKey(secretOrKey);
  const actualSalt = usingDeviceKey ? null : (saltBytes ?? crypto.getRandomValues(new Uint8Array(16)));
  const key = usingDeviceKey
    ? secretOrKey
    : await deriveAesKey(secretOrKey, actualSalt);
  const plaintext = encoder.encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  const payload = {
    version: 2,
    keyMode: usingDeviceKey ? "device" : "passphrase",
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(cipher))
  };

  if (!usingDeviceKey) {
    payload.salt = toBase64(actualSalt);
  }

  return payload;
}

export async function decryptJson(payload, secretOrKey) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Missing encrypted payload.");
  }

  const keyMode = payload.keyMode ?? "passphrase";
  const iv = fromBase64(payload.iv);
  const cipher = fromBase64(payload.data);
  const key = keyMode === "device"
    ? secretOrKey
    : await deriveAesKey(secretOrKey, fromBase64(payload.salt));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);

  return JSON.parse(decoder.decode(plaintext));
}
