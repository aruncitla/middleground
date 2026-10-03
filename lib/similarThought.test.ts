import { classifySimilarity, findSimilarThought, normalizeThought } from './similarThought';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(normalizeThought('Tacos are better').text === 'taco better', 'tacos/are drop to taco better');
assert(normalizeThought('taco is better!').text === 'taco better', 'punct and is drop');
assert(classifySimilarity('Tacos are better', 'taco is better!') === 'exact', 'existing tacos vs taco is better is exact');
assert(classifySimilarity('Tacos are cheaper', 'Tacos taste better') === null, 'cheaper vs taste better is not similar');
assert(classifySimilarity('iPhone 15 is better', 'iPhone 16 is better') === null, 'different numbers do not flag');
assert(classifySimilarity('Pizza is better', 'Tacos are better') === null, 'better/worse with different starts do not flag');
assert(classifySimilarity("don't go", 'dont go') === 'exact', 'don’t folds to dont');
assert(
  classifySimilarity('No. Fruit does not go on pizza', "no, it doesn't go on pizza") != null,
  'fruit does not go on pizza vs it doesn’t go on pizza is similar',
);
assert(
  classifySimilarity('Fruit goes on pizza', 'Fruit does not go on pizza') === null,
  'negated vs affirmative pizza lines do not flag',
);
assert(
  findSimilarThought('taco is better!', [{ id: 'e1', authorId: 'u1', text: 'Tacos are better' }])?.kind === 'exact',
  'finder returns the existing thought',
);
assert(classifySimilarity('yeah, sweet and salty', 'yup, sweet and salty') === 'exact', 'yeah/yup sweet and salty is the same thought');
assert(
  classifySimilarity('Yes, sweet and salty is the whole point.', 'yeah, sweet and salty') != null,
  'longer sweet-and-salty line still flags the existing one',
);

console.log('similarThought tests ok');
