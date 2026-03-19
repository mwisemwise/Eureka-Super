import { TITLE_MAX } from "./constants.js";
import { encryptJson, isCryptoReady } from "./crypto.js";
import { loadIdeas, loadSettings, saveIdeas, saveSettings } from "./storage.js";
import { downloadFile, escapeHtml, formatDate, uid } from "./utils.js";

const state = {
  ideas: loadIdeas(),
  settings: loadSettings(),
  view: "capture",
  search: "",
  sort: "newest",
};

const el = {
  pages: [...document.querySelectorAll(".page")],
  nav: [...document.querySelectorAll("[data-nav]")],
  statsNav: document.getElementById("statsNav"),
  titleInput: document.getElementById("ideaTitleInput"),
  titleError: document.getElementById("titleError"),
  contentInput: document.getElementById("ideaContentInput"),
  saveBtn: document.getElementById("saveIdeaBtn"),
  goIdeasBtn: document.getElementById("goIdeasBtn"),
  captureStatus: document.getElementById("captureStatus"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  ideasList: document.getElementById("ideasList"),
  ideasEmpty: document.getElementById("ideasEmpty"),
  advancedToggle: document.getElementById("advancedToggle"),
  exportBtn: document.getElementById("exportBtn"),
  settingsStatus: document.getElementById("settingsStatus"),
  statTotal: document.getElementById("statTotal"),
  statWithTitle: document.getElementById("statWithTitle"),
  statRecent: document.getElementById("statRecent"),
};

function setStatus(node, message) {
  node.textContent = message || "";
}

function validateTitle(raw) {
  const title = raw.trim();
  if (title.length > TITLE_MAX) {
    return `Title must be ${TITLE_MAX} characters or fewer.`;
  }
  return "";
}

function showView(view) {
  state.view = view;
  el.pages.forEach((page) => {
    page.classList.toggle("is-active", page.id === `page-${view}`);
  });
  el.nav.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.nav === view);
  });
}

