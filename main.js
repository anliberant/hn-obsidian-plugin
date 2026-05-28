var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => HNReaderPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// ../hn-core/src/index.ts
var BASE_URL = "https://hacker-news.firebaseio.com/v0";
var cache = /* @__PURE__ */ new Map();
var CACHE_DURATION = 5 * 60 * 1e3;
async function fetchWithCache(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}
var FEED_ENDPOINTS = {
  top: "topstories",
  best: "beststories",
  new: "newstories",
  ask: "askstories",
  show: "showstories",
  jobs: "jobstories"
};
async function getFeedIds(type) {
  return fetchWithCache(`${BASE_URL}/${FEED_ENDPOINTS[type]}.json`);
}
async function getStory(id) {
  try {
    return await fetchWithCache(`${BASE_URL}/item/${id}.json`);
  } catch (e) {
    return null;
  }
}
async function getStories(ids, includeDead = false) {
  const items = await Promise.all(ids.map((id) => getStory(id)));
  return items.filter(
    (item) => item !== null && !item.deleted && (includeDead || !item.dead) && ["story", "job", "poll"].includes(item.type)
  );
}
function getHnItemUrl(id) {
  return `https://news.ycombinator.com/item?id=${id}`;
}
function formatTime(timestamp) {
  const diff = Date.now() / 1e3 - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}
function extractDomain(url) {
  if (!url) return "news.ycombinator.com";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return "news.ycombinator.com";
  }
}
function clearCache() {
  cache.clear();
}

