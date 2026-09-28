# A9 Pro

Static PWA (Vite + vanilla TypeScript, no framework) documenting Asphalt 9 Legends mechanics with input diagrams, timed playback and a scored drill.

- Design: dark only, monochrome, system font, no decorative animation. The only motion is input playback and the timeline playhead.
- Content: one Markdown file per mechanic in `src/content/`, frontmatter defines the drill (see README).
- Input: keyboard events + Gamepad API polling in `src/input/`. Timestamps use the `performance.now()` clock.
- Scoring engine: `src/drill.ts`. Playback: `src/playback.ts`. Timeline strip: `src/timeline.ts`.
- Bindings in `src/mapping.ts` are placeholders until the user confirms the real in-game layout.
- `npm run build` runs `tsc` first; keep it clean.
