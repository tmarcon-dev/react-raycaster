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
