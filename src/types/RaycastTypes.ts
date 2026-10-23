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
    controls?: boolean,
    onPlayerChange?: (player: PlayerType) => void,
    children?: (value: Game) => ReactNode
}

export type MinimapColors = {
    floor?: string,
    player?: string,
    view?: string,
    // Wall edges facing open cells, keeps walls visible when their color is close to the floor
    outline?: string,
    // Tile colors by tile id, the average color of the tile texture by default
    tiles?: { [key: number]: string },
}

export interface MinimapProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "children"> {
    cellSize?: number,
    colors?: MinimapColors,
    onCellClick?: (x: number, y: number) => void,
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

// Image with its pixels as 32 bits ABGR values (little-endian RGBA)
export type Texture = {
    image: HTMLImageElement,
    pixels: Uint32Array,
    width: number,
    height: number,
}

export type Textures = Map<number, Texture>

export interface CanvasType extends Omit<RaycastType, "map" | "tiles" | "player" | "width" | "height" | "children"> {
    g: Game,
    w: number,
    h: number,
    textures: { current: Textures },
}
