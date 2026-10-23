import { MouseEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MinimapColors, MinimapProps } from "../types/RaycastTypes";
import { averageColor, loadTexture } from "../functions/utils";
import { useRaycaster } from "./context";

const DEFAULT_COLORS = {
    floor: "#1d1d1d",
    player: "#e33",
    view: "rgba(255, 255, 255, 0.15)",
    outline: "rgba(255, 255, 255, 0.35)",
    // Until the texture is loaded
    tile: "#888",
}

// View cone length in cells
const VIEW_LENGTH = 3

// Top-down view of the game of the nearest Raycaster or RaycasterProvider, drawn every frame
export default function Minimap({
    cellSize = 8,
    colors,
    onCellClick,
    onClick,
    onMouseMove,
    onMouseLeave,
    style,
    ...canvasProps
}: MinimapProps) {
    const game = useRaycaster()
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    // Average texture color of each tile, reset with the game
    const [textureColors, setTextureColors] = useState<{ game: typeof game, colors: Map<number, string> }>(
        () => ({ game, colors: new Map() }))
    const loaded = textureColors.game === game ? textureColors.colors : undefined

    useEffect(() => {
        if (!game) return

        const images = Object.entries(game.tiles).map(([id, tile]) => loadTexture(tile.src, texture => {
            const color = averageColor(texture)
            if (color) setTextureColors(c => ({
                game,
                colors: new Map(c.game === game ? c.colors : []).set(Number(id), color),
            }))
        }))
        return () => images.forEach(image => image.onload = null)
    }, [game])

    // Colors are compared by content, inline objects do not redraw the map on every render
    const colorsKey = JSON.stringify(colors ?? {})
    const custom = useMemo(() => JSON.parse(colorsKey) as MinimapColors, [colorsKey])
    const tileColor = useMemo(() =>
        (id: number) => custom.tiles?.[id] ?? loaded?.get(id) ?? DEFAULT_COLORS.tile,
        [custom, loaded])

    // Doors are drawn every frame as they open and close
    const doors = useMemo(() => {
        const cells: [number, number][] = []
        game?.map.forEach((row, x) => row.forEach((id, y) => {
            if (game.tiles[id]?.type === "door") cells.push([x, y])
        }))
        return cells
    }, [game])

    // Floor, walls and sprites do not change, they are drawn once in a layer
    const layer = useRef<HTMLCanvasElement | null>(null)
    useEffect(() => {
        layer.current = null
        if (!game) return

        const rows = game.map.length
        const cols = Math.max(...game.map.map(row => row.length))
        const c = document.createElement("canvas")
        c.width = cols * cellSize
        c.height = rows * cellSize
        const ctx = c.getContext("2d")
        if (!ctx) return

        ctx.fillStyle = custom.floor ?? DEFAULT_COLORS.floor
        ctx.fillRect(0, 0, c.width, c.height)

        const isWall = (x: number, y: number) => game.tiles[game.map[x]?.[y]]?.type === "wall"

        // Map rows go down, columns go right
        game.map.forEach((row, x) => row.forEach((id, y) => {
            const type = game.tiles[id]?.type
            ctx.fillStyle = tileColor(id)
            if (type === "wall") {
                ctx.fillRect(y * cellSize, x * cellSize, cellSize, cellSize)
            } else if (type === "sprite") {
                ctx.beginPath()
                ctx.arc((y + .5) * cellSize, (x + .5) * cellSize, cellSize * .35, 0, Math.PI * 2)
                ctx.fill()
            }
        }))

        // Outlines are drawn after all cells, so neighbors do not cover them
        ctx.fillStyle = custom.outline ?? DEFAULT_COLORS.outline
        const edge = Math.max(1, Math.round(cellSize / 8))
        game.map.forEach((row, x) => row.forEach((_, y) => {
            if (!isWall(x, y)) return
            const left = y * cellSize, top = x * cellSize
            if (x > 0 && !isWall(x - 1, y)) ctx.fillRect(left, top, cellSize, edge)
            if (x < rows - 1 && !isWall(x + 1, y)) ctx.fillRect(left, top + cellSize - edge, cellSize, edge)
            if (y > 0 && !isWall(x, y - 1)) ctx.fillRect(left, top, edge, cellSize)
            if (y < row.length - 1 && !isWall(x, y + 1)) ctx.fillRect(left + cellSize - edge, top, edge, cellSize)
        }))

        layer.current = c
    }, [game, cellSize, custom, tileColor])

    // Latest values, read by the drawing loop without restarting it
    const hovered = useRef<[number, number] | null>(null)
    const props = useRef({ cellSize, custom, tileColor, doors, onCellClick })
    useLayoutEffect(() => {
        props.current = { cellSize, custom, tileColor, doors, onCellClick }
    })

    useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d")
        if (!game || !ctx) return

        let frame = 0
        const draw = () => {
            frame = requestAnimationFrame(draw)
            const { cellSize, custom, tileColor, doors, onCellClick } = props.current
            const canvas = ctx.canvas

            const width = Math.max(...game.map.map(row => row.length)) * cellSize
            const height = game.map.length * cellSize
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width
                canvas.height = height
            }

            ctx.clearRect(0, 0, width, height)
            if (layer.current) ctx.drawImage(layer.current, 0, 0)

            // Doors fade out while opening
            doors.forEach(([x, y]) => {
                ctx.globalAlpha = 1 - game.doors[x][y] * .8
                ctx.fillStyle = tileColor(game.map[x][y])
                ctx.fillRect(y * cellSize, x * cellSize, cellSize, cellSize)
            })
            ctx.globalAlpha = 1

            if (onCellClick && hovered.current) {
                const [x, y] = hovered.current
                ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"
                ctx.lineWidth = 1
                ctx.strokeRect(y * cellSize + .5, x * cellSize + .5, cellSize - 1, cellSize - 1)
            }

            // Player position in canvas pixels, game x goes down and y goes right
            const px = game.pY * cellSize
            const py = game.pX * cellSize

            // Field of view, between the two edges of the camera plane
            ctx.fillStyle = custom.view ?? DEFAULT_COLORS.view
            ctx.beginPath()
            ctx.moveTo(px, py)
            ctx.lineTo(
                px + (game.dirY - game.planeY) * VIEW_LENGTH * cellSize,
                py + (game.dirX - game.planeX) * VIEW_LENGTH * cellSize)
            ctx.lineTo(
                px + (game.dirY + game.planeY) * VIEW_LENGTH * cellSize,
                py + (game.dirX + game.planeX) * VIEW_LENGTH * cellSize)
            ctx.closePath()
            ctx.fill()

            ctx.fillStyle = custom.player ?? DEFAULT_COLORS.player
            ctx.beginPath()
            ctx.arc(px, py, Math.max(2, cellSize * .3), 0, Math.PI * 2)
            ctx.fill()
        }

        frame = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(frame)
    }, [game])

    // Map cell under the mouse, x is the row and y the column like the player position
    const cellAt = (e: MouseEvent<HTMLCanvasElement>): [number, number] | null => {
        if (!game) return null
        const rect = e.currentTarget.getBoundingClientRect()
        const cols = Math.max(...game.map.map(row => row.length))
        const x = Math.floor((e.clientY - rect.top) / rect.height * game.map.length)
        const y = Math.floor((e.clientX - rect.left) / rect.width * cols)
        return game.map[x]?.[y] === undefined ? null : [x, y]
    }

    return (
        <canvas
            ref={canvasRef}
            role="img"
            aria-label="Minimap"
            {...canvasProps}
            style={{
                imageRendering: "pixelated",
                cursor: onCellClick ? "pointer" : undefined,
                ...style,
            }}
            onClick={e => {
                const cell = cellAt(e)
                if (cell) onCellClick?.(...cell)
                onClick?.(e)
            }}
            onMouseMove={e => {
                hovered.current = cellAt(e)
                onMouseMove?.(e)
            }}
            onMouseLeave={e => {
                hovered.current = null
                onMouseLeave?.(e)
            }}
        />
    )
}
