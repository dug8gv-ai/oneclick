import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const matchId = request.nextUrl.searchParams.get('matchId');

    if (!matchId) {
      return NextResponse.json({ error: 'matchId is required.' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { matchId } });

    if (!match) {
      return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
    }

    return NextResponse.json({
      matchId: match.matchId,
      player1: match.player1,
      player2: match.player2,
      currentTurn: match.currentTurn,
      status: match.status,
      winner: match.winner,
      gameState: match.gameState
    });
  } catch {
    return NextResponse.json({ error: 'Unable to fetch match.' }, { status: 500 });
  }
}
