import { Doors, Tiles, PlayerType, Sprite } from "../types/RaycastTypes"
import MapError from "./MapError"

// Door opening/closing speed (fraction of the door per second)
const DOOR_SPEED = 1.5
// Time a door stays open before closing, in seconds
const DOOR_OPEN_TIME = 3

type DoorState = "closed" | "opening" | "open" | "closing"

export default class Game {
    constructor(map: number[][], tiles: Tiles, player: PlayerType, w: number, h: number) {
        this.map = map
        this.tiles = tiles

        this.reachable = map.map(row => row.map(() => false))
        // The player stands in the cell its position rounds to, as in setPlayer
        this.checkMap(Math.floor(player.x + .5), Math.floor(player.y + .5))

        this.pX = player.x + .5
        this.pY = player.y + .5

        this.dirX = -1
        this.dirY = 0
        this.planeX = 0
        this.planeY = 0
        this.setRotation(player.rotation ?? 0)
        this.setResolution(w, h)

        this.doors = map.map(row => row.map(() => 0));
        this.doorStates = map.map(row => row.map((): DoorState => "closed"));
        this.doorTimers = map.map(row => row.map(() => 0));

        this.sprites = []
        map.forEach((row, x) => row.forEach((tile, y) => {
            if (tiles[tile]?.type === "sprite")
                this.sprites.push({ x: x + 0.5, y: y + 0.5, tile })
        }))
    }

    // Movement input, between -1 and 1: x strafes right, y moves forward
    // The game loop applies it every frame with collisions, until it is set back to 0
    move = (x: number, y: number) => {
        this.up = y * this.speed
        this.right = x * this.speed
    }

    // Rotation input, between -1 and 1: positive values turn right
    turn = (x: number) => {
        this.cameraL = x * this.rotSpeed
    }

    // Camera input in pixels of mouse movement, same sensitivity as the built-in mouse controls
    // x turns right, y looks down, it is applied once on the next frame
    look = (x: number, y: number) => {
        this.movementX += x
        this.movementY += y
    }

    // Opens the doors in front of the player or in its cell, like the action key
    interact = () => {
        const cells = [
            [Math.floor(this.pX + this.dirX), Math.floor(this.pY + this.dirY)],
            [Math.floor(this.pX + this.dirX * 2), Math.floor(this.pY + this.dirY * 2)],
            [Math.floor(this.pX), Math.floor(this.pY)],
        ]

        cells.forEach(([x, y]) => {
            if (this.getMapType(x, y) === "door") this.openDoor(x, y)
        })
    }

    /** @deprecated Use `move` */
    joystickMove = (x: number, y: number) => this.move(x, y)

    /** @deprecated Use `turn` */
    joystickCamera = (x: number) => this.turn(x)

    // Current position and rotation, in the same format as the `player` prop
    getPlayer = (): PlayerType => ({
        x: this.pX - .5,
        y: this.pY - .5,
        rotation: Math.atan2(this.dirY, -this.dirX) * 180 / Math.PI,
    })

    // Moves the player, used to control the player from outside the component
    // Positions outside of the map or in an area not enclosed by walls are ignored, as rays could not hit a wall
    setPlayer = (player: PlayerType) => {
        const x = Math.floor(player.x + .5)
        const y = Math.floor(player.y + .5)

        if (!this.reachable[x]?.[y]) {
            try {
                this.checkMap(x, y)
            } catch (e) {
                console.warn(`Ignoring player position [${player.x}, ${player.y}]:`, e instanceof Error ? e.message : e)
                return
            }
            // Walls are never reachable
            if (!this.reachable[x][y]) {
                console.warn(`Ignoring player position [${player.x}, ${player.y}]: inside a wall`)
                return
            }
        }

        this.pX = player.x + .5
        this.pY = player.y + .5
        this.setRotation(player.rotation ?? 0)
    }

