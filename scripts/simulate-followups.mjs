import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomRoomCode() {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}

function client(name) {
  const app = initializeApp(firebaseConfig, name);
  return { app, auth: getAuth(app), db: getFirestore(app) };
}

async function asUser(name) {
  const c = client(name);
  const cred = await signInAnonymously(c.auth);
  return { ...c, uid: cred.user.uid, name };
}

async function createRoom(db, hostId, topic, extras = {}) {
  for (let i = 0; i < 8; i++) {
    const code = randomRoomCode();
    const ref = doc(db, 'rooms', code);
    const snap = await getDoc(ref);
    if (snap.exists()) continue;
    await setDoc(ref, {
      topic,
      hostId,
      status: 'lobby',
      entryLimit: 10,
      round: extras.round ?? 1,
      createdAt: serverTimestamp(),
      closesAt: new Date(Date.now() + 60 * 60 * 1000),
      closeWindow: '1h',
      ...(extras.parentRoomId ? { parentRoomId: extras.parentRoomId } : {}),
      ...(extras.parentCardId ? { parentCardId: extras.parentCardId } : {}),
    });
    return code;
  }
  throw new Error('Could not allocate a room code');
}

async function join(db, code, uid, displayName, avatarId) {
  await setDoc(doc(db, 'rooms', code, 'participants', uid), {
    displayName,
    avatarId,
    joinedAt: serverTimestamp(),
    entryCount: 0,
    finishedSwiping: false,
  });
}

async function submit(db, code, uid, text) {
  const rRef = doc(db, 'rooms', code);
  const pRef = doc(db, 'rooms', code, 'participants', uid);
  await runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(rRef);
    const pSnap = await tx.get(pRef);
    if (!roomSnap.exists() || !pSnap.exists()) throw new Error('join first');
    const entryRef = doc(collection(db, 'rooms', code, 'entries'));
    tx.set(entryRef, { authorId: uid, text, createdAt: serverTimestamp() });
    tx.update(pRef, { entryCount: increment(1) });
  });
}

