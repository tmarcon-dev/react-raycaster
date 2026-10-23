import { Tiles } from '../../../src/types/RaycastTypes';

import obsidian from "./tex/obsidian.png"
import oakPlanks from "./tex/oak_planks.png"
import barrel from "./tex/barrel.png"
import pillar from "./tex/pillar.png"
import wood from "./tex/wood.png"

export const tiles: Tiles = {
  1: {
    type: "wall",
    src: obsidian,
    collision: true,
  },
  2: {
    type: "wall",
    src: oakPlanks,
    collision: true,
  },
  3: {
    type: "sprite",
    src: barrel,
    collision: true,
  },
  4: {
    type: "sprite",
    src: pillar,
    collision: true,
  },
  5: {
    type: "door",
    src: wood,
    collision: true,
  }
}
