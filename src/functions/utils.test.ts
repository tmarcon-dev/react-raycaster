import { describe, expect, it } from "vitest"
import Game from "../classes/Game"
import { isColliding, shadePixel } from "./utils"

describe("isColliding", () => {
    const map = [
        [1, 1, 1, 1, 1],
        [1, 0, 2, 3, 1],
        [1, 4, 0, 0, 1],
        [1, 1, 1, 1, 1],
    ]
    const g = new Game(map, {
        1: { type: "wall", src: "", collision: true },
        2: { type: "sprite", src: "", collision: true },
        3: { type: "door", src: "", collision: true },
        4: { type: "sprite", src: "" },
    }, { x: 1, y: 1 }, 500, 300)

    // isColliding returns true when the position is free
    it("allows empty cells", () => expect(isColliding(g, 1.5, 1.5)).toBe(true))
    it("blocks walls", () => expect(isColliding(g, 0.5, 0.5)).toBe(false))
    it("blocks colliding sprites", () => expect(isColliding(g, 1.5, 2.5)).toBe(false))
    it("allows sprites without collision", () => expect(isColliding(g, 2.5, 1.5)).toBe(true))

    it("blocks doors until fully open", () => {
        expect(isColliding(g, 1.5, 3.5)).toBe(false)
        g.doors[1][3] = 0.5
        expect(isColliding(g, 1.5, 3.5)).toBe(false)
        g.doors[1][3] = 1
        expect(isColliding(g, 1.5, 3.5)).toBe(true)
    })
})

describe("shadePixel", () => {
    // Pixels are ABGR: 0xAABBGGRR
    it("keeps the color at full light", () => expect(shadePixel(0x80406080, 1)).toBe(0xff406080))
    it("darkens every channel", () => expect(shadePixel(0xff406080, 0.5)).toBe(0xff203040))
    it("returns opaque black without light", () => expect(shadePixel(0xffffffff, 0)).toBe(0xff000000))
})
