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
var HN_BLOCK_HEADER = "## HN Reading List";
var FEEDS = [
  { type: "top", label: "Top" },
  { type: "new", label: "New" },
  { type: "best", label: "Best" },
  { type: "ask", label: "Ask" },
  { type: "show", label: "Show" }
];
var DEFAULT_SETTINGS = {
  displayMode: "sidebar",
  defaultFeed: "top",
  storiesCount: 30,
  readingListMode: "single",
  readingListPath: "HN Reading List.md",
  dailyNotesFolder: "Daily Notes",
  addTags: false,
  tags: "#hn #reading"
};
var HNReaderPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    (0, import_obsidian.addIcon)(
      "hn-logo",
      '<path fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" d="M18 15 50 53 82 15M50 53V87"/>'
    );
    this.registerView(VIEW_TYPE_HN, (leaf) => new HNReaderView(leaf, this));
    this.addRibbonIcon("hn-logo", "Open HN Reader", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-hn-reader",
      name: "Open HN Reader",
      callback: () => this.activateView()
    });
    this.addCommand({
      id: "open-hn-reader-tab",
      name: "Open HN Reader in new tab",
      callback: () => this.activateView("tab")
    });
    this.addCommand({
      id: "open-hn-reader-sidebar",
      name: "Open HN Reader in sidebar",
      callback: () => this.activateView("sidebar")
    });
    this.addCommand({
      id: "open-hn-reader-both",
      name: "Open HN Reader in sidebar and tab",
      callback: () => this.activateView("both")
    });
    this.addSettingTab(new HNReaderSettingTab(this.app, this));
  }
  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_HN);
  }
  async activateView(mode) {
    const { workspace } = this.app;
    const targetMode = mode != null ? mode : this.settings.displayMode;
    workspace.getLeavesOfType(VIEW_TYPE_HN).forEach((l) => l.detach());
    if (targetMode === "both") {
      const sidebarLeaf = workspace.getRightLeaf(false);
      await sidebarLeaf.setViewState({ type: VIEW_TYPE_HN, active: false });
      const tabLeaf = workspace.getLeaf("tab");
      await tabLeaf.setViewState({ type: VIEW_TYPE_HN, active: true });
      workspace.revealLeaf(tabLeaf);
    } else if (targetMode === "tab") {
      const leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_HN, active: true });
      workspace.revealLeaf(leaf);
    } else {
      const leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_HN, active: true });
      workspace.revealLeaf(leaf);
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // ---------------------------------------------------------------------------
  // Reading list
  // ---------------------------------------------------------------------------
  async saveToReadingList(story) {
    var _a, _b;
    const { vault } = this.app;
    const date = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA");
    const storyUrl = (_a = story.url) != null ? _a : getHnItemUrl(story.id);
    const hnUrl = getHnItemUrl(story.id);
    const tagSuffix = this.settings.addTags && this.settings.tags ? " " + this.settings.tags : "";
    const item = `- [ ] [${story.title}](${storyUrl}) | ${(_b = story.score) != null ? _b : 0} pts | [HN](${hnUrl}) | ${date}` + tagSuffix;
    const filePath = this.resolveReadingListPath(date);
    const existing = vault.getAbstractFileByPath(filePath);
    if (existing instanceof import_obsidian.TFile) {
      const content = await vault.read(existing);
      await vault.modify(existing, this.insertIntoBlock(content, item));
    } else {
      await this.ensureFolder(filePath);
      await vault.create(filePath, this.buildNewFile(date, item));
    }
    new import_obsidian.Notice(`Saved: ${story.title.slice(0, 50)}`);
  }
  /**
   * Returns the target file path for the current save-mode settings.
   * In daily mode files are named YYYY-MM-DD.md so they slot naturally
   * into an existing Daily Notes folder.
   */
  resolveReadingListPath(date) {
    if (this.settings.readingListMode === "daily") {
      const folder = this.settings.dailyNotesFolder.replace(/\/$/, "");
      return folder ? `${folder}/${date}.md` : `${date}.md`;
    }
    return this.settings.readingListPath;
  }
  /**
   * Inserts `item` into the HN Reading List block inside `content`.
   *
   * Rules:
   *  - If the block header exists anywhere in the file, the item is appended
   *    after the last list entry inside that block (before the next heading
   *    or end of file).
   *  - If there is no block, the block is appended at the very end.
   */
  insertIntoBlock(content, item) {
    const lines = content.split("\n");
    const headerIdx = lines.findIndex(
      (l) => l.trimEnd() === HN_BLOCK_HEADER
    );
    if (headerIdx === -1) {
      const tail = content.endsWith("\n") ? "" : "\n";
      return content + tail + "\n" + HN_BLOCK_HEADER + "\n\n" + item + "\n";
    }
    let blockEnd = lines.length;
    for (let i = headerIdx + 1; i < lines.length; i++) {
      if (/^#{1,6} /.test(lines[i])) {
        blockEnd = i;
        break;
      }
    }
    let insertAfter = headerIdx + 1;
    for (let i = headerIdx + 1; i < blockEnd; i++) {
      if (lines[i].startsWith("- ")) insertAfter = i + 1;
    }
    lines.splice(insertAfter, 0, item);
    return lines.join("\n");
  }
  /** Creates the initial file content when the target file does not yet exist. */
  buildNewFile(date, item) {
    if (this.settings.readingListMode === "daily") {
      const tagLine = this.settings.addTags && this.settings.tags ? `
tags: [${this.settings.tags.replace(/#/g, "").trim().split(/\s+/).join(", ")}]` : "";
      return `---
date: ${date}${tagLine}
---

${HN_BLOCK_HEADER}

${item}
`;
    }
    return `# HN Reading List

${item}
`;
  }
  async ensureFolder(filePath) {
    const parts = filePath.split("/");
    if (parts.length <= 1) return;
    const folder = parts.slice(0, -1).join("/");
    if (!this.app.vault.getAbstractFileByPath(folder)) {
      await this.app.vault.createFolder(folder);
    }
  }
};
var HNReaderView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.stories = [];
    this.isLoading = false;
    this.plugin = plugin;
    this.currentFeed = plugin.settings.defaultFeed;
  }
  getViewType() {
    return VIEW_TYPE_HN;
  }
  getDisplayText() {
    return "HN Reader";
  }
  getIcon() {
    return "hn-logo";
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
    refreshBtn.innerHTML = "&#x21BB;";
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
      const count = this.plugin.settings.storiesCount;
      const ids = await getFeedIds(this.currentFeed);
      this.stories = await getStories(ids.slice(0, count));
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
      (0, import_obsidian.setIcon)(saveBtn, "bookmark");
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
    containerEl.createEl("h2", { text: "Display" });
    new import_obsidian.Setting(containerEl).setName("Display mode").setDesc("Where to open HN Reader by default").addDropdown(
      (dd) => dd.addOption("sidebar", "Sidebar panel").addOption("tab", "New tab").addOption("both", "Sidebar + tab").setValue(this.plugin.settings.displayMode).onChange(async (value) => {
        this.plugin.settings.displayMode = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Default feed").setDesc("Feed shown when plugin opens").addDropdown(
      (dd) => dd.addOption("top", "Top").addOption("new", "New").addOption("best", "Best").addOption("ask", "Ask HN").addOption("show", "Show HN").addOption("jobs", "Jobs").setValue(this.plugin.settings.defaultFeed).onChange(async (value) => {
        this.plugin.settings.defaultFeed = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Stories per page").setDesc("How many stories to load at once").addDropdown(
      (dd) => dd.addOption("10", "10").addOption("20", "20").addOption("30", "30").addOption("50", "50").setValue(String(this.plugin.settings.storiesCount)).onChange(async (value) => {
        this.plugin.settings.storiesCount = Number(value);
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h2", { text: "Reading List" });
    new import_obsidian.Setting(containerEl).setName("Save mode").setDesc("Single file or append to daily notes").addDropdown(
      (dd) => dd.addOption("single", "Single file").addOption("daily", "Daily note").setValue(this.plugin.settings.readingListMode).onChange(async (value) => {
        this.plugin.settings.readingListMode = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.readingListMode === "single") {
      new import_obsidian.Setting(containerEl).setName("File path").setDesc("Path to the reading list note (e.g. Reading/HN List.md)").addText(
        (text) => text.setPlaceholder("HN Reading List.md").setValue(this.plugin.settings.readingListPath).onChange(async (value) => {
          this.plugin.settings.readingListPath = value.trim() || DEFAULT_SETTINGS.readingListPath;
          await this.plugin.saveSettings();
        })
      );
    } else {
      new import_obsidian.Setting(containerEl).setName("Daily notes folder").setDesc(
        'Folder where your daily notes live (e.g. Daily Notes or Journal). Stories are saved into YYYY-MM-DD.md files. If the file already exists, a "## HN Reading List" block is created or updated automatically \u2014 even if the block is not at the end.'
      ).addText(
        (text) => text.setPlaceholder("Daily Notes").setValue(this.plugin.settings.dailyNotesFolder).onChange(async (value) => {
          this.plugin.settings.dailyNotesFolder = value.trim();
          await this.plugin.saveSettings();
        })
      );
    }
    containerEl.createEl("h2", { text: "Tags" });
    new import_obsidian.Setting(containerEl).setName("Add tags to saved stories").setDesc("Append tags to each saved story line").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.addTags).onChange(async (value) => {
        this.plugin.settings.addTags = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.addTags) {
      new import_obsidian.Setting(containerEl).setName("Tags").setDesc("Space-separated tags (e.g. #hn #reading #tech)").addText(
        (text) => text.setPlaceholder("#hn #reading").setValue(this.plugin.settings.tags).onChange(async (value) => {
          this.plugin.settings.tags = value.trim();
          await this.plugin.saveSettings();
        })
      );
    }
  }
};
