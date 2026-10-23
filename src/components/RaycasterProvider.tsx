import { ReactNode, useCallback, useRef, useState } from "react";
import Game from "../classes/Game";
import { GameContext, RegisterContext } from "./context";

// Shares the game of the Raycaster inside it with any component below, like a Minimap or custom controls
export function RaycasterProvider({ children }: { children: ReactNode }) {
    const [game, setGame] = useState<Game | null>(null)
    const owner = useRef<object | null>(null)

    const register = useCallback((o: object, g: Game | null) => {
        if (g) {
            if (owner.current && owner.current !== o)
                console.warn("RaycasterProvider: only one Raycaster per provider is supported, the last one mounted is used")
            owner.current = o
            setGame(g)
        } else if (owner.current === o) {
            owner.current = null
            setGame(null)
        }
    }, [])

    return (
        <RegisterContext.Provider value={register}>
            <GameContext.Provider value={game}>
                {children}
            </GameContext.Provider>
        </RegisterContext.Provider>
    )
}
