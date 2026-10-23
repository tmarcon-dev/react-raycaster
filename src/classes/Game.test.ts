import { describe, expect, it, vi } from "vitest"
import Game from "./Game"
import MapError from "./MapError"
import { Tiles } from "../types/RaycastTypes"

const tiles: Tiles = {
    1: { type: "wall", src: "", collision: true },
    2: { type: "sprite", src: "", collision: true },
    3: { type: "door", src: "", collision: true },
    4: { type: "wall", src: "", collision: false },
}

const enclosed = (n: number, inner = 0) => Array.from({ length: n }, (_, x) =>
    Array.from({ length: n }, (_, y) => x === 0 || y === 0 || x === n - 1 || y === n - 1 ? 1 : inner))

const create = (map: number[][], player = { x: 1, y: 1 }, t: Tiles = tiles) =>
    new Game(map, t, player, 500, 300)

describe("map validation", () => {
    it("accepts an enclosed map", () => {
        expect(() => create(enclosed(5))).not.toThrow()
    })

    it("rejects an open map", () => {
        expect(() => create([[0, 0], [0, 0]], { x: 0, y: 0 })).toThrow(MapError)
    })

    it("rejects a player outside the map", () => {
        expect(() => create(enclosed(5), { x: 10, y: 1 })).toThrow(MapError)
    })

    it("rejects a map closed by walls without collision", () => {
        const map = enclosed(5)
        map[0][2] = 4
        expect(() => create(map)).toThrow(MapError)
    })

    it("rejects undefined tiles", () => {
        const map = enclosed(5)
        map[2][2] = 9
        expect(() => create(map)).toThrow("Tile 9 at [2, 2] is not defined in tiles")
    })

    it("does not loop when tile 1 is not a colliding wall", () => {
        const t: Tiles = { 1: { type: "sprite", src: "" }, 2: { type: "wall", src: "", collision: true } }
        const map = [[2, 2, 2, 2], [2, 0, 1, 2], [2, 2, 2, 2]]
        expect(() => create(map, { x: 1, y: 1 }, t)).not.toThrow()
    })

    it("handles large maps without stack overflow", () => {
        expect(() => create(enclosed(1000), { x: 5, y: 5 })).not.toThrow()
    })
})

describe("camera", () => {
    it("keeps the camera plane perpendicular to the direction", () => {
        const g = new Game(enclosed(5), tiles, { x: 2, y: 2, rotation: 37 }, 500, 300)
        expect(g.dirX * g.planeX + g.dirY * g.planeY).toBeCloseTo(0)
        expect(Math.hypot(g.planeX, g.planeY)).toBeCloseTo(250 / 300)
    })

    it("updates the field of view on resolution change", () => {
        const g = create(enclosed(5))
        g.setResolution(800, 200)
        expect(Math.hypot(g.planeX, g.planeY)).toBeCloseTo(2)
        expect(g.dirX * g.planeX + g.dirY * g.planeY).toBeCloseTo(0)
    })
})

describe("setPlayer", () => {
    // An enclosed room [1..2] x [1..3], and a second room [4..5] x [1..3] open on the right side
    const rooms = () => [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 0],
        [1, 1, 1, 1, 1],
    ]

    const quiet = () => vi.spyOn(console, "warn").mockImplementation(() => { })

    it("moves and rotates the player", () => {
        const g = new Game(rooms(), tiles, { x: 1, y: 1 }, 500, 300)
        g.setPlayer({ x: 2.25, y: 3, rotation: 90 })
        expect(g.pX).toBe(2.75)
        expect(g.pY).toBe(3.5)
        expect(g.dirX).toBeCloseTo(0)
        expect(g.dirY).toBeCloseTo(1)
    })

    it("keeps the field of view and the camera plane perpendicular", () => {
        const g = new Game(rooms(), tiles, { x: 1, y: 1 }, 500, 300)
        g.setPlayer({ x: 1, y: 2, rotation: 123 })
        expect(Math.hypot(g.planeX, g.planeY)).toBeCloseTo(250 / 300)
        expect(g.dirX * g.planeX + g.dirY * g.planeY).toBeCloseTo(0)
    })

    it("accepts another enclosed area", () => {
        const map = rooms()
        map[5][4] = 1
        const g = new Game(map, tiles, { x: 1, y: 1 }, 500, 300)
        expect(g.reachable[4][2]).toBe(false)
        g.setPlayer({ x: 4, y: 2 })
        expect(g.pX).toBe(4.5)
        expect(g.reachable[4][2]).toBe(true)
    })

    it("ignores positions in an open area", () => {
        const warn = quiet()
        const g = new Game(rooms(), tiles, { x: 1, y: 1 }, 500, 300)
        g.setPlayer({ x: 4, y: 2 })
        expect(g.pX).toBe(1.5)
        expect(warn).toHaveBeenCalled()
        warn.mockRestore()
    })

    it("ignores positions in walls or outside the map", () => {
        const warn = quiet()
        const g = new Game(rooms(), tiles, { x: 1, y: 1 }, 500, 300)
        g.setPlayer({ x: 0, y: 0 })
        g.setPlayer({ x: 3, y: 2 })
        g.setPlayer({ x: -5, y: 2 })
        g.setPlayer({ x: 1, y: 40 })
        expect([g.pX, g.pY]).toEqual([1.5, 1.5])
        expect(warn).toHaveBeenCalledTimes(4)
        warn.mockRestore()
    })
})

