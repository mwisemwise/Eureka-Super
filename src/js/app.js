import {
  createIdea,
  deleteIdea,
  disablePin,
  dismissOnboarding,
  enablePin,
  ensureInstallSecret,
  getStoredPinEnabled,
  getSortMode,
  loadIdeas,
  loadSettings,
  updateSortMode,
  verifyPin
} from "./storage.js";
import { exportIdeasEncrypted } from "./export.js";

const pageNames = ["auth", "front", "capture", "ideas", "stats", "settings", "help"];

const elements = {
  authPage: document.getElementById("authPage"),
  authMessage: document.getElementById("authMessage"),
  backFromCapture: document.getElementById("backFromCapture"),
  backFromHelp: document.getElementById("backFromHelp"),
  backFromIdeas: document.getElementById("backFromIdeas"),
  backFromSettings: document.getElementById("backFromSettings"),
  backFromStats: document.getElementById("backFromStats"),
  cancelCaptureBtn: document.getElementById("cancelCaptureBtn"),
  captureBtn: document.getElementById("captureBtn"),
  capturePage: document.getElementById("capturePage"),
  captureStatus: document.getElementById("captureStatus"),
  celebrationMessage: document.getElementById("celebrationMessage"),
  celebrationOverlay: document.getElementById("celebrationOverlay"),
  cancelExportBtn: document.getElementById("cancelExportBtn"),
  closeExportBtn: document.getElementById("closeExportBtn"),
  confirmExportBtn: document.getElementById("confirmExportBtn"),
  disablePinBtn: document.getElementById("disablePinBtn"),
  dismissOnboardingBtn: document.getElementById("dismissOnboardingBtn"),
  dictateBtn: document.getElementById("dictateBtn"),
  exportError: document.getElementById("exportError"),
  exportModal: document.getElementById("exportModal"),
  exportPassphraseInput: document.getElementById("exportPassphraseInput"),
  frontPage: document.getElementById("frontPage"),
  frontSummary: document.getElementById("frontSummary"),
  helpBtn: document.getElementById("helpBtn"),
  helpPage: document.getElementById("helpPage"),
  ideaCategory: document.getElementById("ideaCategory"),
  ideaInput: document.getElementById("ideaInput"),
  ideaTitle: document.getElementById("ideaTitle"),
  ideasCount: document.getElementById("ideasCount"),
  ideasList: document.getElementById("ideasList"),
  ideasPage: document.getElementById("ideasPage"),
  newPinInput: document.getElementById("newPinInput"),
  onboardingCard: document.getElementById("onboardingCard"),
  openExportBtn: document.getElementById("openExportBtn"),
  openHelpFromOnboardingBtn: document.getElementById("openHelpFromOnboardingBtn"),
  openStatsFromIdeasBtn: document.getElementById("openStatsFromIdeasBtn"),
  pinCancelBtn: document.getElementById("pinCancelBtn"),
  pinError: document.getElementById("pinError"),
  pinInput: document.getElementById("pinInput"),
  pinSetupSection: document.getElementById("pinSetupSection"),
  pinSubmitBtn: document.getElementById("pinSubmitBtn"),
  pinToggle: document.getElementById("pinToggle"),
  recordBtn: document.getElementById("recordBtn"),
  saveIdeaBtn: document.getElementById("saveIdeaBtn"),
  savePinBtn: document.getElementById("savePinBtn"),
  searchInput: document.getElementById("searchInput"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsPage: document.getElementById("settingsPage"),
  settingsStatus: document.getElementById("settingsStatus"),
  sortSelect: document.getElementById("sortSelect"),
  statAudio: document.getElementById("statAudio"),
  statMonth: document.getElementById("statMonth"),
  statTotal: document.getElementById("statTotal"),
  statWeek: document.getElementById("statWeek"),
  statsBtn: document.getElementById("statsBtn"),
  statsPage: document.getElementById("statsPage"),
  statusToast: document.getElementById("statusToast"),
  titleError: document.getElementById("titleError"),
  viewIdeasBtn: document.getElementById("viewIdeasBtn"),
  audioPreview: document.getElementById("audioPreview")
};

const state = {
  currentPage: "front",
  currentSort: getSortMode(),
  searchQuery: "",
  settings: loadSettings(),
  sessionSecret: null,
  pendingAction: null,
  pendingPage: "front",
  ideasCache: [],
  mediaRecorder: null,
  audioChunks: [],
  audioDataUrl: "",
  dictateRecognition: null,
  toastTimerId: null,
  celebrationTimerId: null
};

function escapeHtml(value) {
  const wrapper = document.createElement("div");
  wrapper.textContent = String(value ?? "");
  return wrapper.innerHTML;
}

function showPage(pageName) {
  for (const name of pageNames) {
    const pageElement = elements[`${name}Page`];
    if (pageElement) {
      pageElement.classList.toggle("hidden", name !== pageName);
    }
  }
  state.currentPage = pageName;
}

function showToast(message) {
  clearTimeout(state.toastTimerId);
  elements.statusToast.textContent = message;
  elements.statusToast.classList.remove("hidden");
  state.toastTimerId = window.setTimeout(() => {
    elements.statusToast.classList.add("hidden");
  }, 2200);
}

function showCelebration(message) {
  clearTimeout(state.celebrationTimerId);
  elements.celebrationMessage.textContent = message;
  elements.celebrationOverlay.classList.remove("hidden");
  state.celebrationTimerId = window.setTimeout(() => {
    elements.celebrationOverlay.classList.add("hidden");
  }, 1500);
}

function showInlineError(target, message) {
  target.textContent = message;
  target.classList.remove("hidden");
}

function clearInlineError(target) {
  target.textContent = "";
  target.classList.add("hidden");
}

function validateTitle(title) {
  if (!title) {
    return "";
  }
  if (title.length > 40) {
    return "Titles can be up to 40 characters.";
  }
  return "";
}

function getActiveSecret() {
  return state.sessionSecret;
}

function showUnlockPage(message, pendingAction, pendingPage = "front") {
  state.pendingAction = pendingAction;
  state.pendingPage = pendingPage;
  elements.authMessage.textContent = message;
  elements.pinInput.value = "";
  clearInlineError(elements.pinError);
  showPage("auth");
  elements.pinInput.focus();
}

async function ensureUnlocked(message, pendingAction, pendingPage) {
  if (!state.settings.pinEnabled) {
    return pendingAction();
  }

  if (state.sessionSecret) {
    return pendingAction();
  }

  showUnlockPage(message, pendingAction, pendingPage);
}

async function refreshIdeasCache() {
  const secret = getActiveSecret();
  if (!secret) {
    state.ideasCache = [];
    return [];
  }
  state.ideasCache = await loadIdeas(secret);
  return state.ideasCache;
}

function computeStats(ideas) {
  const now = Date.now();
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const monthAgo = now - (30 * 24 * 60 * 60 * 1000);

  return {
    total: ideas.length,
    week: ideas.filter((idea) => idea.createdAt >= weekAgo).length,
    month: ideas.filter((idea) => idea.createdAt >= monthAgo).length,
    audio: ideas.filter((idea) => Boolean(idea.audio)).length
  };
}

function filterIdeas(ideas, query) {
  if (!query.trim()) {
    return ideas;
  }

  const normalizedQuery = query.trim().toLowerCase();
  return ideas.filter((idea) => {
    return [
      idea.title ?? "",
      idea.category ?? "",
      idea.content ?? ""
    ].some((field) => field.toLowerCase().includes(normalizedQuery));
  });
}

function sortIdeas(ideas, sortMode) {
  const copy = [...ideas];
  switch (sortMode) {
    case "date-asc":
      return copy.sort((left, right) => left.createdAt - right.createdAt);
    case "title-asc":
      return copy.sort((left, right) => (left.title ?? "~").localeCompare(right.title ?? "~"));
    case "title-desc":
      return copy.sort((left, right) => (right.title ?? "").localeCompare(left.title ?? ""));
    case "date-desc":
    default:
      return copy.sort((left, right) => right.createdAt - left.createdAt);
  }
}

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function renderFrontSummary() {
  const totalIdeas = state.ideasCache.length;
  elements.frontSummary.textContent = totalIdeas
    ? `${totalIdeas} idea${totalIdeas === 1 ? "" : "s"} captured. Capture fast, search later.`
    : "One tap to capture. Search and resurface later.";

  const showOnboarding = !state.settings.onboardingDismissed && totalIdeas === 0;
  elements.onboardingCard.classList.toggle("hidden", !showOnboarding);
}

function renderIdeas() {
  const filteredIdeas = filterIdeas(state.ideasCache, state.searchQuery);
  const sortedIdeas = sortIdeas(filteredIdeas, state.currentSort);
  const totalIdeas = state.ideasCache.length;

  if (!totalIdeas) {
    elements.ideasCount.textContent = "No ideas yet.";
    elements.ideasList.innerHTML = `
      <div class="empty-state">
        <p class="eyebrow">Empty</p>
        <p>Capture the first spark and it will appear here.</p>
      </div>
    `;
    return;
  }

  elements.ideasCount.textContent = state.searchQuery.trim()
    ? `Showing ${sortedIdeas.length} of ${totalIdeas} ideas.`
    : `${totalIdeas} idea${totalIdeas === 1 ? "" : "s"}.`;

  if (!sortedIdeas.length) {
    elements.ideasList.innerHTML = `
      <div class="empty-state">
        <p class="eyebrow">No Match</p>
        <p>Try a different search phrase.</p>
      </div>
    `;
    return;
  }

  elements.ideasList.innerHTML = sortedIdeas.map((idea) => {
    const protectedUntil = idea.createdAt + (24 * 60 * 60 * 1000);
    const canDelete = Date.now() >= protectedUntil;
    const categoryHtml = idea.category ? `<span class="idea-category">${escapeHtml(idea.category)}</span>` : "";
    const audioHtml = idea.audio ? `<audio controls src="${idea.audio}" class="audio-preview"></audio>` : "";
    const protectionHtml = canDelete
      ? `<button class="secondary-btn delete-btn" data-delete-id="${escapeHtml(idea.id)}" type="button">Delete</button>`
      : `<span class="protection-note">Protected until ${escapeHtml(formatDateTime(protectedUntil))}</span>`;

    return `
      <article class="idea-card">
        <div class="idea-topline">
          <span class="idea-number">Idea #${idea.number ?? "?"}</span>
          <span class="idea-date">${escapeHtml(formatDateTime(idea.createdAt))}</span>
        </div>
        ${idea.title ? `<h3 class="idea-title">${escapeHtml(idea.title)}</h3>` : ""}
        ${categoryHtml}
        <p class="idea-content">${escapeHtml(idea.content)}</p>
        ${audioHtml}
        <div class="idea-bottomline">
          ${protectionHtml}
        </div>
      </article>
    `;
  }).join("");
}

function renderStats() {
  const stats = computeStats(state.ideasCache);
  elements.statTotal.textContent = String(stats.total);
  elements.statWeek.textContent = String(stats.week);
  elements.statMonth.textContent = String(stats.month);
  elements.statAudio.textContent = String(stats.audio);
}

function clearCaptureForm() {
  elements.ideaTitle.value = "";
  elements.ideaCategory.value = "";
  elements.ideaInput.value = "";
  elements.audioPreview.classList.add("hidden");
  elements.audioPreview.removeAttribute("src");
  state.audioDataUrl = "";
  clearInlineError(elements.titleError);
  elements.captureStatus.textContent = "Cmd/Ctrl + Enter saves quickly.";
  stopDictation();
  stopRecording();
}

function openCapture() {
  showPage("capture");
  elements.ideaTitle.focus();
}

async function openIdeasPage() {
  await ensureUnlocked(
    "Enter your PIN to view ideas.",
    async () => {
      await refreshIdeasCache();
      renderIdeas();
      showPage("ideas");
    },
    "ideas"
  );
}

async function openStatsPage() {
  await ensureUnlocked(
    "Enter your PIN to view stats.",
    async () => {
      await refreshIdeasCache();
      renderStats();
      showPage("stats");
    },
    "stats"
  );
}

function openSettingsPage() {
  elements.pinToggle.checked = state.settings.pinEnabled;
  elements.pinSetupSection.classList.toggle("hidden", !state.settings.pinEnabled);
  elements.disablePinBtn.classList.toggle("hidden", !state.settings.pinEnabled);
  showPage("settings");
}

function openHelpPage() {
  showPage("help");
}

async function handlePinSubmit() {
  const pin = elements.pinInput.value.trim();
  if (!/^\d{4,6}$/.test(pin)) {
    showInlineError(elements.pinError, "PIN must be 4 to 6 digits.");
    return;
  }

  if (!(await verifyPin(pin))) {
    showInlineError(elements.pinError, "Incorrect PIN.");
    elements.pinInput.value = "";
    return;
  }

  clearInlineError(elements.pinError);
  state.sessionSecret = pin;

  if (state.pendingAction) {
    const nextAction = state.pendingAction;
    state.pendingAction = null;
    await nextAction();
    return;
  }

  showPage(state.pendingPage || "front");
}

async function handleSaveIdea() {
  const title = elements.ideaTitle.value.trim();
  const category = elements.ideaCategory.value.trim();
  const content = elements.ideaInput.value.trim();
  const validationMessage = validateTitle(title);

  if (validationMessage) {
    showInlineError(elements.titleError, validationMessage);
    return;
  }

  clearInlineError(elements.titleError);

  if (!content && !state.audioDataUrl) {
    elements.ideaInput.focus();
    elements.captureStatus.textContent = "Add text or audio before saving.";
    return;
  }

  await ensureUnlocked(
    "Enter your PIN to save this idea.",
    async () => {
      const idea = await createIdea(getActiveSecret(), {
        title,
        category,
        content,
        audio: state.audioDataUrl
      });
      await refreshIdeasCache();
      renderFrontSummary();
      clearCaptureForm();
      showCelebration(`Idea #${idea.number} captured.`);
      showPage("front");
    },
    "capture"
  );
}

async function handleDeleteIdea(ideaId) {
  await ensureUnlocked(
    "Enter your PIN to delete this idea.",
    async () => {
      const didDelete = await deleteIdea(getActiveSecret(), ideaId);
      if (!didDelete) {
        showToast("Idea not found.");
        return;
      }
      await refreshIdeasCache();
      renderIdeas();
      renderFrontSummary();
      showToast("Idea deleted.");
    },
    "ideas"
  );
}

function openExportModal() {
  if (!state.ideasCache.length) {
    showToast("No ideas to export yet.");
    return;
  }
  elements.exportPassphraseInput.value = "";
  clearInlineError(elements.exportError);
  elements.exportModal.classList.remove("hidden");
  elements.exportPassphraseInput.focus();
}

function closeExportModal() {
  elements.exportModal.classList.add("hidden");
  clearInlineError(elements.exportError);
}

async function handleConfirmExport() {
  const passphrase = elements.exportPassphraseInput.value;
  if (passphrase.length < 8) {
    showInlineError(elements.exportError, "Use at least 8 characters.");
    return;
  }

  await ensureUnlocked(
    "Enter your PIN to export ideas.",
    async () => {
      await refreshIdeasCache();
      await exportIdeasEncrypted(state.ideasCache, passphrase);
      closeExportModal();
      showToast("Encrypted export downloaded.");
    },
    "ideas"
  );
}

async function handlePinToggleChange() {
  if (elements.pinToggle.checked) {
    elements.pinSetupSection.classList.remove("hidden");
    elements.disablePinBtn.classList.remove("hidden");
    elements.newPinInput.focus();
    elements.settingsStatus.textContent = "Enter a PIN and save to enable protection.";
    return;
  }

  if (!state.settings.pinEnabled) {
    elements.pinSetupSection.classList.add("hidden");
    elements.disablePinBtn.classList.add("hidden");
    elements.settingsStatus.textContent = "";
    return;
  }

  await handleDisablePin();
}

async function handleSavePin() {
  const pin = elements.newPinInput.value.trim();
  if (!/^\d{4,6}$/.test(pin)) {
    elements.settingsStatus.textContent = "PIN must be 4 to 6 digits.";
    return;
  }

  const currentSecret = state.settings.pinEnabled
    ? state.sessionSecret
    : await ensureInstallSecret();
  state.settings = await enablePin(currentSecret, pin);
  state.sessionSecret = pin;
  elements.newPinInput.value = "";
  elements.pinToggle.checked = true;
  elements.pinSetupSection.classList.remove("hidden");
  elements.disablePinBtn.classList.remove("hidden");
  elements.settingsStatus.textContent = "PIN protection enabled.";
}

async function handleDisablePin() {
  if (!state.settings.pinEnabled) {
    elements.pinToggle.checked = false;
    elements.pinSetupSection.classList.add("hidden");
    elements.disablePinBtn.classList.add("hidden");
    elements.settingsStatus.textContent = "PIN protection is already off.";
    return;
  }

  await ensureUnlocked(
    "Enter your PIN to disable protection.",
    async () => {
      const result = await disablePin(getActiveSecret());
      state.settings = result.settings;
      state.sessionSecret = result.installSecret;
      elements.pinToggle.checked = false;
      elements.pinSetupSection.classList.add("hidden");
      elements.disablePinBtn.classList.add("hidden");
      elements.settingsStatus.textContent = "PIN protection disabled.";
    },
    "settings"
  );
}

function dismissOnboardingCard() {
  state.settings = dismissOnboarding();
  renderFrontSummary();
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }
}

