import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'ethers';
import { z } from 'zod';

import { createInitialGameState } from '@/lib/game';
import { prisma } from '@/lib/prisma';

const createMatchSchema = z.object({
  player1Wallet: z.string().trim().toLowerCase(),
  mode: z.enum(['bot', 'pvp-sim'])
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createMatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid create match payload.' }, { status: 400 });
    }

    const { player1Wallet, mode } = parsed.data;

    if (!isAddress(player1Wallet)) {
      return NextResponse.json({ error: 'Invalid player1 wallet address.' }, { status: 400 });
    }

    const matchId = randomUUID();
    const player2 = mode === 'bot' ? 'BOT_OPPONENT' : 'SIMULATED_PLAYER_2';
    const state = createInitialGameState();

    const match = await prisma.match.create({
      data: {
        matchId,
        player1: player1Wallet,
        player2,
        currentTurn: state.currentTurn,
        status: state.status,
        gameState: JSON.stringify(state),
        winner: null
      }
    });

    return NextResponse.json({
      matchId: match.matchId,
      player1: match.player1,
      player2: match.player2,
      currentTurn: match.currentTurn,
      status: match.status,
      winner: match.winner,
      gameState: JSON.parse(match.gameState)
    });
  } catch {
    return NextResponse.json({ error: 'Unable to create match right now.' }, { status: 500 });
  }
}
