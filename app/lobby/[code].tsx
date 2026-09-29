import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { CountdownPill } from '@/components/CountdownPill';
import { ParticipantCluster } from '@/components/ParticipantCluster';
import { ParticipationStats } from '@/components/ParticipationStats';
import { RoomStageBar } from '@/components/RoomStageBar';
import { Screen } from '@/components/Screen';
import { SeatGate } from '@/components/SeatGate';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useRoom } from '@/hooks/useRoom';
import { thoughtShareUrl } from '@/lib/app';
import { seatEntryCount, sharingSeatCount, votingUnlocked } from '@/lib/entries';
import { notify } from '@/lib/notify';
import { avatarById, colors, controls, type } from '@/lib/theme';
import { closeVotingIfOpen, containerCodeOf, ensureCardsFromEntries, reopenThoughts, submitEntry } from '@/lib/roomService';
import type { Participant, Room } from '@/types/room';

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
  const { room, participants, entries, seats, ready } = useRoom(code);
  const container = room ? containerCodeOf(room) : undefined;
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const closingRef = useRef(false);

  const msLeft = room?.closesAt ? room.closesAt.getTime() - now : null;
  const timedOut = msLeft != null && msLeft <= 0;
  const unlocked = votingUnlocked(entries);
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
    setBusy(true);
    try {
      await reopenThoughts(code);
    } catch (e) {
      notify('Could not reopen', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onGoVote = async () => {
    if (!unlocked) return;
    setBusy(true);
    try {
      await ensureCardsFromEntries(code);
      router.push(`/swipe/${code}`);
    } catch (e) {
      notify('Could not open voting', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onCopyLink = async () => {
    await Clipboard.setStringAsync(thoughtShareUrl(code));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onLeave = () => {
    router.replace('/');
  };

  const onSubmit = async (seatId: string) => {
    if (!user) return;
    setBusy(true);
    try {
      await submitEntry(code, user.uid, draft, seatId);
      setDraft('');
    } catch (e) {
      notify('Could not submit', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen loading={authLoading || !ready} error={authError || (!room && ready ? 'Room not found' : null)}>
      <SeatGate containerCode={container} topicCode={code} uid={user?.uid}>
        {(session) => {
          const memberCount = session.seats.length || participants.length || seats.length;
          const avatar = avatarById(session.seat.avatarId);
          const remaining = Math.max(0, (room?.entryLimit ?? 10) - seatEntryCount(entries, session.seat));
          const myThoughts = seatEntryCount(entries, session.seat);
          const canVote = unlocked && myThoughts > 0 && !timedOut;
          return (
      <View style={styles.page}>
        <BrandMark size="sm" />
        <RoomStageBar stage="thoughts" />
        <Text style={type.kicker}>Lobby</Text>
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
        <Pressable onPress={() => session.setSwitching(true)} accessibilityRole="button">
          <Text style={controls.ghostText}>
            {avatar.emoji} {session.seat.displayName} · Switch seat
          </Text>
        </Pressable>
        <Pressable onPress={() => void onCopyLink()} accessibilityRole="button">
          <Text style={controls.ghostText}>
            {copied ? 'Copied — paste it in your chat groups' : 'Copy the invite link and share in your chat groups'}
          </Text>
        </Pressable>
        <Text style={type.title}>{room?.topic}</Text>
        <Text style={type.body}>
          {memberCount} in the room · {entries.length} thoughts · 10 each
        </Text>
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
                  ? 'Two people have shared. You can keep writing or start voting.'
                  : `Voting opens when two people share a thought · ${sharedSeats}/2 so far`}
            </Text>
          </>
        ) : null}
        <ParticipantCluster participants={participants} seats={session.seats} entries={entries} />

        {room?.status === 'synthesizing' ? (
          <>
            <Text style={styles.wait}>
              {closedBanner(room, participants)} Cooking up the cards…
            </Text>
            <Button
              disabled={busy}
              variant="secondary"
              label={busy ? 'Working…' : 'Back to sharing thoughts'}
              onPress={() => void onReopen()}
            />
            <Text style={type.footnote}>No one has voted yet. You can reopen thoughts for everyone.</Text>
          </>
        ) : (
          <>
            <Text style={[type.label, styles.label]}>Your thought ({remaining} left)</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={remaining > 0 && room?.status === 'lobby'}
              placeholder="Say the thing out loud."
              placeholderTextColor={colors.faint}
              style={[controls.input, styles.area]}
              multiline
            />
            <Button disabled={busy || remaining <= 0 || room?.status !== 'lobby'} onPress={() => void onSubmit(session.seat.id)} label="Submit" />
          </>
        )}

        {room?.status === 'lobby' ? (
          <View style={styles.actions}>
            <Button
              disabled={busy || !canVote}
              label={busy ? 'Opening…' : 'Done sharing — vote'}
              onPress={() => void onGoVote()}
            />
            <Text style={type.footnote}>
              {!unlocked
                ? 'Waiting for one more person to share a thought.'
                : myThoughts === 0
                  ? 'Share a thought first, then you can vote on everyone else’s.'
                  : 'Moves you to voting. Other people can keep sharing.'}
            </Text>
            <Button disabled={busy} variant="secondary" label="Leave for now" onPress={onLeave} />
          </View>
        ) : null}
      </View>
          );
        }}
      </SeatGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 20, gap: 10 },
  wait: { ...type.section, color: colors.accentHover, marginTop: 24 },
  closed: { ...type.footnote, color: colors.accentHover },
  label: { marginTop: 8 },
  area: { minHeight: 90, textAlignVertical: 'top' },
  actions: { marginTop: 'auto', gap: 8 },
  confirm: { marginTop: 'auto', ...controls.panel, gap: 10 },
});
