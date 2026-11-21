# Deployment

Invix is a Vite + React static app (SPA) that can be deployed to most static hosting providers.

## Build

```bash
npm install
npm run build
npm run preview
```

Build output: `dist/`

## Vercel

1. Import the GitHub repository.
2. Framework preset: **Vite**.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables (if using Supabase):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy.

## Netlify

1. Import the GitHub repository.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables (if using Supabase).
5. Deploy.

## SPA Routing

Because Invix uses client-side routing, configure your host to redirect all routes to `index.html`.

### Netlify example (`public/_redirects`)

```text
/* /index.html 200
```

### Vercel

Vercel usually handles Vite SPA routing well; add rewrites if needed.

## PWA Notes

- App includes manifest/service worker assets in `public/`.
- Test installability/offline behavior after deployment.
- If you change caching behavior, bump service worker/cache version appropriately.

## Supabase Production Checklist

- Set production redirect URLs in Supabase Auth.
- Add production domain to allowed origins/config as needed.
- Confirm RLS policies are correct.
- Never expose service role key in frontend.
- Configure storage bucket policies.
- Run and verify `supabase/schema.sql`.
