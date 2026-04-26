'use client';

import { BrowserProvider, Eip1193Provider, isAddress } from 'ethers';
import { useEffect, useMemo, useState } from 'react';

import {
  createInitialGameState,
  getNextTurn,
  hasWon,
  LudoGameState,
  moveTokenWithRules,
  TRACK_LENGTH,
  Turn
} from '@/lib/game';

type MatchMode = 'bot' | 'pvp-sim';

type MatchPayload = {
  matchId: string;
  player1: string;
  player2: string;
  currentTurn: Turn;
  status: 'ongoing' | 'finished';
  winner: Turn | null;
  gameState: LudoGameState;
};

const BOARD_CELLS = [
  [0, 5], [0, 4], [0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [4, 0], [5, 0], [6, 0],
  [6, 1], [6, 2], [6, 3], [7, 3], [8, 3], [9, 3], [9, 4], [9, 5], [9, 6], [8, 6], [7, 6], [6, 6]
] as const;

export default function HomePage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [authMessage, setAuthMessage] = useState('Not connected');
  const [error, setError] = useState('');
  const [loadingWallet, setLoadingWallet] = useState(false);

  const [matchMode, setMatchMode] = useState<MatchMode>('bot');
  const [match, setMatch] = useState<MatchPayload | null>(null);
  const [gameState, setGameState] = useState<LudoGameState>(createInitialGameState());
  const [rolling, setRolling] = useState(false);
  const [diceFace, setDiceFace] = useState(1);
  const [gameMessage, setGameMessage] = useState('Start a match to play.');

  const isBotTurn = useMemo(() => {
    if (!match) return false;
    return match.player2 === 'BOT_OPPONENT' && gameState.currentTurn === 'player2' && gameState.status === 'ongoing';
  }, [match, gameState]);

  const connectWallet = async () => {
    setError('');
    setLoadingWallet(true);

    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not available. Please install it first.');
      }

      const provider = new BrowserProvider(window.ethereum as Eip1193Provider);
      const accounts = await provider.send('eth_requestAccounts', []);
      const account = accounts?.[0];

      if (!account || !isAddress(account)) {
        throw new Error('Invalid wallet address returned by provider.');
      }

      const normalized = account.toLowerCase();
      setWalletAddress(normalized);

      const response = await fetch('/api/registerUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: normalized })
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Registration failed');
      }

      setAuthMessage('Wallet connected and user registered.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Wallet connection failed.');
      setAuthMessage('Not connected');
      setWalletAddress('');
    } finally {
      setLoadingWallet(false);
    }
  };

  const syncMatchState = async (matchId: string, state: LudoGameState) => {
    await fetch('/api/updateMatchState', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, gameState: state })
    });
  };

  const startMatch = async () => {
    if (!walletAddress) {
      setError('Connect your wallet before starting a match.');
      return;
    }

    setError('');
    const response = await fetch('/api/createMatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player1Wallet: walletAddress, mode: matchMode })
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? 'Could not create match.');
      return;
    }

    const payload = (await response.json()) as MatchPayload;
    setMatch(payload);
    setGameState(payload.gameState);
    setGameMessage(`Match ${payload.matchId.slice(0, 8)} started. Player 1 turn.`);
  };

  const animateAndApplyMove = async (actor: Turn, dice: number) => {
    if (!match) return;

    const currentPos = gameState.tokenPositions[actor];
    const move = moveTokenWithRules(currentPos, dice, actor);

    let latestState = { ...gameState, lastDice: dice };

    if (move.moved && currentPos !== -1) {
      for (let step = 1; step <= dice; step += 1) {
        await new Promise((resolve) => setTimeout(resolve, 220));
        const interimPos = currentPos + step;
        if (interimPos >= TRACK_LENGTH) break;

        latestState = {
          ...latestState,
          tokenPositions: { ...latestState.tokenPositions, [actor]: interimPos }
        };

        setGameState(latestState);
      }
    } else if (move.moved && currentPos === -1) {
      await new Promise((resolve) => setTimeout(resolve, 240));
      latestState = {
        ...latestState,
        tokenPositions: { ...latestState.tokenPositions, [actor]: move.newPosition }
      };
      setGameState(latestState);
    }

    const finalPos = move.moved ? move.newPosition : currentPos;
    const won = hasWon(finalPos);

    const nextState: LudoGameState = {
      ...latestState,
      tokenPositions: { ...latestState.tokenPositions, [actor]: finalPos },
      status: won ? 'finished' : 'ongoing',
      winner: won ? actor : null,
      currentTurn: won ? actor : dice === 6 ? actor : getNextTurn(actor)
    };

    setGameState(nextState);
    setGameMessage(
      won
        ? `${actor === 'player1' ? 'Player 1' : 'Player 2'} wins!`
        : `Dice: ${dice}. ${nextState.currentTurn === 'player1' ? 'Player 1' : 'Player 2'} turn.`
    );

    await syncMatchState(match.matchId, nextState);
  };

  const runTurn = async (actor: Turn) => {
    if (!match || rolling || gameState.status === 'finished') return;

    setRolling(true);
    for (let i = 0; i < 8; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 70));
      setDiceFace(Math.floor(Math.random() * 6) + 1);
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    setDiceFace(dice);
    await animateAndApplyMove(actor, dice);
    setRolling(false);
  };

  useEffect(() => {
    if (!isBotTurn || rolling) return;

    const timer = setTimeout(() => {
      void runTurn('player2');
    }, 1200);

    return () => clearTimeout(timer);
  }, [isBotTurn, rolling]);

  const activeTurnLabel = gameState.currentTurn === 'player1' ? 'Player 1' : 'Player 2';
  const p1Cell = gameState.tokenPositions.player1;
  const p2Cell = gameState.tokenPositions.player2;

  return (
    <main>
      <section className="card">
        <h1>Ludo Web3</h1>
        <p>Phase 2 MVP: playable board, turn system, matchmaking, and bot logic.</p>

        <button onClick={connectWallet} disabled={loadingWallet}>
          {loadingWallet ? 'Connecting...' : 'Connect Wallet'}
        </button>
        <div className="status">{authMessage}</div>
        {walletAddress ? <code>{walletAddress}</code> : null}

        <div className="controls">
          <select value={matchMode} onChange={(event) => setMatchMode(event.target.value as MatchMode)}>
            <option value="bot">Player vs Bot</option>
            <option value="pvp-sim">Player vs Simulated Player</option>
          </select>
          <button onClick={startMatch} disabled={!walletAddress || rolling}>Start Match</button>
        </div>

        {match ? (
          <>
            <div className="players">
              <div className="avatar player1">P1</div>
              <div>
                <strong>Player 1:</strong> {match.player1.slice(0, 10)}...
              </div>
              <div className="avatar player2">P2</div>
              <div>
                <strong>Player 2:</strong> {match.player2 === 'BOT_OPPONENT' ? 'Bot Opponent' : 'Simulated Player'}
              </div>
            </div>

            <div className="turn">Turn: {activeTurnLabel}</div>
            <div className="dice">🎲 {diceFace}</div>
            <button
              onClick={() => runTurn('player1')}
              disabled={rolling || gameState.currentTurn !== 'player1' || gameState.status === 'finished'}
            >
              {rolling ? 'Rolling...' : 'Roll Dice'}
            </button>

            <div className="board">
              {BOARD_CELLS.map(([row, col], index) => (
                <div key={`${row}-${col}`} className="cell" style={{ gridRow: row + 1, gridColumn: col + 1 }}>
                  {index === p1Cell ? <span className="token token1" /> : null}
                  {index === p2Cell ? <span className="token token2" /> : null}
                </div>
              ))}
            </div>

            {gameState.status === 'finished' ? (
              <div className="win">
                {gameState.winner === 'player1' ? 'You Win 🎉' : 'You Lose 🤖'}
              </div>
            ) : null}
          </>
        ) : null}

        <div className="status">{gameMessage}</div>
        {error ? <div className="error">{error}</div> : null}
      </section>
    </main>
  );
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}
