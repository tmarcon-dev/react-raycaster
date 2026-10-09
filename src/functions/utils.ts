import Game from "../classes/Game"

export const isColliding = (g: Game, x: number, y: number) => {
    const collider = g.map[Math.floor(x)][Math.floor(y)]
    const doorState = g.doors[Math.floor(x)][Math.floor(y)]
    return (collider === 0 || !g.tiles[collider].collision || doorState === 1)
}
