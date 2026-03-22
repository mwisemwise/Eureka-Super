import { createRandomSecret, decryptJson, encryptJson, getOrCreateDeviceKey, hashText } from "./crypto.js";

const IDEAS_KEY = "eureka.ideas.enc.v2";
const INSTALL_SECRET_KEY = "eureka.install.secret.v2";
const PIN_HASH_KEY = "eureka.pin.hash.v2";
const COUNTER_KEY = "eureka.idea.counter.v2";
const SETTINGS_KEY = "eureka.settings.v2";

const DEFAULT_SETTINGS = {
  pinEnabled: false,
  onboardingDismissed: false,
  sortMode: "date-desc"
};

function parseStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to parse ${key}:`, error);
    return fallback;
  }
}

function sanitizeIdea(rawIdea) {
  if (!rawIdea || typeof rawIdea !== "object") {
    return null;
  }

  if (typeof rawIdea.content !== "string" || typeof rawIdea.createdAt !== "number") {
    return null;
  }

  return {
    id: String(rawIdea.id ?? crypto.randomUUID()),
    number: Number.isFinite(rawIdea.number) ? rawIdea.number : null,
    title: typeof rawIdea.title === "string" && rawIdea.title.trim() ? rawIdea.title.trim() : null,
    category: typeof rawIdea.category === "string" && rawIdea.category.trim() ? rawIdea.category.trim() : null,
    content: rawIdea.content,
    audio: typeof rawIdea.audio === "string" ? rawIdea.audio : "",
    createdAt: rawIdea.createdAt
  };
}

function isCryptoKey(value) {
  return typeof CryptoKey !== "undefined" && value instanceof CryptoKey;
}

function getLegacyInstallSecret() {
  return localStorage.getItem(INSTALL_SECRET_KEY);
}

function storeLegacyInstallSecret(secret) {
  localStorage.setItem(INSTALL_SECRET_KEY, secret);
}

function clearLegacyInstallSecret() {
  localStorage.removeItem(INSTALL_SECRET_KEY);
}

async function getLocalVaultSecret() {
  try {
    return await getOrCreateDeviceKey();
  } catch (error) {
    console.warn("Falling back to legacy local secret storage:", error);
    let secret = getLegacyInstallSecret();
    if (!secret) {
      secret = createRandomSecret();
      storeLegacyInstallSecret(secret);
    }
    return secret;
  }
}

async function migrateLegacyIdeasIfNeeded(nextSecret) {
  if (!isCryptoKey(nextSecret)) {
    return;
  }

  const legacySecret = getLegacyInstallSecret();
  const raw = localStorage.getItem(IDEAS_KEY);
  if (!legacySecret) {
    return;
  }

  if (!raw) {
    clearLegacyInstallSecret();
    return;
  }

  try {
    const payload = JSON.parse(raw);
    const decrypted = await decryptJson(payload, legacySecret);
    if (!Array.isArray(decrypted.ideas)) {
      return;
    }

    const sanitizedIdeas = decrypted.ideas.map(sanitizeIdea).filter(Boolean);
    await saveIdeas(nextSecret, sanitizedIdeas);
    clearLegacyInstallSecret();
  } catch (error) {
    console.warn("Could not migrate legacy install-secret vault:", error);
  }
}

export async function ensureInstallSecret() {
  const secretOrKey = await getLocalVaultSecret();
  await migrateLegacyIdeasIfNeeded(secretOrKey);
  return secretOrKey;
}

export function loadSettings() {
  const stored = parseStoredJson(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getStoredPinEnabled() {
  return loadSettings().pinEnabled;
}

export async function verifyPin(pin) {
  const storedHash = localStorage.getItem(PIN_HASH_KEY);
  if (!storedHash) {
    return false;
  }
  return storedHash === await hashText(pin);
}

export async function loadIdeas(secret) {
  const raw = localStorage.getItem(IDEAS_KEY);
  if (!raw) {
    return [];
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse encrypted ideas payload:", error);
    return [];
  }

  let decrypted;
  try {
    decrypted = await decryptJson(payload, secret);
  } catch (error) {
    if (!isCryptoKey(secret)) {
      throw error;
    }

    const legacySecret = getLegacyInstallSecret();
    if (!legacySecret) {
      throw error;
    }

    decrypted = await decryptJson(payload, legacySecret);
    if (Array.isArray(decrypted.ideas)) {
      const migratedIdeas = decrypted.ideas.map(sanitizeIdea).filter(Boolean);
      await saveIdeas(secret, migratedIdeas);
      clearLegacyInstallSecret();
      return migratedIdeas;
    }
  }

  if (!Array.isArray(decrypted.ideas)) {
    return [];
  }

  return decrypted.ideas.map(sanitizeIdea).filter(Boolean);
}

export async function saveIdeas(secret, ideas) {
  const payload = await encryptJson({ ideas }, secret);
  localStorage.setItem(IDEAS_KEY, JSON.stringify(payload));
  return true;
}

export function getSortMode() {
  return loadSettings().sortMode;
}

export function updateSortMode(sortMode) {
  const settings = loadSettings();
  settings.sortMode = sortMode;
  saveSettings(settings);
  return settings;
}

function getNextIdeaNumber() {
  const currentValue = Number.parseInt(localStorage.getItem(COUNTER_KEY) ?? "0", 10);
  if (!Number.isFinite(currentValue)) {
    return 1;
  }
  return currentValue + 1;
}

function incrementIdeaCounter() {
  const nextValue = getNextIdeaNumber();
  localStorage.setItem(COUNTER_KEY, String(nextValue));
  return nextValue;
}

export async function createIdea(secret, draft) {
  const ideas = await loadIdeas(secret);
  const idea = {
    id: crypto.randomUUID(),
    number: incrementIdeaCounter(),
    title: draft.title || null,
    category: draft.category || null,
    content: draft.content || "[Voice note]",
    audio: draft.audio || "",
    createdAt: Date.now()
  };

  ideas.unshift(idea);
  await saveIdeas(secret, ideas);
  return idea;
}

export async function deleteIdea(secret, ideaId) {
  const ideas = await loadIdeas(secret);
  const filteredIdeas = ideas.filter((idea) => idea.id !== ideaId);
  if (filteredIdeas.length === ideas.length) {
    return false;
  }
  await saveIdeas(secret, filteredIdeas);
  return true;
}

export async function enablePin(currentSecret, pin) {
  const ideas = await loadIdeas(currentSecret);
  await saveIdeas(pin, ideas);
  localStorage.setItem(PIN_HASH_KEY, await hashText(pin));
  const settings = loadSettings();
  settings.pinEnabled = true;
  saveSettings(settings);
  return settings;
}

export async function disablePin(currentSecret) {
  const ideas = await loadIdeas(currentSecret);
  const installSecret = await ensureInstallSecret();
  await saveIdeas(installSecret, ideas);
  localStorage.removeItem(PIN_HASH_KEY);
  const settings = loadSettings();
  settings.pinEnabled = false;
  saveSettings(settings);
  return {
    settings,
    installSecret
  };
}

export function dismissOnboarding() {
  const settings = loadSettings();
  settings.onboardingDismissed = true;
  saveSettings(settings);
  return settings;
}
