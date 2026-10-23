import { describe, expect, it } from "vitest"
import Game from "../classes/Game"
import { averageColor, isColliding, isFormKey, shadePixel } from "./utils"
import { Texture } from "../types/RaycastTypes"

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

describe("averageColor", () => {
    // Pixels are ABGR, as read from the canvas on little-endian machines
    const texture = (pixels: number[]) =>
        ({ pixels: new Uint32Array(pixels), width: pixels.length, height: 1 }) as Texture

    it("averages the opaque pixels", () => {
        expect(averageColor(texture([0xff0000ff, 0xffff0000]))).toBe("rgb(128, 0, 128)")
    })

    it("ignores transparent pixels, like the background of sprites", () => {
        expect(averageColor(texture([0x00ffffff, 0xff00ff00]))).toBe("rgb(0, 255, 0)")
    })

    it("returns undefined for a transparent texture", () => {
        expect(averageColor(texture([0x00000000]))).toBeUndefined()
    })
})

describe("isFormKey", () => {
    // Minimal elements, the tests run without a DOM
    const key = (code: string, tagName: string, props: object = {}) => isFormKey({
        code,
        target: { tagName, isContentEditable: false, hasAttribute: () => true, ...props } as unknown as EventTarget,
    })

    it("leaves keys to the game outside of controls", () => {
        expect(key("KeyW", "BODY")).toBe(false)
        expect(key("Space", "CANVAS")).toBe(false)
        expect(isFormKey({ code: "KeyW", target: null })).toBe(false)
    })

    it("gives every key to text fields", () => {
        expect(key("KeyW", "INPUT", { type: "text" })).toBe(true)
        expect(key("ArrowUp", "INPUT", { type: "range" })).toBe(true)
        expect(key("KeyW", "TEXTAREA")).toBe(true)
        expect(key("ArrowDown", "SELECT")).toBe(true)
        expect(key("KeyW", "DIV", { isContentEditable: true })).toBe(true)
    })

    it("gives Space and Enter to buttons, links and checkboxes", () => {
        for (const [tag, props] of [["BUTTON", {}], ["A", {}], ["INPUT", { type: "checkbox" }]] as const) {
            expect(key("Space", tag, props)).toBe(true)
            expect(key("Enter", tag, props)).toBe(true)
            expect(key("KeyW", tag, props)).toBe(false)
        }
    })

    it("ignores links without href", () => {
        expect(key("Space", "A", { hasAttribute: () => false })).toBe(false)
    })
})
