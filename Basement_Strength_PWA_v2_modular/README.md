# Basement Strength PWA v2

This is the modular long-term version of the app.

## Structure

- `index.html` — app shell
- `css/app.css` — shared visual styles
- `js/app.js` — app startup and screen wiring
- `js/db.js` — IndexedDB storage
- `js/workouts.js` — workout loading and cloning
- `js/coach.js` — body-status and day-context adaptations
- `js/progression.js` — progression recommendations
- `js/backup.js` — JSON and CSV import/export
- `js/ui.js` — shared UI helpers
- `data/workouts.json` — editable workout definitions
- `data/default-settings.json` — default preferences
- `sw.js` — offline cache
- `manifest.webmanifest` — installable app settings

## Updating on GitHub Pages

Upload the contents of this folder to the root of your GitHub repository.

Before every major update:

1. Open the app.
2. Go to Settings.
3. Select Backup app data.
4. Save the JSON backup.
5. Replace the deployed files.
6. Reopen the app.
7. Restore the backup only if the history does not remain.

## Data privacy

Workout records remain in IndexedDB on each device. GitHub hosts only the static app code and workout templates.

## Backward compatibility

The restore tool accepts the previous v1 JSON backup structure because completed workout records retain the same core fields.
