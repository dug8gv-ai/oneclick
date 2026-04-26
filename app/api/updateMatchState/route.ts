import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { LudoGameState } from '@/lib/game';
import { prisma } from '@/lib/prisma';

const updateMatchStateSchema = z.object({
  matchId: z.string().min(1),
  gameState: z.object({
    tokenPositions: z.object({
      player1: z.number().int(),
      player2: z.number().int()
    }),
    currentTurn: z.enum(['player1', 'player2']),
    lastDice: z.number().int().min(1).max(6).nullable(),
    status: z.enum(['ongoing', 'finished']),
    winner: z.enum(['player1', 'player2']).nullable()
  })
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateMatchStateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid match state payload.' }, { status: 400 });
    }

    const { matchId, gameState } = parsed.data;

    const updated = await prisma.match.update({
      where: { matchId },
      data: {
        currentTurn: gameState.currentTurn,
        status: gameState.status,
        winner: gameState.winner,
        gameState: gameState as unknown as LudoGameState
      }
    });

    return NextResponse.json({
      matchId: updated.matchId,
      currentTurn: updated.currentTurn,
      status: updated.status,
      winner: updated.winner,
      gameState: updated.gameState
    });
  } catch {
    return NextResponse.json({ error: 'Unable to update match state.' }, { status: 500 });
  }
}
