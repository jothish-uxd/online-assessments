# Design system

Online Assessments is built on the a11y-charts system: Geist, monochrome ink on white, true black in dark mode. State is shown with ink weight, rules and shape, never a brand color.

## Tokens (`src/styles/tokens.css`)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | #ffffff | #0a0a0a | Page and panel background |
| `--bg-subtle` | #fafafa | #111111 | Bars, badges, hover wash |
| `--bg-hover` | #f2f2f2 | #1a1a1a | Hover and selected rows |
| `--ink` | #171717 | #ededed | Text, primary button, active marks |
| `--ink-soft` | #666666 | #a1a1a1 | Secondary text |
| `--ink-faint` | #737373 | #8a8a8a | Labels, table headers |
| `--rule` | #ebebeb | #242424 | Hairlines |
| `--rule-strong` | #d4d4d4 | #3a3a3a | Control borders, frame edge |
| `--focus` | #0068d6 | #52a8ff | Focus ring only |
| `--on-ink` | #ffffff | #0a0a0a | Text on solid ink |

Type: Geist 400/500/600 for everything; Geist Mono for IDs, addresses, kickers and badges. Body 15px/1.6. Page title 32–44px, weight 600, letter-spacing −0.045em; hero title 44–72px, −0.055em.

Theme follows the OS until the person picks one with the header toggle (stored in `localStorage` as `oa-theme`).

## Components

### BrowserFrame

`src/components/BrowserFrame.tsx` and `src/styles/browser-frame.css`.

A plain browser window for presenting an app inside a page: a product demo, a prototype, a case study. The app inside reads as the product, the page around it as the story.

```tsx
import BrowserFrame, { useFrameHistory } from './components/BrowserFrame';

function Demo() {
  const { pathname, nav, menuOpen, setMenuOpen, scrollRef } = useFrameHistory();
  return (
    <BrowserFrame.Stage>
      <BrowserFrame
        host="onlineassessments.app"
        path={pathname}
        nav={nav}
        menu={{ open: menuOpen, onToggle: () => setMenuOpen((o) => !o), controls: 'sidebar' }}
        end={<Avatar />}
      >
        <div className="my-app">…</div>
      </BrowserFrame>
    </BrowserFrame.Stage>
  );
}
```

| Prop | What it does |
| --- | --- |
| `path` | Shown after the host in the address bar |
| `host` | Address host, default `onlineassessments.app` |
| `nav` | Back / Forward buttons; `useFrameHistory()` supplies one |
| `menu` | Menu button for small screens; `controls` is the id of the panel it opens |
| `end` | Right end of the bar, such as an avatar |

Rules:

- **Fill the viewport.** `BrowserFrame.Stage` sizes the frame to the height under the site header. The page itself never scrolls; the app's own regions scroll inside the frame.
- **90% on wide screens.** From 1280px up, the frame takes 90% of the width and 90% of the height under the header, centered, so it reads as a framed product with even space around it. Below 1280px it fills the space with a 16px gutter (8px under 520px), because room inside matters more there.
- **Everything stays inside.** Back and Forward only move through pages visited in the frame, so Back never leaves it. Panels opened from the bar (like the small-screen menu) render inside the frame body, which is the positioning context.
- **Keep the bar quiet.** The window dots are decoration and hidden from assistive tech. Back, Forward and Menu are real buttons with names; the address is read-only text.
- **Small screens.** Below 960px the menu button appears; below 520px the dots and host hide so the path keeps its room.

Tunables: `--bframe-gutter` (below 1280px), `--bframe-radius`, `--bframe-bar-h`. The component reads only the shared tokens above, so it drops into any project that uses them.

### Select

`src/components/Select.tsx`, styles under "Select (custom dropdown)" in `src/styles/app.css`.

A custom dropdown that replaces the native `<select>`, following the WAI-ARIA select-only combobox pattern. It matches the other fields: same height, border and radius.

```tsx
import Select from './components/Select';

<Select
  label="Metric"
  value={metric}
  onChange={setMetric}
  options={[
    { value: 'Precision', label: 'Precision' },
    { value: 'Recall', label: 'Recall' },
  ]}
  describedBy="metric-help"
/>
```

| Prop | What it does |
| --- | --- |
| `label` | Visible label; also the accessible name |
| `value`, `onChange` | Controlled value (string or number) |
| `options` | `{ value, label }` list |
| `describedBy` | id of help text that describes the field |
| `inline` | Label beside the button instead of above it |
| `hideLabel` | Keep the label for screen readers only, for compact fields whose context already names them (a status inside a policy match) |
| `className` | Extra classes, e.g. `select--wide` for a 240px minimum |

Rules:

- **Looks like a field, opens like a menu.** Chevron sits 14px from the right edge and flips when open. The list floats 6px below with an 8px radius and soft shadow; the active option has a `--bg-hover` wash, the chosen one is weight 500 with a check.
- **Never clipped.** Near the bottom of its scrolling area (the nearest `[data-scroll]` or `.app-main`), the list opens upward. Long lists scroll at 280px.
- **Focus stays on the button.** The open list is announced through `aria-activedescendant`, so screen readers hear "Metric, Precision" and each option as you move.
- **Keyboard.** Enter, Space or the arrow keys open it. Up/Down, Home/End and Page Up/Down move. Typing jumps to a matching option. Enter or Space chooses, Escape closes without changing, Tab chooses and moves on.
- **High contrast.** In forced-colors mode the active option gets a system Highlight outline.

## App shell

Each app tab is a `BrowserFrame` under its own host (`content.onlineassessments.app`, `assess.…`, `hire.…`, `proctor.…`), so every tab reads as a separate product. Inside the frame: `.app-body` (240px `.sidebar` + `.app-main`, which scrolls). An app that isn't built yet uses `ComingSoonApp`: a ghost of the sidebar and toolbar behind a centered "Coming soon" note. Replace it with the real app when it's ready; the frame and host stay.

Shared with Cipher Lab (`jothish-uxd/cipher-lab`), where these components started.