describe("sprites", () => {
    it("collects sprites centered in their cell", () => {
        const map = enclosed(5)
        map[2][3] = 2
        expect(create(map).sprites).toEqual([{ x: 2.5, y: 3.5, tile: 2 }])
    })
})

describe("inputs", () => {
    it("uses the configured speeds", () => {
        const g = create(enclosed(5))
        g.speed = 20
        g.rotSpeed = 4
        g.move(0.5, -1)
        g.turn(0.5)
        expect(g.right).toBe(10)
        expect(g.up).toBe(-20)
        expect(g.cameraL).toBe(2)
    })

    it("accumulates look movements until the next frame", () => {
        const g = create(enclosed(5))
        g.look(10, -4)
        g.look(5, 2)
        expect([g.movementX, g.movementY]).toEqual([15, -2])
    })

    it("keeps the deprecated joystick methods", () => {
        const g = create(enclosed(5))
        g.joystickMove(1, 1)
        g.joystickCamera(-1)
        expect([g.right, g.up, g.cameraL]).toEqual([g.speed, g.speed, -g.rotSpeed])
    })
})

describe("getPlayer", () => {
    it("returns the player in the same format as the player prop", () => {
        for (const rotation of [0, 37, 90, -90, 179, -135]) {
            const g = new Game(enclosed(5), tiles, { x: 2.25, y: 1.75, rotation }, 500, 300)
            const p = g.getPlayer()
            expect(p.x).toBeCloseTo(2.25)
            expect(p.y).toBeCloseTo(1.75)
            expect(p.rotation).toBeCloseTo(rotation)
        }
    })
})

describe("doors", () => {
    // Player at [1, 1] looking toward the door at [2, 1]
    const setup = () => {
        const map = enclosed(4)
        map[2][1] = 3
        const g = create(map)
        g.dirX = 1
        g.dirY = 0
        return g
    }

    const run = (g: Game, seconds: number) => {
        for (let i = 0; i < seconds * 60; i++) {
            g.checkDoor()
            g.updateDoors(1 / 60)
        }
    }

    it("opens, stays open, then closes", () => {
        const g = setup()
        g.action = true
        run(g, 0.1)
        g.action = false
        expect(g.doorStates[2][1]).toBe("opening")

        run(g, 1)
        expect(g.doors[2][1]).toBe(1)
        expect(g.doorStates[2][1]).toBe("open")

        run(g, 3)
        expect(g.doorStates[2][1]).toBe("closing")

        run(g, 1)
        expect(g.doors[2][1]).toBe(0)
        expect(g.doorStates[2][1]).toBe("closed")
    })

    it("never closes on the player", () => {
        const g = setup()
        g.action = true
        run(g, 1)
        g.action = false
        g.pX = 2.5
        g.pY = 1.5
        run(g, 10)
        expect(g.doorStates[2][1]).toBe("open")
    })

    it("opens once with interact", () => {
        const g = setup()
        g.interact()
        expect(g.doorStates[2][1]).toBe("opening")
        run(g, 1)
        expect(g.doors[2][1]).toBe(1)
    })

    it("ignores interact away from doors", () => {
        const g = setup()
        g.dirX = -1
        g.interact()
        expect(g.doorStates[2][1]).toBe("closed")
    })

    it("does not open without action", () => {
        const g = setup()
        run(g, 1)
        expect(g.doors[2][1]).toBe(0)
    })
})
