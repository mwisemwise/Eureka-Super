import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./constants.js";

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function loadIdeas() {
  const data = parseJson(localStorage.getItem(STORAGE_KEYS.IDEAS), []);
  if (!Array.isArray(data)) return [];
  return data;
}

export function saveIdeas(ideas) {
  localStorage.setItem(STORAGE_KEYS.IDEAS, JSON.stringify(ideas));
}

export function loadSettings() {
  const data = parseJson(localStorage.getItem(STORAGE_KEYS.SETTINGS), DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...data };
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}
