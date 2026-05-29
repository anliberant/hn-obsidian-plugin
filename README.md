# HN Reader for Obsidian

Browse [Hacker News](https://news.ycombinator.com) top stories directly inside Obsidian. Save interesting links to your reading list with one click.

## Features

- Browse **Top, New, Best, Ask HN, Show HN** feeds
- Open as a **sidebar panel** or a **new tab**
- **Save stories** to a reading list note with one click
- **Daily notes mode** — creates a new file per day with YAML frontmatter
- **Tags** — automatically append tags to every saved story
- Configurable number of stories (10 / 20 / 30 / 50)
- Respects Obsidian's light and dark themes

## Manual Installation

> The plugin is pending review for the official Obsidian community plugin list.
> Until then, install it manually in a few steps.

### Option 1 — Copy files manually

1. Download the latest release from the [Releases](https://github.com/anliberant/hn-obsidian-plugin/releases) page:
   - `main.js`
   - `manifest.json`
   - `styles.css`

2. In your vault, create the folder:
   ```
   <your-vault>/.obsidian/plugins/hn-reader/
   ```

3. Copy the three downloaded files into that folder.

4. In Obsidian go to **Settings → Community plugins**, disable **Restricted mode**, then find **HN Reader** in the list and enable it.

### Option 2 — BRAT (recommended for updates)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) is a plugin that lets you install and auto-update plugins that are not yet in the official list.

1. Install **BRAT** from the Obsidian community plugin list.
2. Open **Settings → BRAT → Add Beta Plugin**.
3. Paste this URL:
   ```
   https://github.com/anliberant/hn-obsidian-plugin
   ```
4. Click **Add Plugin** — BRAT will install it automatically.

## Settings

| Setting | Description |
|---|---|
| Display mode | Open in sidebar panel or new tab |
| Default feed | Feed shown when plugin opens (Top / New / Best / Ask / Show) |
| Stories per page | How many stories to load: 10, 20, 30, or 50 |
| Save mode | Single file or a new daily note per day |
| File path | Path to the reading list note (single file mode) |
| Daily notes folder | Folder for daily HN notes, named `YYYY-MM-DD-hn.md` |
| Add tags | Toggle to append tags to every saved story |
| Tags | Space-separated tags, e.g. `#hn #reading` |

## Usage

- Click the **HN icon** in the left ribbon to open the reader
- Use **Ctrl+P** → `Open HN Reader` to open via command palette
- Switch feeds with the **Top / New / Best / Ask / Show** buttons
- Click **🔖** next to any story to save it to your reading list
- Click **↻** to refresh stories

## Reading List format

**Single file mode:**
```markdown
# HN Reading List

- [ ] [Story title](https://example.com) | 312 pts | [HN](https://news.ycombinator.com/item?id=...) | 2026-05-28
```

**Daily note mode** (`HN/2026-05-28-hn.md`):
```markdown
---
date: 2026-05-28
tags: [hn, reading]
---

# HN Reading List 2026-05-28

- [ ] [Story title](https://example.com) | 312 pts | [HN](https://news.ycombinator.com/item?id=...) | 2026-05-28 #hn #reading
```

## License

MIT
