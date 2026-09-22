import { matchSeat, voteBelongsToSeat, voterId } from './seatsLocal';
import type { Seat, Vote } from '@/types/room';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const arun: Seat = { id: 's1', displayName: 'Arun', avatarId: 'hat', claimerUids: ['u1'] };
const guest: Seat = { id: 'u2', displayName: 'Guest', avatarId: 'fox', claimerUids: ['u2'] };

assert(matchSeat([arun, guest], 'arun', 'hat')?.id === 's1', 'name+emoji match is case-insensitive');
assert(matchSeat([arun], 'Arun', 'fox') === null, 'same name different emoji is a different seat');
assert(matchSeat([arun, arun], 'ARUN', 'hat')?.id === 's1', 'rejoin matches the existing seat, not a duplicate');

const voteA: Vote = { id: 's1_c1', uid: 'u1', seatId: 's1', cardId: 'c1', choice: 'agree' };
const voteB: Vote = { id: 's2_c1', uid: 'u1', seatId: 's2', cardId: 'c1', choice: 'disagree' };
const legacy: Vote = { id: 'u2_c1', uid: 'u2', cardId: 'c1', choice: 'agree' };

assert(voterId(voteA) === 's1' && voterId(voteB) === 's2', 'two seats on one browser are two voters');
assert(new Set([voterId(voteA), voterId(voteB)]).size === 2, 'tallies count both seats');
assert(voteBelongsToSeat(voteA, arun) && !voteBelongsToSeat(voteB, arun), 'active seat only sees its votes');
assert(voteBelongsToSeat(legacy, guest), 'grandfathered uid seats still own old votes');
assert(!voteBelongsToSeat(voteA, { ...arun, id: 's9', displayName: 'Arun', avatarId: 'hat' }), 'same name+emoji is not the same seat');

console.log('seat tests ok');
