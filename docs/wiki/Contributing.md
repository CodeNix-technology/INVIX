# Contributing

Thanks for your interest in contributing to Invix!

## Ways to Contribute

- Report bugs
- Suggest features/improvements
- Improve documentation/wiki
- Fix issues and submit pull requests
- Improve UI/UX, accessibility, performance, or tests

## Development Setup

```bash
git clone https://github.com/CodeNix-technology/INVIX.git
cd INVIX
npm install
npm run dev
```

## Branch & PR Workflow

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feat/short-description
   ```
3. Make focused changes.
4. Run checks:
   ```bash
   npm run build
   ```
5. Commit with clear messages.
6. Open a Pull Request with:
   - What changed
   - Why
   - Screenshots/video for UI changes
   - Testing notes

## Code Guidelines

- Follow existing project structure and naming conventions.
- Keep changes small and focused.
- Preserve local-first/offline behavior unless intentionally changing it.
- Do not commit secrets (`.env.local`, keys, tokens).
- For UI changes, test both light and dark modes and mobile layouts.
- For template/export changes, verify preview, PDF, PNG, and print.

## Commit Message Style (Recommended)

Use conventional-style prefixes where possible:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `refactor:` refactor without behavior change
- `style:` formatting/UI-only changes
- `chore:` tooling/maintenance

## Reporting Bugs

Please include:

- Steps to reproduce
- Expected vs actual behavior
- Screenshots/screen recording
- Browser/OS/device
- Console errors (if any)

## Security

Do not open public issues for sensitive security vulnerabilities. Report privately to maintainers/owners first.
