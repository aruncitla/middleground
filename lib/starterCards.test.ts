import { isExampleCard, starterCardsForRoom, STARTER_LIVE_THRESHOLD, withStarterCards } from './starterCards';
import type { Card } from '@/types/room';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function card(id: string): Card {
  return {
    id,
    text: id,
    kind: 'synthesized',
    order: 0,
    agreeCount: 0,
    disagreeCount: 0,
    maybeCount: 0,
  };
}

const starters = starterCardsForRoom('Pineapple on pizza');
assert(starters.length === 2, 'two example cards');
assert(starters.every(isExampleCard), 'examples are labeled');
assert(starters[0]?.text.includes('Example:'), 'example prefix is visible');

assert(withStarterCards([card('a')], 'x').length === 3, 'starters pad a new room');
const many = Array.from({ length: STARTER_LIVE_THRESHOLD }, (_, i) => card(`g${i}`));
assert(withStarterCards(many, 'x').every((c) => !isExampleCard(c)), 'starters drop once 5 genuine thoughts exist');

console.log('starterCards tests ok');
