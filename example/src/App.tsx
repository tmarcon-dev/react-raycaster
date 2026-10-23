import './App.css'

import { useState } from 'react';

import oakPlanks from "./assets/tex/oak_planks.png"
import skybox from "./assets/tex/cubemap.png"

import Raycaster, { RaycasterProvider } from '../../src';
import { PlayerType } from '../../src/types/RaycastTypes';
import { map } from './assets/map';
import { tiles } from './assets/tiles';
import { Joystick } from 'react-joystick-component';
import { Description, Footer, Panel, ViewOverlay } from './Layout';
import { useSettings } from './settings';

const inputs = {
  north: "KeyW",
  east: "KeyD",
  south: "KeyS",
  west: "KeyA",
  action: "Space",
  cameraL: "KeyQ",
  cameraR: "KeyE",
}

function App() {
  const [settings, set] = useSettings()

  // Kept in sync by onPlayerChange, for the position text and so teleports always apply
  const [player, setPlayer] = useState<PlayerType>({ x: 15, y: 8 })

  return (
    <RaycasterProvider>
      <Raycaster
        mouse
        map={map}
        tiles={tiles}
        player={player}
        onPlayerChange={setPlayer}
        showFPS={settings.showFPS}
        floor={oakPlanks}
        skybox={skybox}
        shading={settings.shading}
        inputs={inputs}
        bobbing={settings.bobbing}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          aspectRatio: 6 / 10,
          maxWidth: 1000,
        }}
      >
        {g =>
          <div className="joystick-container">
            <Joystick
              size={100}
              baseColor="grey"
              stickColor="lightgrey"
              move={(e) => g.move(e.x ?? 0, e.y ?? 0)}
              stop={() => g.move(0, 0)} />

            <Joystick
              size={100}
              baseColor="grey"
              stickColor="lightgrey"
              move={(e) => g.turn(e.x ?? 0)}
              stop={() => g.turn(0)} />
          </div>
        }
      </Raycaster>

      <ViewOverlay
        keyboard="WASD to move, Q E or the mouse to turn (click the view, Esc to release), Space to open doors, click the map to teleport"
        touch="Left stick to move, right stick to turn, tap the map to teleport"
        onTeleport={(x, y) => setPlayer(p => ({ ...p, x, y }))}
      />

      <Description>
        Built-in controls: the library handles the keyboard, the mouse and collisions, the joysticks use the game API.
        The minimap gets the game from RaycasterProvider.
      </Description>

      <Panel settings={settings} set={set} player={player} />

      <Footer href="custom-controls.html" label="Custom controls demo" />
    </RaycasterProvider>
  )
}

export default App
