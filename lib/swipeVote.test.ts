import { armedSide, choiceFromSwipeDx, stampOpacity, swipeThresholdForWidth } from './swipeVote';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(choiceFromSwipeDx(121) === 'agree', 'right is yes');
assert(choiceFromSwipeDx(-121) === 'disagree', 'left is no');
assert(choiceFromSwipeDx(0) === null, 'short drag is not a vote');
assert(choiceFromSwipeDx(120) === null, 'threshold is exclusive');
assert(choiceFromSwipeDx(101, 100) === 'agree', 'custom threshold still maps right to yes');
assert(choiceFromSwipeDx(-99, 100) === null, 'short of custom threshold is not a vote');

assert(swipeThresholdForWidth(300) === 100, 'commit threshold is one third of the card');
assert(stampOpacity(0, 100) === 0, 'stamp is hidden at rest');
assert(stampOpacity(50, 100) === 0.5, 'stamp fades in with drag');
assert(stampOpacity(100, 100) === 1, 'stamp is full at threshold');
assert(stampOpacity(-100, 100) === 1, 'left drag is also full at threshold');
assert(armedSide(101, 100) === 1 && armedSide(-101, 100) === -1 && armedSide(0, 100) === 0, 'haptic arms at threshold');

console.log('swipeVote tests ok');
