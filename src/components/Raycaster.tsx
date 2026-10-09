import { createContext, useEffect, useMemo, useRef } from "react";
import Game from "../classes/Game";
import { RaycastType, Textures } from "../types/RaycastTypes";
import Canvas from "./Canvas";

const RaycasterContext = createContext<Game>(null!);

export default function Raycaster({
    map,
    tiles,
    player,
    width = 500,
    height = 300,
    children,
    ...props
}: RaycastType) {

    // Player and resolution are only read when the game is (re)created
    const initial = useRef({ tiles, player, width, height })
    initial.current = { tiles, player, width, height }

    // Compare map and tiles by content so inline props do not reset the game on every render
    const mapKey = useMemo(() => JSON.stringify(map), [map])
    const tilesKey = useMemo(() => JSON.stringify(Object.entries(tiles)
        .map(([id, t]) => [id, t.type, !!t.collision])), [tiles])
    const texturesKey = useMemo(() => JSON.stringify(Object.entries(tiles)
        .map(([id, t]) => [id, t.src])), [tiles])

    // Initialize game object
    const game = useMemo(() => {
        const { tiles, player, width, height } = initial.current
        try {
            return new Game(JSON.parse(mapKey), tiles, player, width, height)
        } catch (e) {
            return console.error(e)
        }
    // tilesKey triggers a new game when tiles types or collisions change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapKey, tilesKey])

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