async function writeDeckAndOpenVotes(db, code, cards) {
  await updateDoc(doc(db, 'rooms', code), { status: 'synthesizing', closedBy: 'script', closeReason: 'manual' });
  const batch = writeBatch(db);
  const cardIds = [];
  cards.forEach((card, order) => {
    const ref = doc(collection(db, 'rooms', code, 'cards'));
    cardIds.push({ id: ref.id, text: card.text });
    batch.set(ref, {
      text: card.text,
      kind: 'synthesized',
      order,
      agreeCount: 0,
      disagreeCount: 0,
      createdAt: serverTimestamp(),
    });
  });
  batch.update(doc(db, 'rooms', code), {
    status: 'swiping',
    votesCloseAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  await batch.commit();
  return cardIds;
}

async function voteAll(usersByKey, people, code, cardIds, votePlan) {
  for (const person of people) {
    const u = usersByKey[person.key];
    const choices = votePlan[person.key];
    for (let i = 0; i < cardIds.length; i++) {
      const cardId = cardIds[i].id;
      const choice = choices[i];
      const voteRef = doc(u.db, 'rooms', code, 'votes', `${u.uid}_${cardId}`);
      const cardRef = doc(u.db, 'rooms', code, 'cards', cardId);
      await runTransaction(u.db, async (tx) => {
        const existing = await tx.get(voteRef);
        if (existing.exists()) return;
        tx.set(voteRef, { uid: u.uid, cardId, choice });
        tx.update(cardRef, {
          [choice === 'agree' ? 'agreeCount' : 'disagreeCount']: increment(1),
        });
      });
    }
  }
}

async function lockResults(db, code) {
  await updateDoc(doc(db, 'rooms', code), { status: 'summary' });
}

async function recordUnanimousToParent(db, { targetCode, sourceCode, round, parentCardId, cardIds }) {
  const written = [];
  const batch = writeBatch(db);
  for (const card of cardIds) {
    const snap = await getDoc(doc(db, 'rooms', sourceCode, 'cards', card.id));
    const data = snap.data();
    if (!data || data.agreeCount <= 0 || data.disagreeCount !== 0) continue;
    const id = `${sourceCode}_${card.id}`;
    batch.set(
      doc(db, 'rooms', targetCode, 'agreements', id),
      {
        text: data.text.slice(0, 280),
        sourceRoomId: sourceCode,
        sourceCardId: card.id,
        round,
        createdAt: serverTimestamp(),
        ...(parentCardId ? { parentCardId } : {}),
      },
      { merge: true },
    );
    written.push(data.text);
  }
  if (written.length) await batch.commit();
  return written;
}

async function snapshotRoom(db, code) {
  const room = (await getDoc(doc(db, 'rooms', code))).data();
  const [cards, agreements, people] = await Promise.all([
    getDocs(collection(db, 'rooms', code, 'cards')),
    getDocs(collection(db, 'rooms', code, 'agreements')),
    getDocs(collection(db, 'rooms', code, 'participants')),
  ]);
  return {
    code,
    topic: room.topic,
    status: room.status,
    round: room.round,
    parentRoomId: room.parentRoomId ?? null,
    people: people.size,
    cards: cards.docs.map((d) => {
      const c = d.data();
      return { text: c.text, yes: c.agreeCount, no: c.disagreeCount };
    }),
    agreements: agreements.docs.map((d) => d.data().text),
  };
}

const people = [
  { key: 'maya', name: 'Maya', avatarId: 'fox' },
  { key: 'jules', name: 'Jules', avatarId: 'alien' },
  { key: 'sam', name: 'Sam', avatarId: 'frog' },
  { key: 'priya', name: 'Priya', avatarId: 'rainbow' },
];

const users = {};
for (const person of people) {
  users[person.key] = await asUser(person.key);
}
const host = users.maya;

const parentTopic = 'Saturday cookout — who brings what?';
const parentCode = await createRoom(host.db, host.uid, parentTopic);

for (const person of people) {
  const u = users[person.key];
  await join(u.db, parentCode, u.uid, person.name, person.avatarId);
}

const parentTakes = {
  maya: ['I can host in the backyard if people help with chairs.', 'Saturday afternoon is the only time I have.'],
  jules: ['I would rather a park so nobody has to clean.', 'Keep it under $30 each.'],
  sam: ['Park is easier. I can grill if someone brings a grill.', 'No alcohol — I am driving.'],
  priya: ['Vegetarian mains, not just a side salad.', 'I am fine at Maya’s if we start at 4.'],
};
for (const person of people) {
  for (const take of parentTakes[person.key]) {
    await submit(users[person.key].db, parentCode, users[person.key].uid, take);
  }
}

const parentCards = [
  { text: 'Keep it Saturday afternoon, not Sunday.' },
  { text: 'Vegetarian-friendly mains, not just a token salad.' },
  { text: 'Host at Maya’s backyard instead of a park.' },
  { text: 'Keep the budget under $30 per person.' },
  { text: 'Skip alcohol so drivers and kids are covered.' },
  { text: 'Start at 4pm so people can come after errands.' },
];

const parentVotes = {
  maya: ['agree', 'agree', 'agree', 'disagree', 'disagree', 'agree'],
  jules: ['agree', 'agree', 'disagree', 'agree', 'disagree', 'agree'],
  sam: ['agree', 'agree', 'disagree', 'agree', 'agree', 'disagree'],
  priya: ['agree', 'agree', 'agree', 'disagree', 'agree', 'agree'],
};

const parentCardIds = await writeDeckAndOpenVotes(host.db, parentCode, parentCards);
await voteAll(users, people, parentCode, parentCardIds, parentVotes);
await lockResults(host.db, parentCode);
const parentUnanimous = await recordUnanimousToParent(host.db, {
  targetCode: parentCode,
  sourceCode: parentCode,
  round: 1,
  cardIds: parentCardIds,
});

const hostSplit = parentCardIds[2];
const budgetSplit = parentCardIds[3];

async function startFollowUp(parentCard, topicTakes, cards, votePlan) {
  const childCode = await createRoom(host.db, host.uid, parentCard.text, {
    round: 2,
    parentRoomId: parentCode,
    parentCardId: parentCard.id,
  });
  for (const person of people) {
    await join(host.db, childCode, users[person.key].uid, person.name, person.avatarId);
  }
  await setDoc(doc(host.db, 'rooms', parentCode, 'followUps', childCode), {
    topic: parentCard.text.slice(0, 280),
    createdAt: serverTimestamp(),
  });
  for (const person of people) {
    for (const take of topicTakes[person.key]) {
      await submit(users[person.key].db, childCode, users[person.key].uid, take);
    }
  }
  const cardIds = await writeDeckAndOpenVotes(host.db, childCode, cards);
  await voteAll(users, people, childCode, cardIds, votePlan);
  await lockResults(host.db, childCode);
  const rolledUp = await recordUnanimousToParent(host.db, {
    targetCode: parentCode,
    sourceCode: childCode,
    round: 2,
    parentCardId: parentCard.id,
    cardIds,
  });
  return { childCode, cardIds, rolledUp };
}

const venue = await startFollowUp(
  hostSplit,
  {
    maya: ['I have a grill. I just need two extra folding chairs.'],
    jules: ['If Maya hosts, I will bring chairs and take trash home.'],
    sam: ['Backyard works if we have a rain backup.'],
    priya: ['Maya’s is closer for me. I can bring extra chairs too.'],
  },
  [
    { text: 'Host at Maya’s if Jules brings folding chairs.' },
    { text: 'Jules takes trash home so Maya is not stuck cleaning.' },
    { text: 'If it rains, move to the covered park pavilion.' },
  ],
  {
    maya: ['agree', 'agree', 'disagree'],
    jules: ['agree', 'agree', 'agree'],
    sam: ['agree', 'agree', 'agree'],
    priya: ['agree', 'agree', 'disagree'],
  },
);

const budget = await startFollowUp(
  budgetSplit,
  {
    maya: ['Potluck sides would keep my spend down.'],
    jules: ['$25–30 including drinks is doable.'],
    sam: ['I can cover the grill extras if others bring sides.'],
    priya: ['Skip a fancy dessert tray. Fruit is enough.'],
  },
  [
    { text: 'Cap spend at $25–30 each, including drinks.' },
    { text: 'Potluck sides instead of buying all the food.' },
    { text: 'Skip a fancy dessert tray; fruit is enough.' },
  ],
  {
    maya: ['agree', 'agree', 'agree'],
    jules: ['agree', 'agree', 'disagree'],
    sam: ['agree', 'agree', 'agree'],
    priya: ['agree', 'agree', 'agree'],
  },
);

const parentSnap = await snapshotRoom(host.db, parentCode);
const venueSnap = await snapshotRoom(host.db, venue.childCode);
const budgetSnap = await snapshotRoom(host.db, budget.childCode);

console.log(
  JSON.stringify(
    {
      parent: parentSnap,
      followUps: [
        { ...venueSnap, rolledUp: venue.rolledUp },
        { ...budgetSnap, rolledUp: budget.rolledUp },
      ],
      parentUnanimousFromRound1: parentUnanimous,
      join: {
        parent: `http://localhost:8081/summary/${parentCode}`,
        venueFollowUp: `http://localhost:8081/summary/${venue.childCode}`,
        budgetFollowUp: `http://localhost:8081/summary/${budget.childCode}`,
      },
    },
    null,
    2,
  ),
);