function stopDictation() {
  if (state.dictateRecognition) {
    try {
      state.dictateRecognition.stop();
    } catch (error) {
      console.debug("Dictation stop skipped:", error);
    }
  }
  elements.dictateBtn.classList.remove("is-active");
}

function startDictation() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    showToast("Speech recognition is not available in this browser.");
    return;
  }

  if (!state.dictateRecognition) {
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      elements.ideaInput.value = `${elements.ideaInput.value} ${transcript}`.trim();
    };
    recognition.onend = () => {
      elements.dictateBtn.classList.remove("is-active");
    };
    recognition.onerror = () => {
      elements.dictateBtn.classList.remove("is-active");
      showToast("Could not transcribe voice input.");
    };
    state.dictateRecognition = recognition;
  }

  elements.dictateBtn.classList.add("is-active");
  state.dictateRecognition.start();
}

function toggleDictation() {
  if (elements.dictateBtn.classList.contains("is-active")) {
    stopDictation();
    return;
  }
  startDictation();
}

function stopRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
    state.mediaRecorder.stop();
  }
  elements.recordBtn.classList.remove("is-active");
}

async function toggleRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
    state.mediaRecorder.stop();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("Audio recording is not available here.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.audioChunks = [];
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        state.audioChunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const audioBlob = new Blob(state.audioChunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = () => {
        state.audioDataUrl = reader.result;
        elements.audioPreview.src = state.audioDataUrl;
        elements.audioPreview.classList.remove("hidden");
        elements.recordBtn.classList.remove("is-active");
        stream.getTracks().forEach((track) => track.stop());
      };
      reader.readAsDataURL(audioBlob);
    };

    state.mediaRecorder = recorder;
    recorder.start();
    elements.recordBtn.classList.add("is-active");
    elements.captureStatus.textContent = "Recording audio...";
  } catch (error) {
    console.error("Recording failed:", error);
    showToast("Microphone access was denied or unavailable.");
  }
}

