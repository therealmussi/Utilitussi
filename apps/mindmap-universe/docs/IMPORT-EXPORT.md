# IMPORT-EXPORT

## Import sources

| Source | How | Notes |
| --- | --- | --- |
| Pasted text | Import Center → Paste text | Keyword extraction + sentence support per concept |
| Web URL | Import Center → Web URL | Requires a configured extraction service/backend; otherwise a manual paste fallback is offered (never silently skipped) |
| Documents | Upload `.pdf` `.txt` `.md` `.csv` `.docx` | PDF: raw text-object extraction; DOCX: `<w:t>` text runs; images: guidance note (vision model can enrich via AI settings) |

Every import lands in a **review stage** first: per-concept checkbox, editable title, visible supporting text, select all/none, then "Import N concepts". Nothing touches the graph before explicit confirmation. Importing from a URL/document also creates a source entry (origin: `import`) in the Research Library.

## Export

| What | Where | Format |
| --- | --- | --- |
| Current universe | Settings → Export current universe | JSON (portable envelope, see `DATA-FORMAT.md`) |
| Full backup | Settings → Full backup | JSON (all universes) |
| Direct read backup | Settings → Backup (direct read) | JSON straight from IndexedDB |
| Single mind map | Mind map editor → Export | PNG / SVG / JSON / PDF (print) |

## Restore

- **Import universe JSON** — additive; ids preserved; good for moving between universes or browsers.
- **Restore full backup** — destructive (wipes all universes first), explicit, confirmation via its own file input.

Both reject invalid files with a visible notice; a failed import never leaves the database half-written (`bulkPut` runs after validation, and validation is synchronous).
