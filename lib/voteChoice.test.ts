import { agreementScore, bucketCounts, discussionScore, percents, tickPosition } from './voteChoice';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const split = bucketCounts({ agreeCount: 6, maybeCount: 2, disagreeCount: 2 });
assert(split.total === 10, 'total includes maybe');
assert(agreementScore(split) === 60, '6 of 10 is 60%');
assert(percents(split).agree === 60, 'works-for-me percent');

const hard = bucketCounts({ agreeCount: 5, disagreeCount: 5, maybeCount: 0 });
assert(agreementScore(hard) === 50, 'a hard split stays 50');

assert(discussionScore([
  { agreeCount: 6, maybeCount: 2, disagreeCount: 2 },
  { agreeCount: 5, disagreeCount: 5, maybeCount: 0 },
]) === 55, 'discussion score averages per-question scores');
assert(discussionScore([]) === 0, 'no votes is 0');

assert(tickPosition('maybe') > 0.4 && tickPosition('maybe') < 0.6, 'maybes sit in the middle');
assert(tickPosition('disagree') < 0.3, 'not-for-me sits left');
assert(tickPosition('agree') > 0.7, 'works-for-me sits right');

console.log('voteChoice tests ok');
