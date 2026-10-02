import {
  armedSide,
  choiceFromSwipe,
  choiceFromSwipeDx,
  maybeThresholdForHeight,
  stampOpacity,
  swipeThresholdForWidth,
} from './swipeVote';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(choiceFromSwipeDx(121) === 'agree', 'right is works-for-me');
assert(choiceFromSwipeDx(-121) === 'disagree', 'left is not-for-me');
assert(choiceFromSwipeDx(0) === null, 'short drag is not a vote');
assert(choiceFromSwipeDx(120) === null, 'threshold is exclusive');
assert(choiceFromSwipeDx(101, 100) === 'agree', 'custom threshold still maps right to yes');
assert(choiceFromSwipeDx(-99, 100) === null, 'short of custom threshold is not a vote');

assert(choiceFromSwipe(0, 100, 100, 90) === 'maybe', 'pull down is maybe');
assert(choiceFromSwipe(0, -100, 100, 90) === null, 'pull up is not a vote');
assert(choiceFromSwipe(140, 20, 100, 90) === 'agree', 'mostly-horizontal right still works');
assert(choiceFromSwipe(-140, 20, 100, 90) === 'disagree', 'mostly-horizontal left still works');
assert(choiceFromSwipe(40, 40, 100, 90) === null, 'short diagonal is not a vote');

assert(swipeThresholdForWidth(300) === 100, 'commit threshold is one third of the card');
assert(maybeThresholdForHeight(400) === 100, 'maybe threshold is a quarter of the card');
assert(stampOpacity(0, 100) === 0, 'stamp is hidden at rest');
assert(stampOpacity(50, 100) === 0.5, 'stamp fades in with drag');
assert(stampOpacity(100, 100) === 1, 'stamp is full at threshold');
assert(stampOpacity(-100, 100) === 1, 'left drag is also full at threshold');
assert(armedSide(101, 0, 100, 90) === 1, 'haptic arms right');
assert(armedSide(-101, 0, 100, 90) === -1, 'haptic arms left');
assert(armedSide(0, 100, 100, 90) === 2, 'haptic arms maybe');
assert(armedSide(0, 0, 100, 90) === 0, 'dead zone');

console.log('swipeVote tests ok');