    // Rotation in degrees, 0 looks toward the first row of the map
    setRotation = (degrees: number) => {
        const rotation = -degrees * Math.PI / 180
        const planeLength = Math.hypot(this.planeX, this.planeY)
        this.dirX = -Math.cos(rotation);
        this.dirY = -Math.sin(rotation);
        this.planeX = this.dirY * planeLength
        this.planeY = -this.dirX * planeLength
    }

    // Camera plane is kept perpendicular to the direction, its length sets the field of view
    setResolution = (w: number, h: number) => {
        const planeLength = (w / 2) / h
        this.planeX = this.dirY * planeLength
        this.planeY = -this.dirX * planeLength
    }

    // Iterative flood fill from a position: every reachable cell must be enclosed by colliding walls
    // Validated cells are remembered so the player can be moved to them without checking again
    checkMap = (startX: number, startY: number) => {
        const visited = this.map.map(row => row.map(() => false))
        const inside: [number, number][] = []
        const stack: [number, number][] = [[startX, startY]]

        while (stack.length) {
            const [x, y] = stack.pop()!

            if (x < 0 || y < 0 || x > this.map.length - 1 || y > this.map[x].length - 1)
                throw new MapError("Player initial position has to be in an enclosed map");

            if (visited[x][y]) continue
            visited[x][y] = true

            const id = this.map[x][y]
            if (id !== 0) {
                const tile = this.tiles[id]
                if (!tile)
                    throw new MapError(`Tile ${id} at [${x}, ${y}] is not defined in tiles`);
                if (tile.type === "wall" && tile.collision)
                    continue
            }

            inside.push([x, y])
            stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1])
        }

        inside.forEach(([x, y]) => this.reachable[x][y] = true)
    }

    getMapType = (x: number, y: number) => {
        if (this.tiles[this.map[x]?.[y]])
            return this.tiles[this.map[x][y]].type
        else return null
    }

    // Holding the action key interacts every frame
    checkDoor = () => {
        if (this.action) this.interact()
    }

    openDoor = (x: number, y: number) => {
        const state = this.doorStates[x][y]
        if (state === "closed" || state === "closing")
            this.doorStates[x][y] = "opening"
        else if (state === "open")
            this.doorTimers[x][y] = 0
    }

    // Animates doors, called once per frame with the elapsed time in seconds
    updateDoors = (delta: number) => {
        const playerX = Math.floor(this.pX)
        const playerY = Math.floor(this.pY)

        this.doorStates.forEach((row, x) => row.forEach((state, y) => {
            if (state === "opening") {
                this.doors[x][y] = Math.min(1, this.doors[x][y] + DOOR_SPEED * delta)
                if (this.doors[x][y] === 1) {
                    this.doorStates[x][y] = "open"
                    this.doorTimers[x][y] = 0
                }
            } else if (state === "open") {
                this.doorTimers[x][y] += delta
                // Never close a door on the player
                if (this.doorTimers[x][y] >= DOOR_OPEN_TIME && (x !== playerX || y !== playerY))
                    this.doorStates[x][y] = "closing"
            } else if (state === "closing") {
                this.doors[x][y] = Math.max(0, this.doors[x][y] - DOOR_SPEED * delta)
                if (this.doors[x][y] === 0)
                    this.doorStates[x][y] = "closed"
            }
        }))
    }

    map: number[][]
    tiles: Tiles

    // Cells validated by checkMap
    reachable: boolean[][]

    doors: Doors
    doorStates: DoorState[][]
    doorTimers: number[][]

    sprites: Sprite[]

    speed = 10
    rotSpeed = 3

    up = 0
    left = 0
    down = 0
    right = 0
    cameraL = 0
    cameraR = 0

    movementX = 0
    movementY = 0

    action = false

    pX: number
    pY: number

    pitch = 0
    posZ = 0;

    dirX: number
    dirY: number

    planeX: number;
    planeY: number;
}
