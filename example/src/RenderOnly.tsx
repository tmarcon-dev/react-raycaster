import './App.css'
import './RenderOnly.css'

import { useEffect, useState } from 'react';

import oakPlanks from "./assets/tex/oak_planks.png"
import skybox from "./assets/tex/cubemap.png"

import Raycaster from '../../src';
import { PlayerType } from '../../src/types/RaycastTypes';
import { map } from './assets/map';
import { tiles } from './assets/tiles';

// Cells per second and degrees per second
const MOVE_SPEED = 4
const TURN_SPEED = 120

const KEYS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA"],
  right: ["KeyD"],
  turnLeft: ["KeyQ", "ArrowLeft"],
  turnRight: ["KeyE", "ArrowRight"],
}

// The player stands in the cell [round(x), round(y)], doors are kept closed in this demo
const isFree = (x: number, y: number) => {
  const tile = map[Math.round(x)]?.[Math.round(y)]
  return tile === 0 || (tile !== undefined && !tiles[tile].collision)
}

// Same conventions as the library: rotation 0 looks toward the first row, 90 toward the last column
const move = (player: PlayerType, pressed: Set<string>, delta: number): PlayerType => {
  const isDown = (action: keyof typeof KEYS) => KEYS[action].some(key => pressed.has(key)) ? 1 : 0

  // Increasing the rotation turns right
  const rotation = (player.rotation ?? 0)
    + (isDown("turnRight") - isDown("turnLeft")) * TURN_SPEED * delta

  const angle = rotation * Math.PI / 180
  const dirX = -Math.cos(angle)
  const dirY = Math.sin(angle)

  const forward = (isDown("forward") - isDown("backward")) * MOVE_SPEED * delta
  const strafe = (isDown("right") - isDown("left")) * MOVE_SPEED * delta
  const dx = dirX * forward + dirY * strafe
  const dy = dirY * forward - dirX * strafe

  // Collisions are checked on each axis to slide along walls
  const x = isFree(player.x + dx, player.y) ? player.x + dx : player.x
  const y = isFree(x, player.y + dy) ? player.y + dy : player.y

  return { x, y, rotation }
}

function RenderOnly() {
  // The parent owns the player state, the library only renders it
  const [player, setPlayer] = useState<PlayerType>({ x: 15, y: 8, rotation: 0 })

  // Own game loop and keyboard handling
  useEffect(() => {
    const pressed = new Set<string>()
    const handled = new Set(Object.values(KEYS).flat())

    const onKeyDown = (e: KeyboardEvent) => {
      if (!handled.has(e.code)) return
      e.preventDefault()
      pressed.add(e.code)
    }
    const onKeyUp = (e: KeyboardEvent) => pressed.delete(e.code)
    const onBlur = () => pressed.clear()

    let last = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1)
      last = now
      if (pressed.size) setPlayer(p => move(p, pressed, delta))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    addEventListener("keydown", onKeyDown)
    addEventListener("keyup", onKeyUp)
    addEventListener("blur", onBlur)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener("keydown", onKeyDown)
      removeEventListener("keyup", onKeyUp)
      removeEventListener("blur", onBlur)
    }
  }, [])

  return (
    <div>
      <Raycaster
        controls={false}
        map={map}
        tiles={tiles}
        player={player}
        floor={oakPlanks}
        skybox={skybox}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          aspectRatio: 6 / 10,
          maxWidth: 1000,
        }}
      />

      <aside className="panel">
        <p>Rendering only: the movements, collisions and inputs below are handled by the parent component.</p>
        <p>WASD / arrows to move, Q E to turn, click the map to teleport.</p>

        <div
          className="minimap"
          style={{ gridTemplateColumns: `repeat(${map[0].length}, 1fr)` }}
        >
          {map.map((row, x) => row.map((tile, y) => {
            const free = isFree(x, y)
            return (
              <button
                key={`${x}-${y}`}
                type="button"
                className={`cell tile-${tile}`}
                disabled={!free}
                aria-label={free ? `Teleport to ${x}, ${y}` : undefined}
                onClick={() => setPlayer(p => ({ ...p, x, y }))}
              />
            )
          }))}
          <div
            className="player"
            style={{
              left: `${(player.y + .5) / map[0].length * 100}%`,
              top: `${(player.x + .5) / map.length * 100}%`,
              transform: `translate(-50%, -50%) rotate(${player.rotation ?? 0}deg)`,
            }}
          />
        </div>

        <pre>{`player = {
  x: ${player.x.toFixed(2)},
  y: ${player.y.toFixed(2)},
  rotation: ${Math.round(player.rotation ?? 0)}
}`}</pre>
      </aside>

      <footer>
        <p>© 2024 <a href="https://thais-marcon.com">Thaïs Marcon</a></p>
        <p>Github: <a href="https://github.com/tmarcon-dev/react-raycaster">react-raycaster</a> - <a href="./">Full demo</a></p>
      </footer>
    </div>
  )
}

export default RenderOnly
