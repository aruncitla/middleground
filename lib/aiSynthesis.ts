import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/lib/firebase';
import { isUsableThought } from '@/lib/cardQuality';
import type { SynthesisCard } from '@/types/room';
import { DECK_LIMIT } from '@/lib/roomService';

export function mockSynthesize(entries: { text: string }[], _topic: string): SynthesisCard[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const entry of entries) {
    const text = entry.text.trim().replace(/\s+/g, ' ');
    const key = text.toLowerCase();
    if (!isUsableThought(text) || seen.has(key)) continue;
    seen.add(key);
    unique.push(text);
  }
  return unique.slice(0, DECK_LIMIT).map((text) => ({
    text,
    kind: 'synthesized',
  }));
}

export async function callSynthesizeRoom(roomCode: string): Promise<void> {
  const fn = httpsCallable<{ roomCode: string }, { cardCount: number }>(
    getFirebaseFunctions(),
    'synthesizeRoom',
  );
  await fn({ roomCode });
}
