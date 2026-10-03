import { entryBelongsToSeat, mergeLiveEntries, seatEntryCount, seatsThatShared, sharingSeatCount, thoughtCount, thoughtDeck, votableCardIdsForSeat, votingUnlocked } from './entries';
import type { Entry, Seat } from '@/types/room';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const ada: Seat = { id: 's1', displayName: 'Ada', avatarId: 'fox', claimerUids: ['u1'] };
const adaTwo: Seat = { id: 's2', displayName: 'Ada', avatarId: 'fox', claimerUids: ['u1'] };
const guest: Seat = { id: 'u2', displayName: 'Bo', avatarId: 'hat', claimerUids: ['u2'] };

const entries: Entry[] = [
  { id: 'e1', authorId: 'u1', seatId: 's1', text: 'one' },
  { id: 'e2', authorId: 'u1', seatId: 's2', text: 'two' },
  { id: 'e3', authorId: 'u2', text: 'legacy' },
];

assert(entryBelongsToSeat(entries[0]!, ada), 'seatId matches the active seat');
assert(!entryBelongsToSeat(entries[0]!, adaTwo), 'the other seat does not steal this thought');
assert(seatEntryCount(entries, ada) === 1 && seatEntryCount(entries, adaTwo) === 1, 'remaining is per seat');
assert(seatsThatShared([ada, adaTwo, guest], entries) === 3, 'two seats on one uid both count as shared');
assert(entryBelongsToSeat(entries[2]!, guest), 'legacy entries still belong to the uid seat');
assert(seatEntryCount(entries, ada) !== 2, 'uid-global counts are not used');
assert(thoughtCount(entries) === 3, 'thought count comes from the live thought list');
assert(thoughtCount([...entries, { id: 'e4', authorId: 'u1', text: '   ' }]) === 3, 'blank thoughts are not counted');
assert(sharingSeatCount(entries) === 3, 'sharing count is unique seats, not thought count');
assert(!votingUnlocked(entries.slice(0, 1)), 'one seat cannot open voting');
assert(votingUnlocked(entries.slice(0, 2)), 'two seats with thoughts open voting');
assert(votingUnlocked(entries.slice(0, 1), { authorOnlyThoughts: true }), 'author-led rooms open voting after one thought');
assert(!votingUnlocked([], { authorOnlyThoughts: true }), 'author-led rooms still need a thought');
assert(
  mergeLiveEntries(entries.slice(0, 1), []).map((row) => row.id).join(',') === 'e1',
  'a just-submitted thought is not dropped if the live list has not caught up',
);
assert(
  mergeLiveEntries(entries.slice(0, 2), entries.slice(0, 1)).map((row) => row.id).join(',') === 'e1,e2',
  'pending thoughts stay until the live list includes them',
);
assert(
  mergeLiveEntries(entries.slice(0, 1), entries.slice(0, 2)).map((row) => row.id).join(',') === 'e1,e2',
  'the live list wins once it has the thought',
);
assert(
  votableCardIdsForSeat(
    [
      { id: 'e1', sourceEntryIds: ['e1'] },
      { id: 'e2', sourceEntryIds: ['e2'] },
    ],
    entries,
    's1',
  ).join(',') === 'e2',
  'you do not vote on your own thought',
);
assert(
  thoughtDeck(
    [{ id: 'e1', text: 'one', kind: 'synthesized', order: 0, agreeCount: 0, disagreeCount: 0, maybeCount: 0, sourceEntryIds: ['e1'] }],
    entries,
  ).map((row) => row.id).join(',') === 'e1,e2,e3',
  'swipe deck includes thoughts that do not have a card yet',
);

console.log('entry tests ok');
