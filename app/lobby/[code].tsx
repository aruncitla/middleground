import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { CountdownPill } from '@/components/CountdownPill';
import { ParticipantCluster } from '@/components/ParticipantCluster';
import { ParticipationStats } from '@/components/ParticipationStats';
import { RoomCodeRow } from '@/components/RoomCodeRow';
import { RoomStageBar } from '@/components/RoomStageBar';
import { Screen } from '@/components/Screen';
import { GuestIdentityFields, SeatGate, type SeatSession } from '@/components/SeatGate';
import { SimilarThoughtPanel } from '@/components/SimilarThoughtPanel';
import { TopicCard } from '@/components/TopicCard';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useRoom } from '@/hooks/useRoom';
import { roomShareUrl } from '@/lib/app';
import { seatEntryCount, sharingSeatCount, votingUnlocked } from '@/lib/entries';
import { markPlayHintSeen, shouldShowPlayHint } from '@/lib/firstRun';
import { notify } from '@/lib/notify';
import { loadProfile } from '@/lib/profileLocal';
import { findSimilarThought, type SimilarMatch } from '@/lib/similarThought';
import { avatarById, colors, controls, type, type AvatarId } from '@/lib/theme';
import {
  closeVotingIfOpen,
  containerCodeOf,
  ensureCardsFromEntries,
  isRoomAuthor,
  reopenThoughts,
  submitEntry,
} from '@/lib/roomService';
import type { Participant, Room } from '@/types/room';

function thoughtAuthorLabel(entry: { authorId: string; seatId?: string }, seats: { id: string; displayName: string; avatarId: string }[], participants: Participant[]) {
  const seat = entry.seatId ? seats.find((row) => row.id === entry.seatId) : null;
  if (seat) return `${avatarById(seat.avatarId).emoji} ${seat.displayName}`;
  const person = participants.find((row) => row.id === entry.authorId);
  if (person) return `${avatarById(person.avatarId).emoji} ${person.displayName}`;
  return 'Someone in the room';
}

function closedBanner(room: Room, participants: Participant[]) {
  if (room.closeReason === 'timeout') return 'Time ran out — thoughts are closed.';
  const name = participants.find((p) => p.id === room.closedBy)?.displayName;
  if (name) return `${name} closed thoughts.`;
  return 'Thoughts are closed.';
}

