// Public types

import { CanvasHTMLAttributes, ReactNode } from "react"
import Game from "../classes/Game"

export type Tiles = { [key: number]: Tile }

export type Tile = {
    type: "wall" | "sprite" | "door",
    src: string,
    collision?: boolean,
}

export type PlayerType = {
    x: number,
    y: number,
    rotation?: number
}

export type Inputs = {
    north: string,
    east: string,
    south: string,
    west: string,
    action: string,
    cameraL?: string,
    cameraR?: string,
}

export interface RaycastType extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "children"> {
    map: number[][],
    tiles: Tiles,
    player: PlayerType,
    width?: number,
    height?: number,
    shading?: boolean,
    showFPS?: boolean,
    bobbing?: boolean,
    skybox?: string,
    floor?: string,
    ceiling?: string,
    speed?: number,
    rotSpeed?: number,
    inputs?: Inputs,
    mouse?: boolean,
    children?: (value: Game) => ReactNode
}

// Private types

export type Sprite = {
    x: number;
    y: number;
    tile: number;
}

export type SortedSprite = Sprite & {
    distance: number;
}

export type Doors = number[][]

export type Textures = Map<number, HTMLImageElement>

export interface CanvasType extends Omit<RaycastType, "map" | "tiles" | "player" | "width" | "height" | "children"> {
    g: Game,
    w: number,
    h: number,
    textures: { current: Textures },
}
