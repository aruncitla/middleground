import { topicIsLive, verdictLine, weekStreak } from './verdict';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function card(text: string, agree: number, disagree: number) {
  return { text, agreeCount: agree, disagreeCount: disagree };
}

assert(topicIsLive('lobby') && topicIsLive('swiping') && !topicIsLive('summary'), 'live vs archived');

assert(
  verdictLine([card('Goa', 5, 0), card('dates', 3, 2)]) === '✅ Locked in: Goa (5/5) · 🤝 Split: dates (3/2)',
  'Goa lock + dates split',
);
assert(verdictLine([]) === 'No votes yet', 'empty');
assert(verdictLine([card('Cats', 0, 4)]).startsWith('No lock-in'), 'all-no');

const now = new Date(2026, 8, 20);
const thisWeek = new Date(2026, 8, 18);
const lastWeek = new Date(2026, 8, 11);
const twoBack = new Date(2026, 8, 4);
assert(weekStreak([thisWeek, lastWeek, twoBack], now) === 3, '3-week streak');
assert(weekStreak([lastWeek], now) === 1, 'missed this week still counts last week');
assert(weekStreak([], now) === 0, 'no dates');

console.log('verdict tests ok');
