import type { Card } from '@/types/room';

export const STARTER_LIVE_THRESHOLD = 5;

export function isExampleCard(card: Pick<Card, 'id' | 'example'>) {
  return Boolean(card.example) || card.id.startsWith('_example');
}

export function starterCardsForRoom(topic: string): Card[] {
  const prompt = topic.trim() || 'this';
  return [
    {
      id: '_example_1',
      text: `Example: One way I’d start on “${prompt}”.`,
      kind: 'synthesized',
      order: -2,
      agreeCount: 0,
      disagreeCount: 0,
      maybeCount: 0,
      example: true,
    },
    {
      id: '_example_2',
      text: 'Example: A thought the other side of the room might share.',
      kind: 'synthesized',
      order: -1,
      agreeCount: 0,
      disagreeCount: 0,
      maybeCount: 0,
      example: true,
    },
  ];
}

export function withStarterCards(cards: Card[], topic: string) {
  const genuine = cards.filter((card) => !isExampleCard(card));
  if (genuine.length >= STARTER_LIVE_THRESHOLD) return genuine;
  return [...starterCardsForRoom(topic), ...genuine];
}
