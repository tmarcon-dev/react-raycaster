import Game from "../classes/Game"
import { Texture } from "../types/RaycastTypes"

export const isColliding = (g: Game, x: number, y: number) => {
    const collider = g.map[Math.floor(x)][Math.floor(y)]
    const doorState = g.doors[Math.floor(x)][Math.floor(y)]
    return (collider === 0 || !g.tiles[collider].collision || doorState === 1)
}

// Reads the pixels of a loaded image, used for per-pixel casting
export const toTexture = (image: HTMLImageElement): Texture | undefined => {
    const c = document.createElement("canvas")
    c.width = image.width
    c.height = image.height
    const ctx = c.getContext("2d")
    if (!ctx) return
    ctx.drawImage(image, 0, 0)
    const data = ctx.getImageData(0, 0, image.width, image.height)
    return { image, pixels: new Uint32Array(data.data.buffer), width: data.width, height: data.height }
}

// Loads an image and converts it to a texture, returns the image to allow cancelling
export const loadTexture = (src: string, onLoad: (texture: Texture) => void) => {
    const image = new Image()
    image.onload = () => {
        const texture = toTexture(image)
        if (texture) onLoad(texture)
    }
    image.crossOrigin = "Anonymous"
    image.src = src
    return image
}

// Multiplies the RGB channels of an ABGR pixel by light (0 to 1), alpha is set to opaque
export const shadePixel = (color: number, light: number) =>
    (0xff000000 |
        (((color >>> 16) & 0xff) * light) << 16 |
        (((color >>> 8) & 0xff) * light) << 8 |
        ((color & 0xff) * light)) >>> 0

// Average color of the opaque pixels of a texture, as a CSS color
export const averageColor = (texture: Texture) => {
    let r = 0, g = 0, b = 0, count = 0
    for (const pixel of texture.pixels) {
        if (pixel >>> 24 < 128) continue
        r += pixel & 0xff
        g += (pixel >>> 8) & 0xff
        b += (pixel >>> 16) & 0xff
        count++
    }
    if (!count) return undefined
    return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`
}

// Locks the pointer for mouse camera controls, with raw mouse input when the browser supports it:
// with mouse acceleration, Chrome on Windows reports sudden large movements that make the camera jump
export const lockPointer = (element: Element) =>
    element.requestPointerLock({ unadjustedMovement: true })
        ?.catch(() => element.requestPointerLock())
        .catch(() => { })

// Input types that are activated with Space or Enter, other keys can still control the game while they are focused
const BUTTON_INPUTS = ["button", "checkbox", "color", "file", "image", "radio", "reset", "submit"]

// Whether a key event belongs to the focused element of the page rather than to the game:
// any key in text fields, selects and editable content, Space and Enter on buttons, links and checkboxes
export const isFormKey = (e: Pick<KeyboardEvent, "code" | "target">) => {
    const el = e.target as HTMLElement | null
    if (!el?.tagName) return false
    if (el.isContentEditable) return true

    const tag = el.tagName.toLowerCase()
    const activation = e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter"

    if (tag === "textarea" || tag === "select") return true
    if (tag === "input") return !BUTTON_INPUTS.includes((el as HTMLInputElement).type) || activation
    if (tag === "button" || tag === "summary" || (tag === "a" && el.hasAttribute("href"))) return activation
    return false
}
