import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
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
  return { ...c, uid: cred.user.uid };
}

async function createRoom(db, hostId, topic) {
  for (let i = 0; i < 8; i++) {
    const code = randomRoomCode();
    const ref = doc(db, 'rooms', code);
    const snap = await getDoc(ref);
    if (snap.exists()) continue;
    await setDoc(ref, {
      topic,
      hostId,
      status: 'lobby',
      entryLimit: 3,
      round: 1,
      createdAt: serverTimestamp(),
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

const people = [
  {
    key: 'host',
    name: 'Maya',
    avatarId: 'fox',
    takes: [
      'Japan in spring — cherry blossoms and great food, but I can do 8 days max.',
      'I do not want a beach-only trip. I need cities and walking around.',
    ],
  },
  {
    key: 'jules',
    name: 'Jules',
    avatarId: 'alien',
    takes: [
      'Italy: Rome plus a few days on the Amalfi coast. I will handle the planning.',
      'Budget around $2500 each including flights.',
    ],
  },
  {
    key: 'sam',
    name: 'Sam',
    avatarId: 'frog',
    takes: [
      'Costa Rica. Surf, rainforests, cheaper than Europe right now.',
      'I cannot do 12+ hour flights. West coast to Europe wipes me out.',
    ],
  },
  {
    key: 'priya',
    name: 'Priya',
    avatarId: 'rainbow',
    takes: [
      'Somewhere with good vegetarian food and not too much driving.',
      'I am fine with Japan or Italy. Not interested in a party hostel vibe.',
    ],
  },
];

const cards = [
  { text: 'Japan in spring: cities plus food, about 8 days, not beach-only.', kind: 'synthesized' },
  { text: 'Italy: Rome and Amalfi, with Jules planning, about $2500 each.', kind: 'synthesized' },
  { text: 'Costa Rica for surf and rainforest, cheaper and a shorter flight.', kind: 'synthesized' },
  { text: 'Keep the trip under 8–10 days so work and energy stay realistic.', kind: 'synthesized' },
  { text: 'Prioritize walkable cities and great vegetarian food.', kind: 'synthesized' },
  { text: 'Skip a beach-only or party-hostel vacation.', kind: 'synthesized' },
];

// Mixed votes so summary is not unanimous. Order matches `cards`.
const votePlan = {
  host: ['agree', 'disagree', 'disagree', 'agree', 'agree', 'agree'],
  jules: ['disagree', 'agree', 'disagree', 'agree', 'agree', 'agree'],
  sam: ['disagree', 'disagree', 'agree', 'agree', 'disagree', 'agree'],
  priya: ['agree', 'agree', 'disagree', 'agree', 'agree', 'agree'],
};

const users = {};
for (const person of people) {
  users[person.key] = await asUser(person.key);
}

const host = users.host;
const topic = 'Where should we go on vacation?';
const code = await createRoom(host.db, host.uid, topic);

for (const person of people) {
  const u = users[person.key];
  await join(u.db, code, u.uid, person.name, person.avatarId);
  for (const take of person.takes) {
    await submit(u.db, code, u.uid, take);
  }
}

await updateDoc(doc(host.db, 'rooms', code), { status: 'synthesizing' });

const batch = writeBatch(host.db);
const cardIds = [];
cards.forEach((card, order) => {
  const ref = doc(collection(host.db, 'rooms', code, 'cards'));
  cardIds.push(ref.id);
  batch.set(ref, {
    text: card.text,
    kind: card.kind,
    order,
    agreeCount: 0,
    disagreeCount: 0,
    createdAt: serverTimestamp(),
  });
});
batch.update(doc(host.db, 'rooms', code), { status: 'swiping' });
await batch.commit();

for (const person of people) {
  const u = users[person.key];
  const choices = votePlan[person.key];
  for (let i = 0; i < cardIds.length; i++) {
    const cardId = cardIds[i];
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

console.log(JSON.stringify({ code, topic, people: people.map((p) => ({ name: p.name, takes: p.takes })) }, null, 2));
