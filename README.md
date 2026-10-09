# Before the Last Day

A colorful, story-first 2D side-scrolling adventure about an ordinary morning at the edge of an extraordinary disaster.

## Play the prototype

The browser game uses Phaser 3.90 for its 2D game loop, Arcade Physics, camera, and input handling. `index.html` contains the page structure, `styles.css` styles the interface, and `game.js` defines the Phaser scene and Chapter 1 logic. Phaser is loaded from jsDelivr, so an internet connection is required when opening the game.

### Controls
- **Walk:** A / D or Left / Right arrows
- **Run:** hold Shift while moving
- **Jump:** Space, W, or Up arrow
- **Inspect nearby clues / continue dialogue:** E or Enter (Space also continues dialogue)
- **Touch devices:** use the on-screen controls; the return-arrow button inspects nearby clues when no dialogue is open

## Project structure

- `index.html` — accessible page structure and game overlays
- `styles.css` — responsive interface and touch-control styling
- `game.js` — Phaser scene, Arcade Physics, camera, movement, dialogue, and chapter flow
- `story/CHAPTER_01.md` — Chapter 1 story design

The code is intentionally split into separate files before expanding the game systems, making later gameplay, story, and UI changes easier to review and test.

## Current demo scope

- Story intro and controls screen
- Side-scrolling city environment with layered parallax scenery
- Acceleration-based movement, walk/run pacing, jump posing, and camera follow
- A more articulated original placeholder character with facing, arm/leg swing, breathing, and a backpack silhouette
- Detailed street furniture, shop awnings, streetlights, planters, drains, and a parked delivery van
- Optional environmental clues that can be inspected along the route
- Story dialogue and a chapter-end beat
- Responsive layout and touch controls

This is an early playable prototype, not the finished game. The current build is a visual/gameplay foundation for Chapter 1; the 100-chapter ambition is a long-term target, not content already implemented.

## Publish with GitHub Pages

A workflow is included at `.github/workflows/deploy.yml`. In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. Pushes to `main` should then trigger deployment. GitHub may take a few minutes to publish the first build.

Official guide: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Project principles

- Story and atmosphere first; no branching story decisions planned.
- Player movement is direct and readable, with cinematic dialogue at story beats.
- Original characters, setting, dialogue, and art direction; inspired by the broad feeling of finding meaning during an outbreak, not copying another series.
- Desktop first, with touch controls considered from the start.

## Roadmap

1. Validate movement and dialogue on desktop and mobile browsers.
2. Improve animation states and add original character/environment art.
3. Build a stronger Chapter 1 with scripted story events and a clear ending.
4. Add sound, accessibility settings, pause/restart, and save/checkpoint support.
5. Expand chapters only after the core loop feels good.
