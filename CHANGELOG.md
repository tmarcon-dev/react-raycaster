# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- React 19 support (React 18 is still supported)
- Exported types: `RaycasterProps`, `Tiles`, `Tile`, `PlayerType`, `Inputs` and `Game`
- Canvas props (`className`, `onClick`…) are forwarded to the `<canvas>` element
- Clear `MapError` when the map uses a tile id missing from `tiles`
- Floor and ceiling textures of any size (power of two sizes were required)
- [Live demo](https://tmarcon-dev.github.io/react-raycaster/) of the latest version

### Changed

- **Breaking:** the UMD build is replaced by a CommonJS build, loading the package from a `<script>` tag is no longer supported
- **Breaking:** React is now a peer dependency, install it alongside the package
- `player` is only the initial position: re-rendering with new props no longer resets the game, only a change of `map` or `tiles` content does
- Changing `width` or `height` keeps the game state
- With both `skybox` and `ceiling`, the ceiling is now displayed (the skybox used to hide it)
- Transparent wall texture pixels show the skybox
- Joystick movement and camera rotation use `speed` and `rotSpeed` (camera rotation was hardcoded to 5, the default `rotSpeed` is 3)
- Mouse sensitivity no longer depends on the frame rate
- The `pointer` cursor is only applied when `mouse` is enabled, and `style` can override the default canvas styles
- About 2.8x faster rendering: walls, floor and ceiling are drawn in a single pixel buffer
- Smaller bundle: `react/jsx-runtime` is no longer bundled (35.8 kB to 14.7 kB)
- Packages are published with provenance from GitHub Actions

### Fixed

- Crash with `Maximum call stack size exceeded` on large maps, or when tile `1` is not a colliding wall
- Package entry points: `main` pointed to a missing file and `require` loaded an ES module
- `process.env` references left in the bundle, failing in environments without `process`
- Render loop restarting on every render
- Textures not displayed when tile ids were not `1, 2, 3…` in order
- Doors could stack timers when holding the action key, and kept running after unmount
- Lost mouse movements between two frames
- Arrow keys and space scrolling the page while playing
- Player kept moving after the window lost focus
- Black ceiling when `shading` is disabled
- Pixels from previous frames showing in untextured floor or ceiling areas
- Camera staying offset when disabling `bobbing` while moving
- `speed` default value in the documentation (10, not 20)
- Joystick example ignoring movements when one axis is exactly 0

## [0.1.1] - 2024-04-15

### Added

- Game object available from the `Raycaster` children function, with joystick methods:
  - `game.joystickMove(x, y)`
  - `game.joystickCamera(x)`

## [0.1.0] - 2024-03-25

### Added

- Camera rotation with the mouse (`mouse` prop)

### Changed

- Improved floor and ceiling shading

### Fixed

- Ceiling rendering
- Textures not loaded yet

## [0.0.4] - 2024-03-19

### Added

- Run animation (`bobbing` prop)

### Changed

- Inputs use key codes instead of key names

## [0.0.3] - 2024-03-08

### Added

- Customizable inputs (`inputs` prop)
- Custom resolution (`width` and `height` props) instead of a ray step divider

## [0.0.2] - 2024-03-08

### Added

- Error thrown when the map is not valid

### Fixed

- Movement speed no longer depends on the frame rate

## 0.0.1 - 2024-03-06

- Initial release

[Unreleased]: https://github.com/tmarcon-dev/react-raycaster/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/tmarcon-dev/react-raycaster/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/tmarcon-dev/react-raycaster/compare/v0.0.4...v0.1.0
[0.0.4]: https://github.com/tmarcon-dev/react-raycaster/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/tmarcon-dev/react-raycaster/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/tmarcon-dev/react-raycaster/releases/tag/v0.0.2
