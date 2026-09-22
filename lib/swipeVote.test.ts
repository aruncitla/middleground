import { choiceFromSwipeDx } from './swipeVote';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(choiceFromSwipeDx(121) === 'agree', 'right is yes');
assert(choiceFromSwipeDx(-121) === 'disagree', 'left is no');
assert(choiceFromSwipeDx(0) === null, 'short drag is not a vote');
assert(choiceFromSwipeDx(120) === null, 'threshold is exclusive');

console.log('swipeVote tests ok');