export default function LobbyScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? '').toUpperCase();
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useGuestAuth();
  const { room, participants, entries, seats, ready, rememberEntry } = useRoom(code);
  const container = room ? containerCodeOf(room) : undefined;
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [opening, setOpening] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [hint, setHint] = useState(shouldShowPlayHint);
  const [similar, setSimilar] = useState<SimilarMatch | null>(null);
  const closingRef = useRef(false);
  const draftRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const [guestName, setGuestName] = useState(() => loadProfile().name);
  const [guestAvatar, setGuestAvatar] = useState<AvatarId>(() => loadProfile().avatarId);

  const msLeft = room?.closesAt ? room.closesAt.getTime() - now : null;
  const timedOut = msLeft != null && msLeft <= 0;
  const unlocked = votingUnlocked(entries, { authorOnlyThoughts: room?.authorOnlyThoughts });
  const sharedSeats = sharingSeatCount(entries);

  useEffect(() => {
    if (!room) return;
    if (room.status === 'swiping') router.replace(`/swipe/${code}`);
    if (room.status === 'summary') router.replace(`/summary/${code}`);
  }, [room, code, router]);

  useEffect(() => {
    if (room?.status !== 'lobby' || !room.closesAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [room?.status, room?.closesAt]);

  useEffect(() => {
    if (!user || !room || room.status !== 'lobby' || !timedOut || closingRef.current) return;
    if (!unlocked) return;
    closingRef.current = true;
    void closeVotingIfOpen(code).catch(() => {
      closingRef.current = false;
    });
  }, [user, room, timedOut, unlocked, code]);

  const onReopen = async () => {
    setOpening(true);
    try {
      await reopenThoughts(code);
    } catch (e) {
      notify('Could not reopen', e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(false);
    }
  };

  const onGoVote = async () => {
    if (!unlocked) return;
    setOpening(true);
    try {
      await ensureCardsFromEntries(code);
      router.push(`/swipe/${code}`);
    } catch (e) {
      notify('Could not open voting', e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(false);
    }
  };

  const onSubmit = async (seatId: string, force = false) => {
    if (!user) return;
    if (!force) {
      const match = findSimilarThought(draft, entries);
      if (match) {
        setSimilar(match);
        return;
      }
    }
    setSubmitting(true);
    try {
      const created = await submitEntry(code, user.uid, draft, seatId);
      rememberEntry(created);
      setDraft('');
      setSimilar(null);
      if (hint) {
        markPlayHintSeen();
        setHint(false);
      }
    } catch (e) {
      notify('Could not submit', e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onVoteTheirs = () => {
    setSimilar(null);
    setDraft('');
    requestAnimationFrame(() => draftRef.current?.focus());
  };

  const withSeat = async (session: SeatSession, then: (seatId: string) => void | Promise<void>) => {
    if (session.seat) {
      await then(session.seat.id);
      return;
    }
    if (!guestName.trim()) {
      nameRef.current?.focus();
      return;
    }
    const seat = await session.ensureSeat({ name: guestName.trim(), avatarId: guestAvatar });
    if (!seat) return;
    await then(seat.id);
  };

  return (
    <Screen loading={authLoading || !ready} error={authError || (!room && ready ? 'Room not found' : null)}>
      <SeatGate containerCode={container} topicCode={code} uid={user?.uid} required={false}>
        {(session) => {
          const memberCount = session.seats.length || participants.length || seats.length;
          const avatar = session.seat ? avatarById(session.seat.avatarId) : null;
          const remaining = Math.max(0, (room?.entryLimit ?? 10) - seatEntryCount(entries, session.seat));
          const myThoughts = seatEntryCount(entries, session.seat);
          const canVote = unlocked && !timedOut;
          const author = isRoomAuthor(room, session.seat?.id, user?.uid);
          const canCompose = !room?.authorOnlyThoughts || author;
          const shareCode = container || code;
          return (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
        <RoomStageBar stage="thoughts" />
        {hint ? (
          <View style={styles.hint}>
            <Text style={type.section}>Add your thought. Swipe through the group’s. Find the overlap.</Text>
            <Pressable
              onPress={() => {
                markPlayHintSeen();
                setHint(false);
              }}
              accessibilityRole="button"
            >
              <Text style={controls.ghostText}>Got it</Text>
            </Pressable>
          </View>
        ) : null}
        {room?.parentRoomId ? (
          <Pressable onPress={() => router.replace(`/summary/${room.parentRoomId}`)} accessibilityRole="button">
            <Text style={controls.ghostText}>Sub-topic of {room.parentRoomId} · back to original</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.push(`/room/${room ? (room.containerId || room.parentRoomId || code) : code}`)}
          accessibilityRole="button"
        >
          <Text style={controls.ghostText}>Room home</Text>
        </Pressable>
        {session.seat ? (
          <Pressable onPress={() => session.setSwitching(true)} accessibilityRole="button">
            <Text style={controls.ghostText}>
              {avatar?.emoji} {session.seat.displayName} · Switch
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => session.setSwitching(true)} accessibilityRole="button">
            <Text style={controls.ghostText}>Add a name to share a thought or vote</Text>
          </Pressable>
        )}
        <RoomCodeRow code={shareCode} url={roomShareUrl(shareCode)} />
        {room?.authorOnlyThoughts ? <Text style={styles.led}>Author-led</Text> : null}
        <TopicCard>
          <Text style={type.title}>{room?.topic}</Text>
          <Text style={type.body}>
            {memberCount} {memberCount === 1 ? 'person' : 'people'} in · {entries.length}{' '}
            {entries.length === 1 ? 'thought' : 'thoughts'}
          </Text>
        </TopicCard>
        <ParticipationStats participants={participants} seats={session.seats} entries={entries} />
        {room?.status === 'lobby' && room.closesAt ? (
          <>
            <CountdownPill endsAt={room.closesAt} />
            <Text style={timedOut ? styles.closed : type.footnote}>
              {timedOut
                ? unlocked
                  ? 'Time’s up — locking the room…'
                  : 'Time’s up. Voting needed two people with thoughts.'
                : unlocked
                  ? room?.authorOnlyThoughts
                    ? 'The author set the thoughts. You can vote when you’re ready.'
                    : 'Two people have shared. You can keep writing or start voting.'
                  : room?.authorOnlyThoughts
                    ? 'Voting opens once the author adds a thought.'
                    : `Voting opens when two people share a thought · ${sharedSeats}/2 so far`}
            </Text>
          </>
        ) : null}
        <ParticipantCluster participants={participants} seats={session.seats} entries={entries} />

        {entries.length ? (
          <View style={styles.board}>
            <Text style={type.label}>Thoughts in this room</Text>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.thought}>
                <Text style={styles.thoughtText}>{entry.text}</Text>
              </View>
            ))}
          </View>
        ) : room?.authorOnlyThoughts && !author ? (
          <Text style={type.body}>Waiting for the author to add thoughts.</Text>
        ) : (
          <Text style={type.body}>No thoughts yet. Add yours — or just read along.</Text>
        )}

        {room?.status === 'synthesizing' ? (
          <>
            <Text style={styles.wait}>
              {closedBanner(room, participants)} Cooking up the cards…
            </Text>
            <Button
              disabled={opening}
              variant="secondary"
              label={opening ? 'Working…' : 'Back to sharing thoughts'}
              onPress={() => void onReopen()}
            />
          </>
        ) : canCompose ? (
          <>
            {similar ? (
              <SimilarThoughtPanel
                kind={similar.kind}
                thought={similar.entry.text}
                author={thoughtAuthorLabel(similar.entry, session.seats, participants)}
                onVoteTheirs={onVoteTheirs}
                onAddAnyway={
                  similar.kind === 'exact'
                    ? undefined
                    : () => {
                        void withSeat(session, (seatId) => onSubmit(seatId, true));
                      }
                }
                onEditMine={() => {
                  setSimilar(null);
                  requestAnimationFrame(() => draftRef.current?.focus());
                }}
              />
            ) : null}
            <Text style={[type.label, styles.label]}>Add your thought ({remaining} left)</Text>
            <TextInput
              ref={draftRef}
              value={draft}
              onChangeText={setDraft}
              editable={remaining > 0 && room?.status === 'lobby'}
              placeholder="Say the thing out loud."
              placeholderTextColor={colors.faint}
              style={[controls.input, styles.area]}
              multiline
              {...({ dataSet: { mgInput: true } } as object)}
            />
            <Button
              disabled={submitting || remaining <= 0 || room?.status !== 'lobby' || !draft.trim()}
              onPress={() => void withSeat(session, (seatId) => onSubmit(seatId))}
              label={submitting ? 'Submitting…' : 'Add thought'}
            />
            {!session.seat ? (
              <GuestIdentityFields
                name={guestName}
                avatarId={guestAvatar}
                onNameChange={setGuestName}
                onAvatarChange={setGuestAvatar}
                nameRef={nameRef}
                note="Put your name here so the room knows this thought is yours. No account."
              />
            ) : null}
          </>
        ) : (
          <Text style={type.body}>
            Thoughts are set by the room author. Your job: vote on what’s true for you.
          </Text>
        )}

        {room?.status === 'lobby' ? (
          <View style={styles.actions}>
            <Button
              disabled={opening || !canVote}
              label={opening ? 'Opening…' : 'Done sharing — vote'}
              onPress={() => void withSeat(session, () => onGoVote())}
            />
            <Text style={type.footnote}>
              {!unlocked
                ? room?.authorOnlyThoughts
                  ? 'Waiting for the author to add thoughts.'
                  : 'Waiting for one more person to share a thought.'
                : myThoughts === 0
                  ? room?.authorOnlyThoughts
                    ? 'Vote on the author’s thoughts. You don’t need to add one.'
                    : 'You can vote on everyone else’s thoughts, or add yours first.'
                  : 'Moves you to voting. Other people can keep sharing.'}
            </Text>
            <Button disabled={submitting || opening} variant="secondary" label="Leave for now" onPress={() => router.replace('/')} />
          </View>
        ) : null}
      </ScrollView>
          );
        }}
      </SeatGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: 48, gap: 10 },
  hint: { ...controls.panel, gap: 8 },
  wait: { ...type.section, color: colors.teal, marginTop: 24 },
  closed: { ...type.footnote, color: colors.teal },
  label: { marginTop: 8 },
  area: { minHeight: 90, textAlignVertical: 'top' },
  actions: { marginTop: 12, gap: 8 },
  board: { gap: 8 },
  thought: {
    ...controls.panel,
    padding: 12,
  },
  thoughtText: { ...type.body, color: colors.ink },
  led: {
    ...type.kicker,
    alignSelf: 'flex-start',
    color: colors.teal,
    textTransform: 'uppercase',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
