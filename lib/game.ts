export type Turn = 'player1' | 'player2';
export type GameStatus = 'ongoing' | 'finished';

export type TokenPositions = {
  player1: number;
  player2: number;
};

export type LudoGameState = {
  tokenPositions: TokenPositions;
  currentTurn: Turn;
  lastDice: number | null;
  status: GameStatus;
  winner: Turn | null;
};

export const TRACK_LENGTH = 24;

export const createInitialGameState = (): LudoGameState => ({
  tokenPositions: { player1: -1, player2: -1 },
  currentTurn: 'player1',
  lastDice: null,
  status: 'ongoing',
  winner: null
});

export const getNextTurn = (turn: Turn): Turn => (turn === 'player1' ? 'player2' : 'player1');

export const getTokenStartIndex = (turn: Turn): number => (turn === 'player1' ? 0 : TRACK_LENGTH / 2);

export const moveTokenWithRules = (currentPosition: number, dice: number, turn: Turn) => {
  if (currentPosition === -1) {
    if (dice !== 6) {
      return { newPosition: currentPosition, moved: false };
    }

    return { newPosition: getTokenStartIndex(turn), moved: true };
  }

  const target = currentPosition + dice;
  if (target >= TRACK_LENGTH) {
    return { newPosition: currentPosition, moved: false };
  }

  return { newPosition: target, moved: true };
};

export const hasWon = (position: number) => position === TRACK_LENGTH - 1;
