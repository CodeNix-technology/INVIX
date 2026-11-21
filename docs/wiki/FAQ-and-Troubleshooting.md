# FAQ & Troubleshooting

## General

### Does Invix require login?
No. Invix works in local/offline guest mode without sign-in. Supabase auth/sync is optional.

### Where is data stored in guest mode?
In the browser’s IndexedDB (local workspace on that device/browser profile).

### Is Invix open source?
Yes. Invix is licensed under MIT. See [LICENSE](../../LICENSE).

## Setup Issues

### `npm run dev` works but app shows blank/errors
- Check browser console for errors.
- Ensure Node.js 18+ is installed.
- Delete `node_modules` and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  npm run dev
  ```

### Supabase not connecting
- Confirm `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Restart dev server after env changes.
- Verify schema was run in Supabase SQL Editor.
- Check browser network/console for Supabase errors.

## PDF / Export Issues

### PDF looks different from preview
- Verify template styles and print/export CSS.
- Test with simpler content to isolate layout issues.
- Check browser console during export.
- Confirm fonts/assets are loaded.

### Export fails or blank PDF
- Check console errors.
- Try again after page fully loads.
- Verify the invoice has renderable content.
- If custom template changes were made, test with a built-in template.

## PWA / Offline

### App not installing as PWA
- Ensure you’re on HTTPS (or localhost).
- Confirm manifest and service worker are loading.
- Check browser Application/DevTools panel for PWA warnings.

### Old version still showing
- Hard refresh / clear site data/service worker cache.
- PWA cache version may need bumping after major changes.

## GitHub / Push Issues

### `Permission denied` when pushing
- Ensure your GitHub account has write access to the repo.
- Confirm SSH key is added to the correct account.
- Test SSH:
  ```bash
  ssh -T git@github.com
  ```

### Remote has unrelated history
If remote has only an initial placeholder commit and you want to replace it:
```bash
git push --force-with-lease -u origin main
```
Use force push carefully.

## Where to get help

- Open a GitHub issue: https://github.com/CodeNix-technology/INVIX/issues
- Read the README and wiki docs in this repository
