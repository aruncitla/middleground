import {
  featuredPacks,
  isPackInSeason,
  pastSeasonPacks,
  PROMPT_PACKS,
  seasonalBanner,
  seasonDaysLeft,
} from './promptPacks';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(PROMPT_PACKS.length === 8, '8 packs');
assert(
  PROMPT_PACKS.filter((p) => !p.season).length === 5,
  '5 evergreen',
);
assert(
  PROMPT_PACKS.filter((p) => p.season).map((p) => p.id).join(',') === 'halloween,diwali,new-year',
  '3 seasonal',
);
for (const pack of PROMPT_PACKS) {
  assert(pack.prompts.length >= 6, `${pack.id} has prompts`);
}

const halloween = PROMPT_PACKS.find((p) => p.id === 'halloween')!.season!;
assert(isPackInSeason(halloween, new Date(2026, 9, 1)), 'Halloween starts Oct 1');
assert(isPackInSeason(halloween, new Date(2026, 9, 20)), 'Halloween mid-season');
assert(isPackInSeason(halloween, new Date(2026, 10, 1)), 'Halloween includes Nov 1');
assert(!isPackInSeason(halloween, new Date(2026, 10, 2)), 'Nov 2 is past Halloween');
assert(!isPackInSeason(halloween, new Date(2026, 8, 20)), 'Sep 20 is before Halloween');

const diwali = PROMPT_PACKS.find((p) => p.id === 'diwali')!.season!;
assert(isPackInSeason(diwali, new Date(2026, 9, 20)), 'Diwali starts Oct 20');
assert(!isPackInSeason(diwali, new Date(2026, 10, 11)), 'Diwali ends Nov 10');

const nye = PROMPT_PACKS.find((p) => p.id === 'new-year')!.season!;
assert(isPackInSeason(nye, new Date(2026, 11, 26)), 'NYE starts Dec 26');
assert(isPackInSeason(nye, new Date(2027, 0, 7)), 'NYE includes Jan 7');
assert(!isPackInSeason(nye, new Date(2027, 0, 8)), 'Jan 8 is past NYE');
assert(!isPackInSeason(nye, new Date(2026, 11, 25)), 'Dec 25 is before NYE');

const oct20 = new Date(2026, 9, 20, 12);
assert(
  featuredPacks(oct20).map((p) => p.id).join(',') === 'halloween,diwali',
  'Oct 20 features Halloween and Diwali',
);
assert(seasonalBanner(PROMPT_PACKS.find((p) => p.id === 'halloween')!, oct20)?.includes('Halloween'), 'banner names Halloween');
assert(seasonDaysLeft(halloween, oct20) >= 12, 'mid-October still has days left');

const nov2 = new Date(2026, 10, 2);
assert(!featuredPacks(nov2).some((p) => p.id === 'halloween'), 'Halloween not featured Nov 2');
assert(
  pastSeasonPacks(nov2).some((p) => p.id === 'halloween'),
  'Halloween playable under past seasons on Nov 2',
);

console.log('promptPacks tests ok');
