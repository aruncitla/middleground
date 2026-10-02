import { orderByIds, shuffleIds } from './deckShuffle';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const ids = ['a', 'b', 'c', 'd', 'e'];
const once = shuffleIds(ids, 'room-1');
const twice = shuffleIds(ids, 'room-1');
assert(once.join() === twice.join(), 'same seed same order');
assert(shuffleIds(ids, 'room-2').join() !== once.join() || ids.length < 3, 'different seed usually differs');
assert([...once].sort().join() === [...ids].sort().join(), 'shuffle keeps every id');

const rows = [{ id: 'c' }, { id: 'a' }, { id: 'b' }];
assert(orderByIds(rows, ['a', 'b', 'c']).map((r) => r.id).join() === 'a,b,c', 'order follows shuffled ids');

console.log('deckShuffle tests ok');
