import { useEffect, useRef, useState } from "react";
import { CanvasType, SortedSprite, Sprite } from "../types/RaycastTypes";
import { isColliding } from "../functions/utils";

export default function Canvas({
    g,
    inputs = {
        north: "ArrowUp",
        east: "ArrowRight",
        south: "ArrowDown",
        west: "ArrowLeft",
        action: "Space",
    },
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
    style
}: CanvasType) {
    const frame = useRef(0)

    const middle = h * 0.5;

    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true });

    const id = ctx?.createImageData(w, h);
    const d = id?.data;

    const [skyboxImage, setSkyboxImage] = useState<HTMLImageElement>()

    const [ceilingTexData, setCeilingTexData] = useState<ImageData>()
    const [floorTexData, setFloorTexData] = useState<ImageData>()

    const z = Array(w);
    const [sprites, setSprites] = useState<Sprite[]>([]);

    // Main loop
    let oTimestamp: DOMHighResTimeStamp | null = null;
    let bobbingState = 1;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const loop = (timestamp: DOMHighResTimeStamp) => {
        // Calculate the number of seconds passed since the last frame
        if (!oTimestamp) oTimestamp = timestamp
        const delta = (timestamp - oTimestamp) / 1000;
        oTimestamp = timestamp;

        // Calculate fps
        const fps = Math.round(1 / delta);

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

        if (!movement && bobbing && g.posZ !== 0) {
            if (g.posZ > 0)
                g.posZ -= 3
            else {
                g.posZ = 0
                bobbingState = 1
            }
        }

        if (g.movementY) {
            g.pitch -= g.movementY * delta * 15
            if (g.pitch > middle)
                g.pitch = middle
            else if (g.pitch < -middle)
                g.pitch = -middle
            g.movementY = 0
        }

        if (g.movementX) {
            const rotation = -g.movementX / 15 * delta
            if (rotation) {
                const olddirX = g.dirX;
                g.dirX = g.dirX * Math.cos(rotation) - g.dirY * Math.sin(rotation);
                g.dirY = olddirX * Math.sin(rotation) + g.dirY * Math.cos(rotation);
                const oldplaneX = g.planeX;
                g.planeX = g.planeX * Math.cos(rotation) - g.planeY * Math.sin(rotation);
                g.planeY = oldplaneX * Math.sin(rotation) + g.planeY * Math.cos(rotation);
            }
            g.movementX = 0
        }

        // Calculate new rotations
        const rotation = -(g.cameraL + g.cameraR) * delta
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

        // Clear canvas
        ctx?.clearRect(0, 0, w, h)

        // Draw algorithms
        floorcast();
        skycast();
        raycast();
        spritecast();

        if (showFPS) ctx?.fillText(fps.toString(), w / 50, h / 15 + 12);

        // Get next frame
        frame.current = requestAnimationFrame(loop)
    }

    const skycast = () => {
        if (!skyboxImage) return

        const skyWidth = w * 4
        const angle = Math.atan2(g.dirY, g.dirX) / Math.PI + 1;
        const pan = Math.floor(angle * w * 2);

        if (ctx) {
            ctx.drawImage(skyboxImage, 0, 0, skyboxImage.width, skyboxImage.height, pan, -middle + g.pitch, skyWidth, h);
            ctx.drawImage(skyboxImage, 0, 0, skyboxImage.width, skyboxImage.height, pan - skyWidth, -middle + g.pitch, skyWidth, h);
        }
    }

    const spritecast = () => {
        if (!textures) return

        const sortedSprites: SortedSprite[] = []
        sprites.forEach((s, i) => {
            sortedSprites.push({
                ...s,
                distance: (g.pX - sprites[i].x) ** 2 + (g.pY - sprites[i].y) ** 2
            })
        })

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
                    if (drawEndX > w + spriteWidth) drawEndX = drawEndX = w + spriteWidth;

                    const tex = textures[s.tile]
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

                    if (clipStartX !== clipEndX && clipEndX > 0 && clipStartX < w && ctx) {
                        const scaleDelta = tex.width / spriteWidth;
                        drawStartX = Math.floor((clipStartX - drawStartX) * scaleDelta);
                        if (drawStartX < 0) drawStartX = 0;

                        drawEndX = Math.floor((clipEndX - clipStartX) * scaleDelta) + 1;
                        if (drawEndX > tex.width) drawEndX = tex.width;

                        let drawWidth = clipEndX - clipStartX;
                        if (drawWidth < 0) drawWidth = 0;

                        ctx.drawImage(textures[s.tile], drawStartX, 0, drawEndX, tex.height, clipStartX, drawStartY, drawWidth, spriteHeight);
                    }
                }
            })
    }

    const raycast = () => {
        if (!d) return;

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
                if (g.map[mapX][mapY] > 0) {
                    if (g.tiles && g.tiles[mapPos].type === "wall")
                        hit = 1;
                    else if (g.tiles && g.tiles[mapPos].type === "door") {
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

            const texture = textures && textures[g.map[mapX][mapY] - 1];

            // Calculate value of wallX
            let wallX;
            if (side === 0) wallX = g.pY + perpWallD * rayDirY;
            else wallX = g.pX + perpWallD * rayDirX;
            wallX -= Math.floor(wallX);

            // Calculate door offset
            if (g.tiles && g.tiles[g.map[mapX][mapY]].type === "door")
                wallX += g.doors[mapX][mapY];

            if (ctx) {
                ctx.save()

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

                ctx.restore()
            }

            // Set the zbuffer for the sprite casting
            z[x] = perpWallD;
        }
    }

    const floorcast = () => {
        if (!d) return
        if (!floorTexData && !ceilingTexData) return;

        for (let y = 0; y < h; y++) {
            // Whether this section is floor or ceiling
            const isFloor = y > middle + g.pitch;

            // rayDir for leftmost ray (x = 0) and rightmost ray (x = w)
            const rayDirX0 = g.dirX - g.planeX;
            const rayDirY0 = g.dirY - g.planeY;
            const rayDirX1 = g.dirX + g.planeX;
            const rayDirY1 = g.dirY + g.planeY;

            // Current y position compared to the center of the screen (the horizon)
            const p = Math.floor(isFloor ? (y - middle - g.pitch) : (middle - y + g.pitch));

            // Vertical position of the camera.
            const camZ = isFloor ? (middle + g.posZ) : (middle - g.posZ);

            // Horizontal distance from the camera to the floor for the current row.
            const rowDistance = camZ / p;

            const fstepX = rowDistance * (rayDirX1 - rayDirX0) / w;
            const fstepY = rowDistance * (rayDirY1 - rayDirY0) / w;

            let floorX = g.pX + rowDistance * rayDirX0;
            let floorY = g.pY + rowDistance * rayDirY0;

            const shade = shading ? (y - g.pitch) / h : 1
            for (let x = 0; x < w; ++x) {
                if (p > 0) {
                    const cellX = Math.floor(floorX);
                    const cellY = Math.floor(floorY);

                    const dataUVFloor = 4 * (y * w + x);
                    const dataUVCeiling = 4 * (y * w + x);

                    if (floorTexData && isFloor) {
                        const tx = Math.floor(floorTexData.width * (floorX - cellX)) & (floorTexData.width - 1);
                        const ty = Math.floor(floorTexData.height * (floorY - cellY)) & (floorTexData.height - 1);

                        const tUv = 4 * (floorTexData.width * ty + tx);

                        d[dataUVFloor + 0] = floorTexData.data[tUv + 0] * shade;
                        d[dataUVFloor + 1] = floorTexData.data[tUv + 1] * shade;
                        d[dataUVFloor + 2] = floorTexData.data[tUv + 2] * shade;
                        d[dataUVFloor + 3] = 255;
                    } else if (ceilingTexData && !isFloor) {
                        const tx = Math.floor(ceilingTexData.width * (floorX - cellX)) & (ceilingTexData.width - 1);
                        const ty = Math.floor(ceilingTexData.height * (floorY - cellY)) & (ceilingTexData.height - 1);

                        const tUv = 4 * (ceilingTexData.width * ty + tx);

                        d[dataUVCeiling + 0] = ceilingTexData.data[tUv + 0] * (1 - shade);
                        d[dataUVCeiling + 1] = ceilingTexData.data[tUv + 1] * (1 - shade);
                        d[dataUVCeiling + 2] = ceilingTexData.data[tUv + 2] * (1 - shade);
                        d[dataUVCeiling + 3] = 255;
                    }
                }
                floorX += fstepX;
                floorY += fstepY;
            }
        }
        if (id) ctx?.putImageData(id, 0, 0);
    }

    useEffect(() => {
        if (!mouse) return

        const moveCamera = (e: MouseEvent) => {
            g.movementX = e.movementX
            g.movementY = e.movementY
        }
        const pointerLock = () => canvasRef.current?.requestPointerLock();

        canvasRef.current?.addEventListener("mousemove", moveCamera)
        canvasRef.current?.addEventListener("click", pointerLock);

        const destructor = () => {
            canvasRef.current?.removeEventListener("mousemove", moveCamera)
            canvasRef.current?.removeEventListener("click", pointerLock);
        }
        return destructor
    }, [g, mouse])

    // Main loop initialization
    useEffect(() => {
        frame.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame.current);
    }, [loop]);

    // Font initialization
    useEffect(() => {
        if (ctx) {
            ctx.fillStyle = "red"
            ctx.font = "24px Arial"
            ctx.imageSmoothingEnabled = false;
        }
    }, [ctx])

    // Skybox initialization
    useEffect(() => {
        if (skybox) {
            const image = new Image();
            image.onload = () => setSkyboxImage(image);
            image.src = skybox;
            image.crossOrigin = "Anonymous";
        }
        else setSkyboxImage(undefined);
    }, [skybox])

    // Ceiling initialization
    useEffect(() => {
        if (ceiling) {
            const image = new Image();
            image.onload = () => {
                const c = document.createElement("canvas").getContext("2d");
                c?.drawImage(image, 0, 0, image.width, image.height);
                setCeilingTexData(c?.getImageData(0, 0, image.width, image.height));
            }
            image.src = ceiling;
            image.crossOrigin = "Anonymous";
        }
        else setCeilingTexData(undefined);
    }, [ceiling])

    // Floor initialization
    useEffect(() => {
        if (floor) {
            const image = new Image();
            image.onload = () => {
                const c = document.createElement("canvas").getContext("2d");
                c?.drawImage(image, 0, 0, image.width, image.height);
                setFloorTexData(c?.getImageData(0, 0, image.width, image.height));
            }
            image.src = floor;
            image.crossOrigin = "Anonymous";
        }
        else setFloorTexData(undefined);
    }, [floor])

    // Get sprites from map
    useEffect(() => {
        const s: Sprite[] = []
        g.tiles && g.map.forEach((row, x) =>
            row.forEach((tile, y) => g.tiles[tile]?.type === "sprite" &&
                s.push({ x: x + 0.5, y: y + 0.5, tile: tile - 1 })))
        setSprites(s)
    }, [g])

    // Handle inputs events
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (inputs.north === e.code) g.up = speed
            else if (inputs.east === e.code) g.right = speed
            else if (inputs.south === e.code) g.down = -speed
            else if (inputs.west === e.code) g.left = -speed
            else if (inputs.cameraL === e.code) g.cameraL = -rotSpeed
            else if (inputs.cameraR === e.code) g.cameraR = rotSpeed
            else if (inputs.action === e.code) g.action = true
        }

        const onKeyUp = (e: KeyboardEvent) => {
            if (inputs.north === e.code) g.up = 0
            else if (inputs.east === e.code) g.right = 0
            else if (inputs.south === e.code) g.down = 0
            else if (inputs.west === e.code) g.left = 0
            else if (inputs.cameraL === e.code) g.cameraL = 0
            else if (inputs.cameraR === e.code) g.cameraR = 0
            else if (inputs.action === e.code) g.action = false
        }

        addEventListener('keydown', onKeyDown)
        addEventListener('keyup', onKeyUp)

        return () => {
            removeEventListener('keydown', onKeyDown)
            removeEventListener('keyup', onKeyUp)
        }
    }, [g, inputs, rotSpeed, speed])

    return (
        <canvas
            width={w}
            height={h}
            ref={canvasRef}
            style={{
                ...style,
                cursor: "pointer",
                imageRendering: "pixelated",
            }} />
    )
}