// src/main.ts
var VIEW_TYPE_HN = "hn-reader-view";
var FEEDS = [
  { type: "top", label: "Top" },
  { type: "new", label: "New" },
  { type: "best", label: "Best" },
  { type: "ask", label: "Ask" },
  { type: "show", label: "Show" }
];
var DEFAULT_SETTINGS = {
  readingListPath: "HN Reading List.md"
};
var HNReaderPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_HN, (leaf) => new HNReaderView(leaf, this));
    this.addRibbonIcon("newspaper", "Open HN Reader", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-hn-reader",
      name: "Open HN Reader",
      callback: () => this.activateView()
    });
    this.addSettingTab(new HNReaderSettingTab(this.app, this));
  }
  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_HN);
  }
  async activateView() {
    const { workspace } = this.app;
    let [leaf] = workspace.getLeavesOfType(VIEW_TYPE_HN);
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_HN, active: true });
    }
    workspace.revealLeaf(leaf);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  /**
   * Appends a story to the Reading List note.
   * Creates the note with a header if it does not exist yet.
   */
  async saveToReadingList(story) {
    var _a, _b;
    const { vault } = this.app;
    const filePath = this.settings.readingListPath;
    const date = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA");
    const storyUrl = (_a = story.url) != null ? _a : getHnItemUrl(story.id);
    const hnUrl = getHnItemUrl(story.id);
    const line = `- [ ] [${story.title}](${storyUrl}) | ${(_b = story.score) != null ? _b : 0} pts | [HN thread](${hnUrl}) | ${date}
`;
    const existing = vault.getAbstractFileByPath(filePath);
    if (existing instanceof import_obsidian.TFile) {
      const content = await vault.read(existing);
      await vault.modify(existing, content + line);
    } else {
      await vault.create(filePath, `# HN Reading List

${line}`);
    }
    new import_obsidian.Notice(`Saved: ${story.title.slice(0, 50)}`);
  }
};
var HNReaderView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.currentFeed = "top";
    this.stories = [];
    this.isLoading = false;
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_HN;
  }
  getDisplayText() {
    return "HN Reader";
  }
  getIcon() {
    return "newspaper";
  }
  async onOpen() {
    this.buildShell();
    await this.loadStories();
  }
  async onClose() {
  }
  // -- Shell ------------------------------------------------------------------
  buildShell() {
    const root = this.contentEl;
    root.empty();
    root.addClass("hn-reader-container");
    const header = root.createDiv("hn-reader-header");
    header.createEl("span", { text: "Hacker News", cls: "hn-reader-title" });
    const refreshBtn = header.createEl("button", {
      cls: "hn-reader-refresh",
      attr: { "aria-label": "Refresh" }
    });
    refreshBtn.setText("\u21BB");
    refreshBtn.addEventListener("click", () => {
      clearCache();
      this.loadStories();
    });
    const feedBar = root.createDiv("hn-reader-feed-bar");
    for (const { type, label } of FEEDS) {
      const btn = feedBar.createEl("button", {
        text: label,
        cls: "hn-reader-feed-btn"
      });
      if (type === this.currentFeed) btn.addClass("active");
      btn.addEventListener("click", () => {
        if (this.currentFeed === type) return;
        this.currentFeed = type;
        feedBar.querySelectorAll(".hn-reader-feed-btn").forEach((b) => b.removeClass("active"));
        btn.addClass("active");
        this.loadStories();
      });
    }
    root.createDiv("hn-reader-stories");
  }
  // -- Data loading -----------------------------------------------------------
  async loadStories() {
    if (this.isLoading) return;
    this.isLoading = true;
    const storiesEl = this.contentEl.querySelector(".hn-reader-stories");
    if (!storiesEl) return;
    storiesEl.empty();
    storiesEl.createDiv("hn-reader-loading").setText("Loading stories...");
    try {
      const ids = await getFeedIds(this.currentFeed);
      this.stories = await getStories(ids.slice(0, 30));
      storiesEl.empty();
      if (this.stories.length === 0) {
        storiesEl.createDiv("hn-reader-empty").setText("No stories found.");
        return;
      }
      this.renderStories(storiesEl);
    } catch (e) {
      storiesEl.empty();
      storiesEl.createDiv("hn-reader-error").setText("Failed to load stories. Check your internet connection.");
    } finally {
      this.isLoading = false;
    }
  }
  // -- Render -----------------------------------------------------------------
  renderStories(container) {
    this.stories.forEach((story, i) => {
      var _a, _b;
      const item = container.createDiv("hn-reader-item");
      item.createEl("span", { text: String(i + 1), cls: "hn-reader-rank" });
      const content = item.createDiv("hn-reader-content");
      const titleLink = content.createEl("a", {
        text: story.title,
        cls: "hn-reader-story-title",
        href: (_a = story.url) != null ? _a : getHnItemUrl(story.id)
      });
      titleLink.setAttr("target", "_blank");
      titleLink.setAttr("rel", "noopener noreferrer");
      const meta = content.createDiv("hn-reader-meta");
      meta.createEl("span", {
        text: `${(_b = story.score) != null ? _b : 0} pts`,
        cls: "hn-reader-score"
      });
      meta.createEl("span", { text: "\xB7", cls: "hn-reader-sep" });
      meta.createEl("span", { text: extractDomain(story.url) });
      meta.createEl("span", { text: "\xB7", cls: "hn-reader-sep" });
      meta.createEl("span", { text: formatTime(story.time) });
      if (story.descendants !== void 0) {
        meta.createEl("span", { text: "\xB7", cls: "hn-reader-sep" });
        const commentsLink = meta.createEl("a", {
          text: `${story.descendants} comments`,
          cls: "hn-reader-comments",
          href: getHnItemUrl(story.id)
        });
        commentsLink.setAttr("target", "_blank");
        commentsLink.setAttr("rel", "noopener noreferrer");
      }
      const saveBtn = item.createEl("button", {
        cls: "hn-reader-save-btn",
        attr: { "aria-label": "Save to Reading List" }
      });
      saveBtn.setText("\u{1F516}");
      saveBtn.addEventListener("click", async () => {
        await this.plugin.saveToReadingList(story);
        saveBtn.addClass("saved");
      });
    });
  }
};
var HNReaderSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "HN Reader Settings" });
    new import_obsidian.Setting(containerEl).setName("Reading List note").setDesc(
      "Path to the note where saved stories will be appended (e.g. HN Reading List.md or folder/HN.md)"
    ).addText(
      (text) => text.setPlaceholder("HN Reading List.md").setValue(this.plugin.settings.readingListPath).onChange(async (value) => {
        this.plugin.settings.readingListPath = value.trim() || DEFAULT_SETTINGS.readingListPath;
        await this.plugin.saveSettings();
      })
    );
  }
};
