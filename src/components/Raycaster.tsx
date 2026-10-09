import { createContext, useEffect, useMemo, useRef, useState } from "react";
import Game from "../classes/Game";
import { PlayerType, RaycastType, Textures, Tiles } from "../types/RaycastTypes";
import Canvas from "./Canvas";

const RaycasterContext = createContext<Game>(null!);

const createGame = (mapKey: string, tiles: Tiles, player: PlayerType, width: number, height: number) => {
    try {
        return new Game(JSON.parse(mapKey), tiles, player, width, height)
    } catch (e) {
        console.error(e)
    }
}

export default function Raycaster({
    map,
    tiles,
    player,
    width = 500,
    height = 300,
    children,
    ...props
}: RaycastType) {

    // Compare map and tiles by content so inline props do not reset the game on every render
    const mapKey = useMemo(() => JSON.stringify(map), [map])
    const tilesKey = useMemo(() => JSON.stringify(Object.entries(tiles)
        .map(([id, t]) => [id, t.type, !!t.collision])), [tiles])
    const texturesKey = useMemo(() => JSON.stringify(Object.entries(tiles)
        .map(([id, t]) => [id, t.src])), [tiles])

    // A new game is only created when the map or tiles change, player and resolution are initial values
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

    // Resolution changes keep the current game state
    useEffect(() => {
        game?.setResolution(width, height)
    }, [game, width, height])

    // Tiles textures, indexed by tile id
    const textures = useRef<Textures>(new Map())

    useEffect(() => {
        const loaded: Textures = new Map()
        textures.current = loaded

        const images = (JSON.parse(texturesKey) as [string, string][]).map(([id, src]) => {
            const image = new Image();
            image.onload = () => loaded.set(Number(id), image)
            image.crossOrigin = "Anonymous";
            image.src = src;
            return image
        })

        return () => images.forEach(image => image.onload = null)
    }, [texturesKey])

    if (!game) return null

    return (
        <RaycasterContext.Provider value={game}>
            <Canvas g={game} w={width} h={height} textures={textures} {...props} />

            {children &&
                <RaycasterContext.Consumer>
                    {children}
                </RaycasterContext.Consumer>}
        </RaycasterContext.Provider>
    )
}
