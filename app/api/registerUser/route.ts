import { isAddress } from 'ethers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

const registerSchema = z.object({
  walletAddress: z.string().trim().toLowerCase()
});

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: 'walletAddress is required.' }, { status: 400 });
    }

    const { walletAddress } = parsed.data;

    if (!isAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address format.' }, { status: 400 });
    }

    const now = new Date();

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: { lastLogin: now },
      create: {
        walletAddress,
        createdAt: now,
        lastLogin: now
      }
    });

    return NextResponse.json({
      status: user.createdAt.getTime() === user.lastLogin.getTime() ? 'created' : 'updated',
      walletAddress: user.walletAddress,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin.toISOString()
    });
  } catch {
    return NextResponse.json({ error: 'Unable to register wallet right now.' }, { status: 500 });
  }
}
