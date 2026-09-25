import { createContext, useContext } from "react";

interface DiceRollerContextType {
  openRoll: (title: string, modifier: number, characterName?: string, characterId?: number, damage?: {
    diceSides: 0 | 4 | 6 | 8 | 10 | 12;
    diceCount: 0 | 1 | 2;
    bonusDiceSides?: 4 | 6 | 8 | 10 | 12;
    bonusDiceCount?: 1 | 2;
  }) => void;
}

export const DiceRollerContext = createContext<DiceRollerContextType | undefined>(undefined);

export function useDiceRoller() {
  const context = useContext(DiceRollerContext);
  if (!context) throw new Error("useDiceRoller must be used within DiceRollerProvider");
  return context;
}