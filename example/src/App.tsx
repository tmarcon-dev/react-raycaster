import './App.css'

import { useMemo, useState } from 'react';
import { FaAdjust, FaRunning } from "react-icons/fa";
import { FaArrowDown19 } from 'react-icons/fa6';

import oakPlanks from "./assets/tex/oak_planks.png"
import skybox from "./assets/tex/cubemap.png"

import Raycaster from '../../src';
import { PlayerType } from '../../src/types/RaycastTypes';
import { map } from './assets/map';
import { tiles } from './assets/tiles';
import { Joystick } from 'react-joystick-component';

function App() {
  const [shading, setShading] = useState(true)
  const [bobbing, setBobbing] = useState(true)
  const [showFPS, setShowFPS] = useState(false)

  const player = useMemo((): PlayerType => ({
    x: 15,
    y: 8,
  }), [])

  const inputs = {
    north: "KeyW",
    east: "KeyD",
    south: "KeyS",
    west: "KeyA",
    action: "Space",
    cameraL: "KeyQ",
    cameraR: "KeyE",
  }

  return (
    <div>
      <Raycaster
        mouse
        map={map}
        tiles={tiles}
        player={player}
        showFPS={showFPS}
        floor={oakPlanks}
        skybox={skybox}
        shading={shading}
        inputs={inputs}
        bobbing={bobbing}
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
              move={(e) => g.joystickMove(e.x ?? 0, e.y ?? 0)}
              stop={() => g.joystickMove(0, 0)} />

            <Joystick
              size={100}
              baseColor="grey"
              stickColor="lightgrey"
              move={(e) => g.joystickCamera(e.x ?? 0)}
              stop={() => g.joystickCamera(0)} />
          </div>
        }
      </Raycaster>

      <form>
        <div>
          <label htmlFor="shading"><FaAdjust /></label>
          <input
            type="checkbox"
            checked={shading}
            onChange={() => setShading(!shading)}
            id="shading"
            aria-label="Shading"
          />
        </div>

        <div>
          <label htmlFor="bobbing"><FaRunning /></label>
          <input
            type="checkbox"
            checked={bobbing}
            onChange={() => setBobbing(!bobbing)}
            id="bobbing"
            aria-label="Bobbing"
          />
        </div>

        <div>
          <label htmlFor="showFPS"><FaArrowDown19 /></label>
          <input
            type="checkbox"
            checked={showFPS}
            onChange={() => setShowFPS(!showFPS)}
            id="showFPS"
            aria-label="Show FPS"
          />
        </div>
      </form>

      <footer>
        <p>© 2024 <a href="https://thais-marcon.com">Thaïs Marcon</a></p>
        <p>Github: <a href="https://github.com/tmarcon-dev/react-raycaster">react-raycaster</a> - <a href="render-only.html">Render only demo</a></p>
      </footer>
    </div>
  )
}

export default App
