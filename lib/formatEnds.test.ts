import { formatClosesIn, isClosingSoon, liveDeadline } from './formatEnds';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const now = Date.parse('2026-09-28T12:00:00.000Z');
const hour = 60 * 60 * 1000;
const day = 24 * hour;

const minute = 60 * 1000;

assert(formatClosesIn(new Date(now + 2 * day + 4 * hour), now) === 'Closes in 2d 4h', 'days and hours');
assert(formatClosesIn(new Date(now + 3 * day), now) === 'Closes in 3d', 'exact days');
assert(formatClosesIn(new Date(now + hour), now) === 'Closes in 1h', 'one hour is still a countdown');
assert(formatClosesIn(new Date(now + hour + 12 * minute), now) === 'Closes in 1h 12m', 'hours keep leftover minutes');
assert(formatClosesIn(new Date(now + 30 * minute), now) === 'Closes in 30m', 'a 30-minute room shows minutes');
assert(formatClosesIn(new Date(now + 59 * minute), now) === 'Closes in 59m', 'under an hour still counts down');
assert(formatClosesIn(new Date(now + 20 * 1000), now) === 'Closing soon', 'last minute');
assert(formatClosesIn(new Date(now - 1000), now) === 'Closed', 'past deadline');
assert(!isClosingSoon(new Date(now + 30 * minute), now), '30 minutes left is not the soon state');
assert(isClosingSoon(new Date(now + 4 * minute), now), 'the last five minutes are soon');

const lobby = { status: 'lobby', closesAt: new Date(now + day) };
const swipe = { status: 'swiping', closesAt: new Date(now + day), votesCloseAt: new Date(now + 2 * hour) };
assert(liveDeadline(lobby)?.getTime() === lobby.closesAt.getTime(), 'lobby uses the room clock');
assert(liveDeadline(swipe)?.getTime() === swipe.votesCloseAt.getTime(), 'swipe uses the vote end when it exists');
assert(liveDeadline({ status: 'swiping', closesAt: lobby.closesAt })?.getTime() === lobby.closesAt.getTime(), 'swipe falls back to the room clock');
assert(liveDeadline({ status: 'summary', closesAt: lobby.closesAt }) === undefined, 'locked rooms have no live clock');

console.log('formatEnds tests ok');
