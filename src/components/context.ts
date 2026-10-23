import { createContext, useContext } from "react";
import Game from "../classes/Game";

// Game of the nearest Raycaster or RaycasterProvider
export const GameContext = createContext<Game | null>(null)

// Lets a Raycaster share its game with the components of the provider around it
export const RegisterContext = createContext<((owner: object, game: Game | null) => void) | null>(null)

// Game of the nearest Raycaster or RaycasterProvider, null until the Raycaster has created it
export const useRaycaster = () => useContext(GameContext)
