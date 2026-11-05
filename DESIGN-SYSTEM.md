# Design system

This app uses **Enterprise Library** (`@jothish-uxd/enterprise-library`), Sleepy's single design system: tokens, components and patterns.

- Docs: https://jothish-uxd.github.io/enterprise-library/
- Source and rules: https://github.com/jothish-uxd/enterprise-library (`DESIGN-SYSTEM.md`)

The shared stylesheet is imported first in `src/main.tsx`, and BrowserFrame, Select, StatFilter, HoverCard and ResetButton are imported from the package. Don't copy or fix a shared component here: change it in enterprise-library, release a new version, then bump the version in `package.json`.

Styles in `src/styles/` are this app's own screens only.
