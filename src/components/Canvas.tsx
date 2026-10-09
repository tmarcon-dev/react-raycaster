import { useEffect, useLayoutEffect, useRef } from "react";
import { CanvasType, SortedSprite } from "../types/RaycastTypes";
import { isColliding } from "../functions/utils";

const DEFAULT_INPUTS = {
    north: "ArrowUp",
    east: "ArrowRight",
    south: "ArrowDown",
    west: "ArrowLeft",
    action: "Space",
}

// Camera rotation in radians per pixel of mouse movement
const MOUSE_SENSITIVITY = 1 / 900
// Pitch change in screen pixels per pixel of mouse movement
const MOUSE_PITCH_SENSITIVITY = 0.25

// Loads an image and returns its pixels, used for per-pixel floor/ceiling casting
const loadImageData = (src: string, onLoad: (data: ImageData) => void) => {
    const image = new Image();
    image.onload = () => {
        const c = document.createElement("canvas")
        c.width = image.width
        c.height = image.height
        const cctx = c.getContext("2d")
        if (!cctx) return
        cctx.drawImage(image, 0, 0)
        onLoad(cctx.getImageData(0, 0, image.width, image.height))
    }
    image.crossOrigin = "Anonymous";
    image.src = src;
    return image
}

export default function Canvas({
    g,
    inputs = DEFAULT_INPUTS,
    shading = true,
    showFPS = false,
    bobbing = true,
    w,
    h,
    skybox,
    ceiling,
    floor,
    speed = 10,
    rotSpeed = 3,
    textures,
    mouse = false,
    style,
    ...canvasProps
}: CanvasType) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    // Latest props, read by the game loop and event handlers without restarting them
    const props = useRef({ inputs, shading, showFPS, bobbing, w, h, speed, rotSpeed })
    useLayoutEffect(() => {
        props.current = { inputs, shading, showFPS, bobbing, w, h, speed, rotSpeed }
    })

    const skyboxImage = useRef<HTMLImageElement | undefined>(undefined)
    const ceilingTexData = useRef<ImageData | undefined>(undefined)
    const floorTexData = useRef<ImageData | undefined>(undefined)

    // Main loop
    useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true });
        if (!ctx) return

        let id: ImageData | null = null
        let z = new Float64Array(0)
        let oTimestamp: DOMHighResTimeStamp | null = null;
        let bobbingState = 1;
        let frame = 0

        const loop = (timestamp: DOMHighResTimeStamp) => {
            const { shading, showFPS, bobbing, w, h, speed, rotSpeed } = props.current
            const middle = h * 0.5;

            // Buffers follow the canvas resolution
            if (!id || id.width !== w || id.height !== h) {
                id = ctx.createImageData(w, h)
                z = new Float64Array(w)
                ctx.fillStyle = "red"
                ctx.font = "24px Arial"
                ctx.imageSmoothingEnabled = false;
            }
            const d = id.data

            // Calculate the number of seconds passed since the last frame, capped to avoid jumps after a tab switch
            if (!oTimestamp) oTimestamp = timestamp
            const delta = Math.min((timestamp - oTimestamp) / 1000, 0.1);
            oTimestamp = timestamp;

            // Calculate fps
            const fps = delta ? Math.round(1 / delta) : 0;

            g.speed = speed
            g.rotSpeed = rotSpeed

            // Calculate new movements
            const movement = (g.up + g.down) * delta
            if (movement) {
                if (isColliding(g, g.pX + g.dirX * movement, g.pY))
                    g.pX += g.dirX * movement
                if (isColliding(g, g.pX, g.pY + g.dirY * movement))
                    g.pY += g.dirY * movement

                // Bobbing
                if (bobbing) {
                    g.posZ += bobbingState * 20 * Math.abs(movement)
                    if (bobbingState === 1 && g.posZ > 40) {
                        bobbingState = -1
                        g.posZ = 40
                    } else if (g.posZ <= 0) {
                        bobbingState = 1
                        g.posZ = 0
                    }
                }
            }

            const strafe = (g.left + g.right) * delta
            if (strafe) {
                if (isColliding(g, g.pX + g.planeX * strafe, g.pY))
                    g.pX += g.planeX * strafe
                if (isColliding(g, g.pX, g.pY + g.planeY * strafe))
                    g.pY += g.planeY * strafe
            }

            if ((!movement || !bobbing) && g.posZ !== 0) {
                if (g.posZ > 0)
                    g.posZ -= 3
                else {
                    g.posZ = 0
                    bobbingState = 1
                }
            }

            if (g.movementY) {
                g.pitch -= g.movementY * MOUSE_PITCH_SENSITIVITY
                if (g.pitch > middle)
                    g.pitch = middle
                else if (g.pitch < -middle)
                    g.pitch = -middle
                g.movementY = 0
            }

            // Calculate new rotations
            const rotation = -(g.cameraL + g.cameraR) * delta - g.movementX * MOUSE_SENSITIVITY
            g.movementX = 0
            if (rotation) {
                const olddirX = g.dirX;
                g.dirX = g.dirX * Math.cos(rotation) - g.dirY * Math.sin(rotation);
                g.dirY = olddirX * Math.sin(rotation) + g.dirY * Math.cos(rotation);
                const oldplaneX = g.planeX;
                g.planeX = g.planeX * Math.cos(rotation) - g.planeY * Math.sin(rotation);
                g.planeY = oldplaneX * Math.sin(rotation) + g.planeY * Math.cos(rotation);
            }

            // Door interactions
            g.checkDoor()
            g.updateDoors(delta)

            // Clear canvas
            ctx.clearRect(0, 0, w, h)

            // Draw algorithms
            floorcast(d, w, h, middle, shading);
            skycast(w, h, middle);
            raycast(w, h, middle, shading);
            spritecast(w, h, middle);

            if (showFPS) ctx.fillText(fps.toString(), w / 50, h / 15 + 12);

            // Get next frame
            frame = requestAnimationFrame(loop)
        }

        const skycast = (w: number, h: number, middle: number) => {
            const sky = skyboxImage.current
            if (!sky) return

            const skyWidth = w * 4
            const angle = Math.atan2(g.dirY, g.dirX) / Math.PI + 1;
            const pan = Math.floor(angle * w * 2);

            ctx.drawImage(sky, 0, 0, sky.width, sky.height, pan, -middle + g.pitch, skyWidth, h);
            ctx.drawImage(sky, 0, 0, sky.width, sky.height, pan - skyWidth, -middle + g.pitch, skyWidth, h);
        }

        const spritecast = (w: number, h: number, middle: number) => {
            const sortedSprites: SortedSprite[] = g.sprites.map(s => ({
                ...s,
                distance: (g.pX - s.x) ** 2 + (g.pY - s.y) ** 2
            }))

            sortedSprites
                .sort((a, b) => b.distance - a.distance)
                .forEach(s => {

                    // Translate sprite position to relative to camera
                    const spX = s.x - g.pX;
                    const spY = s.y - g.pY;

                    // Transform sprite with the inverse camera matrix
                    const invert = 1 / (g.planeX * g.dirY - g.planeY * g.dirX);
                    const transformX = invert * (g.dirY * spX - g.dirX * spY);
                    const transformY = invert * (-g.planeY * spX + g.planeX * spY);

                    if (transformY > 0.001) {

                        const spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));
                        const vMoveScreen = Math.floor(g.pitch + g.posZ / transformY);

                        // Calculate height of the sprite
                        const spriteHeight = Math.abs(Math.floor(h / transformY)); // Using 'transformY' to prevents fisheye

                        const drawStartY = Math.floor(-spriteHeight / 2 + middle + vMoveScreen);

                        // Calculate width of the sprite
                        const spriteWidth = Math.abs(Math.floor(h / transformY));
                        let drawStartX = Math.floor(-spriteWidth / 2 + spriteScreenX);
                        let drawEndX = drawStartX + spriteWidth;

                        let clipStartX = drawStartX;
                        let clipEndX = drawEndX;

                        if (drawStartX < -spriteWidth) drawStartX = -spriteWidth;
                        if (drawEndX > w + spriteWidth) drawEndX = w + spriteWidth;

                        const tex = textures.current.get(s.tile)
                        if (!tex) return

                        // Loop through every vertical stripe of the sprite on screen
                        for (let stripe = drawStartX; stripe <= drawEndX; stripe++) {
                            if (transformY >= z[stripe]) {
                                if (stripe === 0)
                                    clipStartX = 0
                                else if (stripe <= clipStartX + 1)
                                    clipStartX = stripe + 1;
                                else {
                                    clipEndX = stripe;
                                    break;
                                }
                            }
                        }

                        if (clipStartX !== clipEndX && clipEndX > 0 && clipStartX < w) {
                            const scaleDelta = tex.width / spriteWidth;
                            drawStartX = Math.floor((clipStartX - drawStartX) * scaleDelta);
                            if (drawStartX < 0) drawStartX = 0;

                            drawEndX = Math.floor((clipEndX - clipStartX) * scaleDelta) + 1;
                            if (drawEndX > tex.width) drawEndX = tex.width;

                            let drawWidth = clipEndX - clipStartX;
                            if (drawWidth < 0) drawWidth = 0;

                            ctx.drawImage(tex, drawStartX, 0, drawEndX, tex.height, clipStartX, drawStartY, drawWidth, spriteHeight);
                        }
                    }
                })
        }

        const raycast = (w: number, h: number, middle: number, shading: boolean) => {
            for (let x = 0; x < w; x++) {

                // Calculate ray position and direction
                const camx = 2 * x / w - 1;
                const rayDirX = g.dirX + g.planeX * camx;
                const rayDirY = g.dirY + g.planeY * camx;

                // Box of the map we're in
                let mapX = Math.floor(g.pX);
                let mapY = Math.floor(g.pY);

                // Length of the ray from current position to next x or y-side
                let sideDistX;
                let sideDistY;

                let wallXOffset = 0;
                let wallYOffset = 0;

                // Length of ray from one x or y-side to next x or y-side
                const ddx = (rayDirX === 0) ? 1e30 : Math.abs(1 / rayDirX);
                const ddy = (rayDirY === 0) ? 1e30 : Math.abs(1 / rayDirY);
                let perpWallD;

                // What direction to step in x or y-direction (either +1 or -1)
                let stepX;
                let stepY;

                let hit = 0;
                let side = 0;

                // Calculate step and initial sideDist
                if (rayDirX < 0) {
                    stepX = -1;
                    sideDistX = (g.pX - mapX) * ddx;
                } else {
                    stepX = 1;
                    sideDistX = (mapX + 1.0 - g.pX) * ddx;
                }

                if (rayDirY < 0) {
                    stepY = -1;
                    sideDistY = (g.pY - mapY) * ddy;
                } else {
                    stepY = 1;
                    sideDistY = (mapY + 1.0 - g.pY) * ddy;
                }

                // DDA
                while (hit === 0) {

                    // Jump to next map square, either in x-direction, or in y-direction
                    if (sideDistX < sideDistY) {
                        sideDistX += ddx;
                        mapX += stepX;
                        side = 0;
                    } else {
                        sideDistY += ddy;
                        mapY += stepY;
                        side = 1;
                    }

                    let wx
                    const mapPos = g.map[mapX][mapY]
                    // Check if ray has hit a wall
                    if (mapPos > 0) {
                        if (g.tiles[mapPos].type === "wall")
                            hit = 1;
                        else if (g.tiles[mapPos].type === "door") {
                            hit = 1;
                            if (side == 1) {
                                wallYOffset = 0.5 * stepY;
                                perpWallD = (mapY - g.pY + wallYOffset + (1 - stepY) / 2) / rayDirY;
                                wx = g.pX + perpWallD * rayDirX;
                                wx -= Math.floor(wx);
                                if (sideDistY - (ddy / 2) < sideDistX) { //If ray hits offset wall
                                    if (1.0 - wx <= g.doors[mapX][mapY]) {
                                        hit = 0; //Continue raycast for open/opening doors
                                        wallYOffset = 0
                                    }
                                } else { // Arround wall
                                    hit = 0;
                                    side = 0;
                                    wallYOffset = 0;
                                }
                            } else {
                                wallXOffset = 0.5 * stepX;
                                perpWallD = (mapX - g.pX + wallXOffset + (1 - stepX) / 2) / rayDirX;
                                wx = g.pY + perpWallD * rayDirY;
                                wx -= Math.floor(wx);
                                if (sideDistX - (ddx / 2) < sideDistY) { //If ray hits offset wall
                                    if (1.0 - wx <= g.doors[mapX][mapY]) {
                                        hit = 0; //Continue raycast for open/opening doors
                                        wallXOffset = 0
                                    }
                                } else { // Arround wall
                                    hit = 0;
                                    side = 0;
                                    wallXOffset = 0;
                                }
                            }
                        }
                    }
                }

                // Calculate distance of perpendicular ray (Euclidean distance would give fisheye effect!)
                if (side === 0) perpWallD = (mapX - g.pX + wallXOffset + (1 - stepX) * 0.5) / rayDirX;
                else perpWallD = (mapY - g.pY + wallYOffset + (1 - stepY) * 0.5) / rayDirY;

                // Calculate height of line to draw on screen
                const lineHeight = Math.floor(h / perpWallD);

                // Calculate lowest and highest pixel to fill in current stripe
                const drawStart = -lineHeight * 0.5 + middle + g.pitch + (g.posZ / perpWallD);

                const texture = textures.current.get(g.map[mapX][mapY]);

                // Calculate value of wallX
                let wallX;
                if (side === 0) wallX = g.pY + perpWallD * rayDirY;
                else wallX = g.pX + perpWallD * rayDirX;
                wallX -= Math.floor(wallX);

                // Calculate door offset
                if (g.tiles[g.map[mapX][mapY]].type === "door")
                    wallX += g.doors[mapX][mapY];

                if (texture) {
                    // x coordinate on the texture
                    let texX = Math.floor(wallX * texture.width);
                    if (side == 0 && rayDirX > 0) texX = texture.width - texX - 1;
                    if (side == 1 && rayDirY < 0) texX = texture.width - texX - 1;
                    ctx.drawImage(texture, texX, 0, 1, texture.height, x, drawStart, 1, lineHeight);
                }
                else {
                    ctx.fillStyle = "black";
                    ctx.fillRect(x, drawStart, 1, lineHeight);
                }

                if (shading) {
                    const shade = perpWallD * 0.020 + side / 10;
                    ctx.fillStyle = "rgba(0, 0, 0, " + shade + ")";
                    ctx.fillRect(x, drawStart, 1, lineHeight);
                }

                // Set the zbuffer for the sprite casting
                z[x] = perpWallD;
            }
            ctx.fillStyle = "red"
        }

        const floorcast = (d: Uint8ClampedArray, w: number, h: number, middle: number, shading: boolean) => {
            const floorTex = floorTexData.current
            const ceilingTex = ceilingTexData.current
            if (!floorTex && !ceilingTex) return;

            // rayDir for leftmost ray (x = 0) and rightmost ray (x = w)
            const rayDirX0 = g.dirX - g.planeX;
            const rayDirY0 = g.dirY - g.planeY;
            const rayDirX1 = g.dirX + g.planeX;
            const rayDirY1 = g.dirY + g.planeY;

            for (let y = 0; y < h; y++) {
                // Whether this section is floor or ceiling
                const isFloor = y > middle + g.pitch;
                const tex = isFloor ? floorTex : ceilingTex

                // Current y position compared to the center of the screen (the horizon)
                const p = Math.floor(isFloor ? (y - middle - g.pitch) : (middle - y + g.pitch));

                // Rows without texture are left transparent so previous frames do not show through
                if (!tex || p <= 0) {
                    d.fill(0, 4 * y * w, 4 * (y + 1) * w)
                    continue
                }

                // Vertical position of the camera.
                const camZ = isFloor ? (middle + g.posZ) : (middle - g.posZ);

                // Horizontal distance from the camera to the floor for the current row.
                const rowDistance = camZ / p;

                const fstepX = rowDistance * (rayDirX1 - rayDirX0) / w;
                const fstepY = rowDistance * (rayDirY1 - rayDirY0) / w;

                let floorX = g.pX + rowDistance * rayDirX0;
                let floorY = g.pY + rowDistance * rayDirY0;

                const shade = (y - g.pitch) / h
                const light = !shading ? 1 : isFloor ? shade : 1 - shade

                for (let x = 0; x < w; ++x) {
                    const cellX = Math.floor(floorX);
                    const cellY = Math.floor(floorY);

                    // Texture coordinates, any texture size is supported
                    const tx = Math.min(Math.floor(tex.width * (floorX - cellX)), tex.width - 1);
                    const ty = Math.min(Math.floor(tex.height * (floorY - cellY)), tex.height - 1);

                    const tUv = 4 * (tex.width * ty + tx);
                    const dataUV = 4 * (y * w + x);

                    d[dataUV + 0] = tex.data[tUv + 0] * light;
                    d[dataUV + 1] = tex.data[tUv + 1] * light;
                    d[dataUV + 2] = tex.data[tUv + 2] * light;
                    d[dataUV + 3] = 255;

                    floorX += fstepX;
                    floorY += fstepY;
                }
            }
            if (id) ctx.putImageData(id, 0, 0);
        }

        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, [g, textures]);

    // Mouse camera
    useEffect(() => {
        const canvas = canvasRef.current
        if (!mouse || !canvas) return

        // Movements are accumulated until the next frame consumes them
        const moveCamera = (e: MouseEvent) => {
            g.movementX += e.movementX
            g.movementY += e.movementY
        }
        const pointerLock = () => canvas.requestPointerLock();

        canvas.addEventListener("mousemove", moveCamera)
        canvas.addEventListener("click", pointerLock);

        return () => {
            canvas.removeEventListener("mousemove", moveCamera)
            canvas.removeEventListener("click", pointerLock);
        }
    }, [g, mouse])

    // Skybox initialization
    useEffect(() => {
        skyboxImage.current = undefined
        if (!skybox) return

        const image = new Image();
        image.onload = () => skyboxImage.current = image;
        image.crossOrigin = "Anonymous";
        image.src = skybox;
        return () => { image.onload = null }
    }, [skybox])

    // Ceiling initialization
    useEffect(() => {
        ceilingTexData.current = undefined
        if (!ceiling) return

        const image = loadImageData(ceiling, data => ceilingTexData.current = data)
        return () => { image.onload = null }
    }, [ceiling])

    // Floor initialization
    useEffect(() => {
        floorTexData.current = undefined
        if (!floor) return

        const image = loadImageData(floor, data => floorTexData.current = data)
        return () => { image.onload = null }
    }, [floor])

    // Handle inputs events
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const { inputs, speed, rotSpeed } = props.current
            if (inputs.north === e.code) g.up = speed
            else if (inputs.east === e.code) g.right = speed
            else if (inputs.south === e.code) g.down = -speed
            else if (inputs.west === e.code) g.left = -speed
            else if (inputs.cameraL === e.code) g.cameraL = -rotSpeed
            else if (inputs.cameraR === e.code) g.cameraR = rotSpeed
            else if (inputs.action === e.code) g.action = true
            else return

            // Prevents arrows and space from scrolling the page
            e.preventDefault()
        }

        const onKeyUp = (e: KeyboardEvent) => {
            const { inputs } = props.current
            if (inputs.north === e.code) g.up = 0
            else if (inputs.east === e.code) g.right = 0
            else if (inputs.south === e.code) g.down = 0
            else if (inputs.west === e.code) g.left = 0
            else if (inputs.cameraL === e.code) g.cameraL = 0
            else if (inputs.cameraR === e.code) g.cameraR = 0
            else if (inputs.action === e.code) g.action = false
        }

        // Keyup events are lost when the window loses focus, release everything
        const onBlur = () => {
            g.up = g.down = g.left = g.right = g.cameraL = g.cameraR = 0
            g.action = false
        }

        addEventListener('keydown', onKeyDown)
        addEventListener('keyup', onKeyUp)
        addEventListener('blur', onBlur)

        return () => {
            removeEventListener('keydown', onKeyDown)
            removeEventListener('keyup', onKeyUp)
            removeEventListener('blur', onBlur)
        }
    }, [g])

    return (
        <canvas
            {...canvasProps}
            width={w}
            height={h}
            ref={canvasRef}
            style={{
                cursor: mouse ? "pointer" : undefined,
                imageRendering: "pixelated",
                ...style,
            }} />
    )
}
