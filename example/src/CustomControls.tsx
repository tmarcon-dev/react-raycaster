import "./App.css";

import { useEffect, useState } from "react";

import oakPlanks from "./assets/tex/oak_planks.png";
import skybox from "./assets/tex/cubemap.png";

import Raycaster, {
  isFormKey,
  lockPointer,
  RaycasterProvider,
  useRaycaster,
} from "../../src";
import { PlayerType } from "../../src/types/RaycastTypes";
import { map } from "./assets/map";
import { tiles } from "./assets/tiles";
import { Description, Footer, Panel, ViewOverlay } from "./Layout";
import { useSettings } from "./settings";

const KEYS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA"],
  right: ["KeyD"],
  turnLeft: ["KeyQ", "ArrowLeft"],
  turnRight: ["KeyE", "ArrowRight"],
  interact: ["Space"],
};

// Own keyboard and mouse handling: inputs go through the game API, the library applies them with collisions
function Controls() {
  const game = useRaycaster();

  useEffect(() => {
    if (!game) return;

    const pressed = new Set<string>();
    const handled = new Set(Object.values(KEYS).flat());
    const isDown = (action: keyof typeof KEYS) =>
      KEYS[action].some((key) => pressed.has(key)) ? 1 : 0;

    const update = () => {
      game.move(
        isDown("right") - isDown("left"),
        isDown("forward") - isDown("backward"),
      );
      game.turn(isDown("turnRight") - isDown("turnLeft"));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Keys typed in the settings or pressed on a focused toggle are left to the page
      if (!handled.has(e.code) || isFormKey(e)) return;
      e.preventDefault();
      pressed.add(e.code);
      if (KEYS.interact.includes(e.code)) game.interact();
      update();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.delete(e.code);
      update();
    };
    const onBlur = () => {
      pressed.clear();
      update();
    };

    // The camera follows the mouse once the pointer is locked by a click on the view
    // The first movement after locking or unlocking can include the jump of the cursor
    let skip = false;
    const onLockChange = () => (skip = true);
    const onMouseMove = (e: MouseEvent) => {
      if (skip) skip = false;
      else if (document.pointerLockElement instanceof HTMLCanvasElement)
        game.look(e.movementX, e.movementY);
    };

    addEventListener("keydown", onKeyDown);
    addEventListener("keyup", onKeyUp);
    addEventListener("blur", onBlur);
    addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      removeEventListener("keydown", onKeyDown);
      removeEventListener("keyup", onKeyUp);
      removeEventListener("blur", onBlur);
      removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      onBlur();
    };
  }, [game]);

  return null;
}

function CustomControls() {
  // Kept in sync by onPlayerChange, for the position text and so teleports always apply
  const [player, setPlayer] = useState<PlayerType>({
    x: 15,
    y: 8,
    rotation: 0,
  });
  const [settings, set] = useSettings();

  return (
    <RaycasterProvider>
      <Raycaster
        controls={false}
        map={map}
        tiles={tiles}
        player={player}
        onPlayerChange={setPlayer}
        onClick={(e) => lockPointer(e.currentTarget)}
        floor={oakPlanks}
        skybox={skybox}
        shading={settings.shading}
        bobbing={settings.bobbing}
        showFPS={settings.showFPS}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          aspectRatio: 6 / 10,
          maxWidth: 1000,
        }}
      />

      <Controls />

      <ViewOverlay
        keyboard="WASD / arrows to move, Q E or the mouse to turn (click the view, Esc to release), Space to open doors, click the map to teleport"
        touch="Tap the map to teleport"
        onTeleport={(x, y) => setPlayer((p) => ({ ...p, x, y }))}
      />

      <Description>
        Custom controls: the built-in controls are disabled, the page handles
        the keyboard and the library handles collisions. The controls and the
        minimap get the game from RaycasterProvider.
      </Description>

      <Panel settings={settings} set={set} player={player} />

      <Footer href="./" label="Full demo" />
    </RaycasterProvider>
  );
}

export default CustomControls;
