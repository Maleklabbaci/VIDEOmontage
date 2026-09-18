import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STARTING_POINTS = 1500;
const ACCESS_THRESHOLD = 1000;
const MONTAGE_COST = 250;
const COOKIE_NAME = 'video_montage_wallet';
const WALLET_DIR = path.join(process.cwd(), 'storage', 'wallets');

type Wallet = { points: number; updatedAt: string };

async function walletPath(id: string) {
  await mkdir(WALLET_DIR, { recursive: true });
  return path.join(WALLET_DIR, `${id}.json`);
}

async function loadWallet(id: string): Promise<Wallet> {
  try {
    return JSON.parse(await readFile(await walletPath(id), 'utf8')) as Wallet;
  } catch {
    const wallet = { points: STARTING_POINTS, updatedAt: new Date().toISOString() };
    await writeFile(await walletPath(id), JSON.stringify(wallet), 'utf8');
    return wallet;
  }
}

async function saveWallet(id: string, points: number) {
  const wallet = { points, updatedAt: new Date().toISOString() };
  await writeFile(await walletPath(id), JSON.stringify(wallet), 'utf8');
  return wallet;
}

function getWalletId(request: Request) {
  const current = request.headers.get('cookie')?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1];
  return current || randomUUID();
}

function response(data: Record<string, unknown>, walletId: string, status = 200) {
  const result = NextResponse.json(data, { status });
  result.headers.append('Set-Cookie', `${COOKIE_NAME}=${walletId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
  return result;
}

export async function GET(request: Request) {
  const walletId = getWalletId(request);
  const wallet = await loadWallet(walletId);
  return response({ points: wallet.points, accessThreshold: ACCESS_THRESHOLD, montageCost: MONTAGE_COST, canAccessMontage: wallet.points > ACCESS_THRESHOLD }, walletId);
}

export async function POST(request: Request) {
  const walletId = getWalletId(request);
  const input = await request.json().catch(() => ({}));
  const operation = input?.operation === 'refund' ? 'refund' : 'debit';
  const wallet = await loadWallet(walletId);

  if (operation === 'debit') {
    if (wallet.points <= ACCESS_THRESHOLD) {
      return response({ error: `Accès refusé : il faut plus de ${ACCESS_THRESHOLD} points pour lancer un montage.`, points: wallet.points, accessThreshold: ACCESS_THRESHOLD }, walletId, 402);
    }
    if (wallet.points < MONTAGE_COST) {
      return response({ error: `Points insuffisants : ce montage coûte ${MONTAGE_COST} points.`, points: wallet.points }, walletId, 402);
    }
    const updated = await saveWallet(walletId, wallet.points - MONTAGE_COST);
    return response({ points: updated.points, charged: MONTAGE_COST, canAccessMontage: updated.points > ACCESS_THRESHOLD }, walletId);
  }

  const updated = await saveWallet(walletId, wallet.points + MONTAGE_COST);
  return response({ points: updated.points, refunded: MONTAGE_COST, canAccessMontage: updated.points > ACCESS_THRESHOLD }, walletId);
}

export const __walletConfig = { STARTING_POINTS, ACCESS_THRESHOLD, MONTAGE_COST };
