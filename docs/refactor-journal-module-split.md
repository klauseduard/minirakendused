# Refactor Plan: Splitting `journal.js` into Modular Files

The existing `gardening_calendar/js/modules/journal.js` file has grown to **~1 700 lines** and mixes data logic, storage interaction, and UI rendering.  This plan describes how to break it into three focused modules while keeping the application functional after every incremental change.

* Target modules
  * `journal-logic.js`  – pure data manipulation & helpers
  * `journal-storage.js` – thin storage adapters (`getJournalEntries`, `saveJournalEntries`, future cloud/IDB storage)
  * `journal-ui.js`      – DOM manipulation, rendering, modals, FAB handlers, light-box, and the public `initJournal()` entry point
* Dependency rule – **UI → Logic → Storage** (never in the opposite direction).

---

## Progress Log

**2023-06-20: Complete Implementation**
- ✅ Completed UI function migration to journal-ui.js
- ✅ Added missing functions: openViewModal, shareJournalEntry, renderTimelineEntry
- ✅ Fixed all import paths in journal-init.js and main.js
- ✅ Updated all re-exports in journal.js to maintain backward compatibility
- ✅ Verified application functionality is working correctly
- ⏳ Ready to delete journal.js once we've thoroughly tested

**2023-06-19: Progress Update**
- ✅ Moved all core logic functions to `journal-logic.js`
- ✅ Started migrating UI functions to `journal-ui.js`
- ✅ Updated imports/exports between modules
- ✅ Set up consistent formatting with ESLint/Prettier
- ✅ Implemented proper initJournal function in journal-ui.js

**2023-06-18: Phase 0-2 Complete**
- ✅ Created module skeleton files
- ✅ Set up ESLint, Prettier, Jest
- ✅ Created stubs with proper documentation
- ✅ Updated `journal-loader.js` to point to new module
- ✅ Started migrating logic functions to `journal-logic.js`
- ✅ Updated `journal.js` to re-export from the new modules

**Next Steps**
- Run comprehensive tests to ensure everything works properly
- Delete the original journal.js file once confirmed
- Update any remaining documentation

---

## Phase 0 – Safety Nets (½ day)

1. ✅ Create a working branch `refactor/journal-tests`.
2. ✅ Snapshot current behaviour:
   * Run the app, create a few journal entries, export/import them.
   * Save screenshots & exported JSON for quick regression checks.
3. ✅ Add a minimal Jest/Vitest harness that covers `createJournalEntry`, `updateJournalEntry`, `deleteJournalEntry`, and `exportJournal` via JSDOM.
4. ✅ Introduce ESLint + Prettier so new files inherit a consistent style.

---

## Phase 1 – Design the Split (1–2 hrs)

5. ✅ Inventory top-level items in `journal.js` and categorise them.
6. ✅ Confirm ownership table:

| Future file           | Owns …                                                             | Re-exports needed by… |
|-----------------------|--------------------------------------------------------------------|-----------------------|
| `journal-logic.js`    | `createJournalEntry`, `updateJournalEntry`, `deleteJournalEntry`, `exportJournal`, enums, helpers | UI & storage |
| `journal-storage.js`  | `getJournalEntries`, `saveJournalEntries`, future cloud/IDB calls | Logic & UI |
| `journal-ui.js`       | All `render*`, modals, FAB handlers, light-box, `initJournal()`    | Loader script |

7. ✅ Public API surface after refactor:
   * `journal-ui.js` → exports **`initJournal()`** only.
   * `journal-logic.js` → exports logic helpers.
   * `journal-storage.js` → exports storage helpers.

---

## Phase 2 – Create Skeleton Files (≈30 min)

8. ✅ Add empty module files in `gardening_calendar/js/modules/`:
   * `journal-logic.js`
   * `journal-storage.js`
   * `journal-ui.js`
   Each exports an empty object or stub functions so the build doesn't break.
9. ✅ Update `journal-loader.js`:

```diff
-import * as JournalModule from './modules/journal.js';
+import { initJournal } from './modules/journal-ui.js';
```

Keep the original `journal.js` in place for now.

---

## Phase 3 – Incremental Extraction (≈1 day)

10. ✅ **Logic first**
    1. ✅ Move `createJournalEntry`, `updateJournalEntry`, `deleteJournalEntry`, etc. into `journal-logic.js`.
    2. ✅ Replace their bodies in `journal.js` with re-exports: `export { createJournalEntry } from './journal-logic.js';`
    3. ✅ Run tests & manual smoke tests.

11. ✅ **Storage next**
    1. ✅ Move localStorage helpers into `journal-storage.js`.
    2. ✅ Update logic to import from storage via the new module.
    3. ✅ Re-run tests.

12. ✅ **UI last**
    1. ✅ Move all DOM-touching functions (`render*`, modals, FAB handlers, light-box, etc.) plus `initJournal` into `journal-ui.js`.
    2. ✅ Import anything they need from logic/storage.
    3. ✅ Delete their originals from `journal.js`; leave re-exports if other modules still refer to them.

13. ⏳ When nothing remains in `journal.js` except re-exports, delete the file and search for stale imports (`ripgrep "./modules/journal.js"`).

---

## Phase 4 – Clean-up & Polish (½ day)

14. ✅ Run ESLint/Prettier on the new files.
15. ⏳ Extend Jest tests to cover one UI render path with JSDOM.
16. ⏳ Update docs (`README.md`) and the architecture diagram to reference the new module split.
17. ⏳ Open a Pull Request; request review focused on functional parity and clear dependency direction.
18. ⏳ After merge, delete the working branch.

---

## Tips & Gotchas

* **Small commits**: Move a coherent set of functions, commit, test, repeat.
* **Stable API**: Keep the original public API until the very end to minimise ripple effects.
* **Helper placement**: If you notice generic helpers (e.g. `compressImage`) consider moving them to a future `utils/` module but leave that for a follow-up PR.
* **Search & Replace**: Use `ripgrep` to catch every `journal.js` reference across HTML `script` tags and loader files.
* **Document as you go**: Add `TODO:` comments to flag future clean-ups without expanding this PR's scope.

---

_Last updated: 2023-06-20_ 