import { entryBelongsToSeat, seatEntryCount, seatsThatShared, thoughtCount } from './entries';
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

console.log('entry tests ok');
