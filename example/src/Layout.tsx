import { ReactNode } from "react";
import { FaAdjust, FaMapMarkerAlt, FaRunning } from "react-icons/fa";
import { FaArrowDown19 } from "react-icons/fa6";

import { Minimap } from "../../src";
import { PlayerType } from "../../src/types/RaycastTypes";
import { map } from "./assets/map";
import { tiles } from "./assets/tiles";
import { Settings } from "./settings";
import Toggle from "./Toggle";

// Page parts shared by both demos

// Teleport targets, the library ignores positions in walls anyway
const isFree = (x: number, y: number) => {
  const tile = map[x][y];
  return tile === 0 || !tiles[tile].collision;
};

// Built line by line, a formatter would indent the lines of a multiline template string
const positionText = (player: PlayerType) =>
  [
    "player = {",
    `  x: ${player.x.toFixed(2)},`,
    `  y: ${player.y.toFixed(2)},`,
    `  rotation: ${Math.round(player.rotation ?? 0)}`,
    "}",
  ].join("\n");

// Settings toggles and player position, in the top left corner of the page
export function Panel({
  settings,
  set,
  player,
}: {
  settings: Settings;
  set: (name: keyof Settings) => (value: boolean) => void;
  player: PlayerType;
}) {
  return (
    <aside className="panel">
      <form>
        <Toggle
          id="shading"
          label="Shading"
          icon={<FaAdjust />}
          checked={settings.shading}
          onChange={set("shading")}
        />
        <Toggle
          id="bobbing"
          label="Bobbing"
          icon={<FaRunning />}
          checked={settings.bobbing}
          onChange={set("bobbing")}
        />
        <Toggle
          id="showFPS"
          label="Show FPS"
          icon={<FaArrowDown19 />}
          checked={settings.showFPS}
          onChange={set("showFPS")}
        />
        <Toggle
          id="showPosition"
          label="Show position"
          icon={<FaMapMarkerAlt />}
          checked={settings.showPosition}
          onChange={set("showPosition")}
        />
      </form>

      {settings.showPosition && <pre>{positionText(player)}</pre>}
    </aside>
  );
}

// Controls help and minimap over the view, clicking the minimap teleports the player
export function ViewOverlay({
  keyboard,
  touch,
  onTeleport,
}: {
  keyboard: ReactNode;
  touch: ReactNode;
  onTeleport: (x: number, y: number) => void;
}) {
  return (
    <div className="view-overlay">
      <p className="hint">
        <span className="keyboard">{keyboard}</span>
        <span className="touch">{touch}</span>
      </p>

      <Minimap
        className="minimap"
        onCellClick={(x, y) => {
          if (isFree(x, y)) onTeleport(x, y);
        }}
      />
    </div>
  );
}

// Above the view
export function Description({ children }: { children: ReactNode }) {
  return <p className="description">{children}</p>;
}

export function Footer({ href, label }: { href: string; label: string }) {
  return (
    <footer>
      <p>
        © 2024 <a href="https://thais-marcon.com">Thaïs Marcon</a>
      </p>
      <p>
        Github:{" "}
        <a href="https://github.com/tmarcon-dev/react-raycaster">
          react-raycaster
        </a>{" "}
        - <a href={href}>{label}</a>
      </p>
    </footer>
  );
}
