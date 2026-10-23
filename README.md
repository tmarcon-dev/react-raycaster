[![banner](https://github.com/tmarcon-dev/react-raycaster/blob/main/docs/thumbnail.png?raw=true)](https://thais-marcon.com/raycasting)

# React Raycaster (react-raycaster)
[![NPM Version](https://img.shields.io/npm/v/react-raycaster)](https://www.npmjs.com/package/react-raycaster)

A fully customizable raycaster game engine as a React component.

Check out a cool example [here](https://thais-marcon.com/raycasting) or the [live demo of the latest version](https://tmarcon-dev.github.io/react-raycaster/).

## Installation

```shell
npm install react-raycaster
```

or

```shell
yarn add react-raycaster
```

Requires React 18 or 19.

## How to use

```jsx
import Raycaster from "react-raycaster";

// ...

const map = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const tiles = {
  1: {
    type: "wall",
    src: "https://raw.githubusercontent.com/tmarcon-dev/react-raycaster/main/example/src/assets/tex/oak_planks.png",
    collision: true,
  },
  2: {
    type: "sprite",
    src: "https://raw.githubusercontent.com/tmarcon-dev/react-raycaster/main/example/src/assets/tex/barrel.png",
    collision: true,
  },
  3: {
    type: "door",
    src: "https://raw.githubusercontent.com/tmarcon-dev/react-raycaster/main/example/src/assets/tex/wood.png",
    collision: true,
  },
}

<Raycaster
  map={map}
  tiles={tiles}
  player={{
    x: 5,
    y: 17,
    rotation: -90
  }}
/>
```

### Using the game context

```jsx
import Raycaster from "react-raycaster";
import { Joystick } from 'react-joystick-component';

// ...

<Raycaster
  map={map}
  tiles={tiles}
  player={player}
>
  {g =>
    <>
      <Joystick
        move={(e) => g.move(e.x ?? 0, e.y ?? 0)}
        stop={() => g.move(0, 0)} />

      <Joystick
        move={(e) => g.turn(e.x ?? 0)}
        stop={() => g.turn(0)} />
    </>
  }
</Raycaster>
```

### Sharing the game

`RaycasterProvider` shares the game of the `Raycaster` inside it with any component below, which reads it with `useRaycaster()`. Components can then be placed anywhere in the page, outside of the `Raycaster` children:

```jsx
import Raycaster, { Minimap, RaycasterProvider, useRaycaster } from "react-raycaster";

function Compass() {
  const game = useRaycaster() // null until the Raycaster has created the game
  // ...
}

<RaycasterProvider>
  <Raycaster map={map} tiles={tiles} player={player} />
  <aside>
    <Minimap />
    <Compass />
  </aside>
</RaycasterProvider>
```

`useRaycaster()` also works in the `Raycaster` children without a provider. A provider holds the game of a single `Raycaster`, use one provider per game.

### Minimap

`Minimap` draws a top-down view of the map with the player, its field of view and the doors, from the game of the nearest `Raycaster` or `RaycasterProvider`. Tiles take the average color of their texture by default.

```jsx
<Minimap
  cellSize={8}
  colors={{ player: "red", tiles: { 1: "#555" } }}
  onCellClick={(x, y) => setPlayer(p => ({ ...p, x, y }))}
  style={{ width: 300 }}
/>
```

The canvas is `cellSize` pixels per map cell and can be resized with CSS, keep its aspect ratio so clicks land on the right cell. Other props are forwarded to the `<canvas>` element.

### Custom controls

`controls={false}` disables the built-in keyboard and mouse controls. There are two ways to move the player yourself:

- **Inputs**: call `move`, `turn`, `look` and `interact` from the game context, from any source (gamepad, touch, AI, scripted paths…). The component still handles collisions, doors and bobbing.
- **Positions**: change the `player` values to move the player anywhere, the component only renders it. Positions outside the map, inside a wall or in an area not enclosed by walls are ignored with a console warning.

`onPlayerChange` is called with the new position whenever the player moves by itself (built-in controls or inputs). Keep your `player` state in sync with it, so setting a position always moves the player, even one it was given before:

```jsx
const [player, setPlayer] = useState({ x: 5, y: 17, rotation: -90 })

<RaycasterProvider>
  <Raycaster
    map={map}
    tiles={tiles}
    player={player}
    onPlayerChange={setPlayer}
    controls={false}
  />
  <MyControls /> {/* const game = useRaycaster() */}
</RaycasterProvider>

// Inputs, applied every frame with collisions until set back to 0
game.move(0, 1) // Forward
game.turn(-1)   // Turn left

// One-off inputs
game.look(e.movementX, e.movementY) // Mouse camera, e.g. in a pointer locked mousemove listener
lockPointer(canvas)                 // Locks the pointer with raw mouse input when supported, avoids camera jumps

// In keydown listeners, leave keys typed in form fields or pressed on focused buttons to the page
if (isFormKey(e)) return
game.interact()                     // Opens the door in front of the player

// Teleport
setPlayer({ x: 5, y: 17, rotation: -90 })
```

See the [custom controls demo](https://tmarcon-dev.github.io/react-raycaster/custom-controls.html) and its [source](example/src/CustomControls.tsx): the keyboard and the pointer locked mouse are handled by the page, and clicking the minimap teleports the player.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `map` | `number[][]` | **required** | 2D map array containing tiles |
| `tiles` | `Tiles` | **required** | Map tiles definition (See below) |
| `player` | `Player` | **required** | Player position and rotation, changing its values moves the player |
| `controls` | `boolean` | `true` | Enables the built-in keyboard and mouse controls |
| `onPlayerChange` | `(player: Player) => void` | `none` | Called with the new position when the player moves by itself, not when the `player` values change |
| `mouse` | `boolean` | `false` | Allows mouse camera rotation |
| `inputs` | `Inputs` | (See below) | Keyboard controls |
| `width` | `number` | `500` | Game x resolution in pixels |
| `height` | `number` | `300` | Game y resulition in pixels |
| `shading` | `boolean` | `true` | Allows depth shading |
| `bobbing` | `boolean` | `true` | Enables run animation |
| `showFPS` | `boolean` | `false` | Displays frames per second |
| `skybox` | `string` | `none` | Source from the skybox to display |
| `floor` | `string` | `none` | Source from the floor to display |
| `ceiling` | `string` | `none` | Source from the ceiling to display |
| `speed` | `number` | `10` | Sets movement speed |
| `rotSpeed` | `number` | `3` | Sets the rotation speed |

## Minimap props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `cellSize` | `number` | `8` | Canvas pixels per map cell |
| `colors` | `MinimapColors` | (See below) | Colors of the minimap |
| `onCellClick` | `(x: number, y: number) => void` | `none` | Called with the clicked cell, in the same format as the `player` position. Hovered cells are outlined when set |

## Game context

The game is passed to the `Raycaster` children and returned by `useRaycaster()`.


| Method | Description |
| --- | --- |
| `move(x: number, y: number)` | Movement input between `-1` and `1`: `x` strafes right, `y` moves forward. Applied every frame with collisions until set back to `0` |
| `turn(x: number)` | Rotation input between `-1` and `1`, positive values turn right |
| `look(x: number, y: number)` | Camera input in pixels of mouse movement, same sensitivity as the `mouse` prop: `x` turns right, `y` looks down |
| `interact()` | Opens the doors in front of the player, like the action key |
| `getPlayer()` | Returns the current position and rotation, in the same format as the `player` prop |
| `joystickMove(x: number, y: number)` | Deprecated, use `move` |
| `joystickCamera(x: number)` | Deprecated, use `turn` |
| `openDoor(x: number, y: number)` | Opens the door at the given map position |

## Types

### Tiles

| Name | Type | Default | Description | 
|---|---|---|---|
| `[number]`| `Tile` | **required** | The tile identified by a number |

### Tile

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | `"wall" \| "sprite" \| "door" ` | **required** | Type of the tile |
| `src` | `string` | **required** | Source image of the tile |
| `collision` | `boolean` | `false` | Player collision against the tile |

### Player

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `x` | `number` | **required** | Player x value on map |
| `y` | `number` | **required** | Player y value on map |
| `rotation` | `number` | `0` | Player rotation in degree, `0` looks toward the first row of the map, `90` toward the last column |

### MinimapColors

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `floor` | `string` | `"#1d1d1d"` | Background and empty cells |
| `player` | `string` | `"#e33"` | Player dot |
| `view` | `string` | `"rgba(255, 255, 255, 0.15)"` | Field of view |
| `outline` | `string` | `"rgba(255, 255, 255, 0.35)"` | Wall edges facing open cells, keeps walls visible when their color is close to the floor |
| `tiles` | `{ [id: number]: string }` | Texture average colors | Color of each tile |

### Inputs

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `north` | `string` | `"ArrowUp"` | Key code for north mouvement |
| `east` | `string` | `"ArrowRight"` | Key code for east mouvement |
| `south` | `string` | `"ArrowDown"` | Key code for south mouvement |
| `west` | `string` | `"ArrowLeft"` | Key code for west mouvement |
| `cameraL` | `string` | `undefined` | Key code for left camera rotation |
| `cameraR` | `string` | `undefined` | Key code for right camera rotation |
| `action` | `string` | `"Space"` | Key code for action triggering |

## TODO

- Add sounds
- Add more tile types
- Add moving sprites
- Add different walls height

## Development

```shell
npm install
npm test        # Unit tests (Vitest)
npm run lint
npm run build   # Type check, bundle and type declarations
```

Notable changes are listed in [CHANGELOG.md](CHANGELOG.md): each pull request adds its changes under `Unreleased`, which becomes the new version when releasing.

Publishing a GitHub release stages the new version on npm, it goes live once approved with 2FA (`npm stage approve <stage-id>` or the Staged Packages tab on npmjs.com).

The demo in `example/` uses the library sources directly:

```shell
cd example
npm install
npm run dev
```

## About

I discovered raycasting as a project from 42 in C, this project is inspired by the world-famous Wolfenstein3D game, which was the first FPS ever.

Here is some useful links:

- http://wolf3d.atw.hu/ (Original Wolfenstein 3D online)
- https://lodev.org/cgtutor/raycasting.html (The main tutorial and code inspiration)
- https://thais-marcon.com/raycasting/ (An example of this component in use online)
- https://github.com/tmarcon-dev/cub3d (My 42 project in C)

## License

MIT