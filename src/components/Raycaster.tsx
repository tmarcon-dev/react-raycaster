import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Game from "../classes/Game";
import { PlayerType, RaycastType, Textures, Tiles } from "../types/RaycastTypes";
import Canvas from "./Canvas";
import { loadTexture } from "../functions/utils";
import { GameContext, RegisterContext } from "./context";

const createGame = (mapKey: string, tiles: Tiles, player: PlayerType, width: number, height: number) => {
    try {
        return new Game(JSON.parse(mapKey), tiles, player, width, height)
    } catch (e) {
        console.error(e)
    }
}

// Reported positions kept to recognize them in the player prop, about a second of movement
const MAX_REPORTED = 60

export default function Raycaster({
    map,
    tiles,
    player,
    width = 500,
    height = 300,
    onPlayerChange,
    children,
    ...props
}: RaycastType) {

    // Compare map and tiles by content so inline props do not reset the game on every render
    const mapKey = useMemo(() => JSON.stringify(map), [map])
    const tilesKey = useMemo(() => JSON.stringify(Object.entries(tiles)
        .map(([id, t]) => [id, t.type, !!t.collision])), [tiles])
    const texturesKey = useMemo(() => JSON.stringify(Object.entries(tiles)
        .map(([id, t]) => [id, t.src])), [tiles])

    // A new game is only created when the map or tiles change, player and resolution changes are applied to the current game
    const gameKey = mapKey + tilesKey
    const [current, setCurrent] = useState(() => ({
        key: gameKey,
        game: createGame(mapKey, tiles, player, width, height),
    }))

    let game = current.game
    if (current.key !== gameKey) {
        game = createGame(mapKey, tiles, player, width, height)
        setCurrent({ key: gameKey, game })
    }

    // Shares the game with the RaycasterProvider around, if any
    const register = useContext(RegisterContext)
    const [owner] = useState(() => ({}))
    useEffect(() => {
        if (!register || !game) return
        register(owner, game)
        return () => register(owner, null)
    }, [register, owner, game])

    // Positions reported to onPlayerChange and not yet seen back in the player prop, oldest first
    // React applies them a few frames later, the player has moved again in the meantime
    const reported = useRef<PlayerType[]>([])
    const onChange = useRef(onPlayerChange)
    useLayoutEffect(() => {
        onChange.current = onPlayerChange
    })
    const report = useCallback((p: PlayerType) => {
        // Bounded in case the parent never stores the reported positions
        if (reported.current.push(p) > MAX_REPORTED) reported.current.shift()
        onChange.current?.(p)
    }, [])

    // Changing the player position or rotation moves the player without resetting the game
    // Values coming back from onPlayerChange are skipped: the player has moved again since, applying them would pull it back
    useEffect(() => {
        const echo = reported.current.findIndex(r =>
            r.x === player.x && r.y === player.y && r.rotation === player.rotation)
        if (echo >= 0) {
            // Older reports can no longer come back
            reported.current.splice(0, echo + 1)
            return
        }
        reported.current = []
        game?.setPlayer({ x: player.x, y: player.y, rotation: player.rotation })
    }, [game, player.x, player.y, player.rotation])

    // Resolution changes keep the current game state
    useEffect(() => {
        game?.setResolution(width, height)
    }, [game, width, height])

    // Tiles textures, indexed by tile id
    const textures = useRef<Textures>(new Map())

    useEffect(() => {
        const loaded: Textures = new Map()
        textures.current = loaded

        const images = (JSON.parse(texturesKey) as [string, string][]).map(([id, src]) =>
            loadTexture(src, texture => loaded.set(Number(id), texture)))

        return () => images.forEach(image => image.onload = null)
    }, [texturesKey])

    if (!game) return null

    return (
        <GameContext.Provider value={game}>
            <Canvas g={game} w={width} h={height} textures={textures} onPlayerChange={onPlayerChange && report} {...props} />

            {children?.(game)}
        </GameContext.Provider>
    )
}
