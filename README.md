# Before the Last Day

A colorful, story-first 2D side-scrolling adventure about an ordinary morning at the edge of an extraordinary disaster.

## Play the prototype

The first browser prototype lives in `index.html` and uses plain HTML, CSS, and Canvas JavaScript. It requires no install, game engine, external assets, or build step.

### Controls
- **Move:** A / D or Left / Right arrows
- **Jump:** Space, W, or Up arrow
- **Continue story dialogue:** E, Enter, or Space
- **Touch devices:** use the on-screen controls

## Current demo scope

- Story intro and controls screen
- Side-scrolling city environment with layered parallax scenery
- Direct player movement, jumping, and camera follow
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