function visibleIdeas() {
  const q = state.search.trim().toLowerCase();
  let list = state.ideas.filter((idea) => {
    if (!q) return true;
    return `${idea.title} ${idea.content}`.toLowerCase().includes(q);
  });

  switch (state.sort) {
    case "oldest":
      list = list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      break;
    case "title-asc":
      list = list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "title-desc":
      list = list.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
      break;
    default:
      list = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return list;
}

function renderIdeas() {
  const list = visibleIdeas();
  el.ideasList.innerHTML = "";

  list.forEach((idea) => {
    const li = document.createElement("li");
    li.className = "idea-item";
    li.innerHTML = `
      <div class="idea-title">${escapeHtml(idea.title || "Untitled")}</div>
      <div>${escapeHtml(idea.content)}</div>
      <div class="idea-meta">${escapeHtml(formatDate(idea.createdAt))}</div>
      <div class="idea-actions">
        <button class="btn" data-act="rename" data-id="${escapeHtml(idea.id)}" type="button">Rename</button>
        <button class="btn" data-act="delete" data-id="${escapeHtml(idea.id)}" type="button">Delete</button>
      </div>
    `;
    el.ideasList.appendChild(li);
  });

  el.ideasEmpty.hidden = list.length > 0;
  updateStats();
}

function updateStats() {
  const total = state.ideas.length;
  const withTitle = state.ideas.filter((i) => (i.title || "").trim().length > 0).length;
  const threshold = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recent = state.ideas.filter((i) => new Date(i.createdAt).getTime() >= threshold).length;

  el.statTotal.textContent = String(total);
  el.statWithTitle.textContent = String(withTitle);
  el.statRecent.textContent = String(recent);
}

function persistIdeas() {
  saveIdeas(state.ideas);
  renderIdeas();
}

function saveIdea() {
  const titleRaw = el.titleInput.value;
  const error = validateTitle(titleRaw);
  if (error) {
    el.titleError.hidden = false;
    el.titleError.textContent = error;
    return;
  }

  el.titleError.hidden = true;
  const content = el.contentInput.value.trim();
  if (!content) {
    setStatus(el.captureStatus, "Add idea text before saving.");
    return;
  }

  const now = new Date().toISOString();
  state.ideas.push({
    id: uid(),
    title: titleRaw.trim() || null,
    content,
    createdAt: now,
    updatedAt: now,
  });

  persistIdeas();
  el.contentInput.value = "";
  el.titleInput.value = "";
  setStatus(el.captureStatus, "Saved.");
}

function renameIdea(id) {
  const idea = state.ideas.find((i) => i.id === id);
  if (!idea) return;
  const next = window.prompt(`Rename idea (max ${TITLE_MAX} chars)`, idea.title || "");
  if (next === null) return;
  const error = validateTitle(next);
  if (error) {
    window.alert(error);
    return;
  }
  idea.title = next.trim() || null;
  idea.updatedAt = new Date().toISOString();
  persistIdeas();
}

function deleteIdea(id) {
  state.ideas = state.ideas.filter((i) => i.id !== id);
  persistIdeas();
}

async function exportIdeas() {
  if (state.ideas.length === 0) {
    setStatus(el.settingsStatus, "No ideas to export.");
    return;
  }

  const payload = {
    app: "eureka-super",
    exportedAt: new Date().toISOString(),
    count: state.ideas.length,
    ideas: state.ideas,
  };

  const passphrase = window.prompt("Optional: enter passphrase for encrypted export (leave blank for plain JSON)", "");
  if (passphrase === null) return;

  if (passphrase.trim()) {
    if (!(await isCryptoReady())) {
      setStatus(el.settingsStatus, "Encryption unavailable in this browser.");
      return;
    }
    const encrypted = await encryptJson(payload, passphrase.trim());
    downloadFile(`eureka-super-export-secure-${Date.now()}.json`, JSON.stringify(encrypted, null, 2), "application/json");
    setStatus(el.settingsStatus, "Encrypted export created.");
    return;
  }

  downloadFile(`eureka-super-export-${Date.now()}.json`, JSON.stringify(payload, null, 2), "application/json");
  setStatus(el.settingsStatus, "Export created.");
}

function bindEvents() {
  el.nav.forEach((btn) => {
    btn.addEventListener("click", () => {
      const dest = btn.dataset.nav;
      if (dest === "stats" && !state.settings.advancedMode) return;
      showView(dest);
      if (dest === "ideas") renderIdeas();
    });
  });

  el.saveBtn.addEventListener("click", saveIdea);
  el.goIdeasBtn.addEventListener("click", () => {
    showView("ideas");
    renderIdeas();
  });

  el.titleInput.addEventListener("input", () => {
    const error = validateTitle(el.titleInput.value);
    el.titleError.hidden = !error;
    el.titleError.textContent = error;
  });

  el.searchInput.addEventListener("input", (e) => {
    state.search = e.target.value || "";
    renderIdeas();
  });

  el.sortSelect.addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderIdeas();
  });

  el.ideasList.addEventListener("click", (e) => {
    const target = e.target.closest("button[data-act]");
    if (!target) return;
    const id = target.dataset.id;
    const act = target.dataset.act;
    if (act === "rename") renameIdea(id);
    if (act === "delete") deleteIdea(id);
  });

  el.advancedToggle.addEventListener("change", (e) => {
    state.settings.advancedMode = Boolean(e.target.checked);
    el.statsNav.hidden = !state.settings.advancedMode;
    saveSettings(state.settings);
    if (!state.settings.advancedMode && state.view === "stats") {
      showView("capture");
    }
  });

  el.exportBtn.addEventListener("click", () => {
    exportIdeas().catch(() => {
      setStatus(el.settingsStatus, "Export failed.");
    });
  });
}

function init() {
  el.advancedToggle.checked = Boolean(state.settings.advancedMode);
  el.statsNav.hidden = !state.settings.advancedMode;
  bindEvents();
  renderIdeas();
  showView("capture");

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

init();