function handleGlobalShortcuts(event) {
  const activeElement = document.activeElement;
  const isEditable = activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement;

  if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && state.currentPage === "capture") {
    event.preventDefault();
    handleSaveIdea();
    return;
  }

  if (!isEditable && event.key.toLowerCase() === "n") {
    event.preventDefault();
    openCapture();
    return;
  }

  if (state.currentPage === "ideas" && event.key === "/") {
    event.preventDefault();
    elements.searchInput.focus();
  }

  if (event.key === "Escape" && !elements.exportModal.classList.contains("hidden")) {
    closeExportModal();
  }
}

async function initializeApp() {
  elements.sortSelect.value = state.currentSort;
  elements.pinToggle.checked = state.settings.pinEnabled;
  elements.pinSetupSection.classList.toggle("hidden", !state.settings.pinEnabled);
  elements.disablePinBtn.classList.toggle("hidden", !state.settings.pinEnabled);

  if (!state.settings.pinEnabled) {
    state.sessionSecret = await ensureInstallSecret();
    await refreshIdeasCache();
  }
  renderFrontSummary();
  registerServiceWorker();
}

elements.captureBtn.addEventListener("click", () => {
  clearCaptureForm();
  openCapture();
});
elements.cancelCaptureBtn.addEventListener("click", () => {
  clearCaptureForm();
  showPage("front");
});
elements.viewIdeasBtn.addEventListener("click", openIdeasPage);
elements.statsBtn.addEventListener("click", openStatsPage);
elements.settingsBtn.addEventListener("click", openSettingsPage);
elements.helpBtn.addEventListener("click", openHelpPage);
elements.openHelpFromOnboardingBtn.addEventListener("click", openHelpPage);
elements.dismissOnboardingBtn.addEventListener("click", dismissOnboardingCard);
elements.backFromCapture.addEventListener("click", () => {
  clearCaptureForm();
  showPage("front");
});
elements.backFromIdeas.addEventListener("click", () => showPage("front"));
elements.backFromStats.addEventListener("click", () => showPage("front"));
elements.backFromSettings.addEventListener("click", () => showPage("front"));
elements.backFromHelp.addEventListener("click", () => showPage("front"));
elements.openStatsFromIdeasBtn.addEventListener("click", openStatsPage);
elements.saveIdeaBtn.addEventListener("click", handleSaveIdea);
elements.ideaTitle.addEventListener("input", () => {
  const validationMessage = validateTitle(elements.ideaTitle.value.trim());
  if (validationMessage) {
    showInlineError(elements.titleError, validationMessage);
    return;
  }
  clearInlineError(elements.titleError);
});
elements.searchInput.addEventListener("input", () => {
  state.searchQuery = elements.searchInput.value;
  renderIdeas();
});
elements.sortSelect.addEventListener("change", () => {
  state.currentSort = elements.sortSelect.value;
  state.settings = updateSortMode(state.currentSort);
  renderIdeas();
});
elements.ideasList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const ideaId = target.dataset.deleteId;
  if (ideaId) {
    handleDeleteIdea(ideaId);
  }
});
elements.pinSubmitBtn.addEventListener("click", handlePinSubmit);
elements.pinInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handlePinSubmit();
  }
});
elements.pinCancelBtn.addEventListener("click", () => {
  state.pendingAction = null;
  showPage("front");
});
elements.openExportBtn.addEventListener("click", openExportModal);
elements.closeExportBtn.addEventListener("click", closeExportModal);
elements.cancelExportBtn?.addEventListener("click", closeExportModal);
elements.confirmExportBtn.addEventListener("click", handleConfirmExport);
elements.pinToggle.addEventListener("change", handlePinToggleChange);
elements.savePinBtn.addEventListener("click", handleSavePin);
elements.disablePinBtn.addEventListener("click", handleDisablePin);
elements.dictateBtn.addEventListener("click", toggleDictation);
elements.recordBtn.addEventListener("click", toggleRecording);
window.addEventListener("keydown", handleGlobalShortcuts);

initializeApp().catch((error) => {
  console.error("Initialization failed:", error);
  showToast("Eureka could not start cleanly.");
});
