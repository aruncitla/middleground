import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { ParticipantCluster } from '@/components/ParticipantCluster';
import { ParticipationStats } from '@/components/ParticipationStats';
import { RoomStageBar } from '@/components/RoomStageBar';
import { Screen } from '@/components/Screen';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useRoom } from '@/hooks/useRoom';
import { callSynthesizeRoom, mockSynthesize } from '@/lib/aiSynthesis';
import { closeThoughts, submitEntry, writeSynthesizedCards } from '@/lib/roomService';
import { formatEndedAt, formatEndsAt } from '@/lib/formatEnds';
import { colors, controls, type } from '@/lib/theme';
import type { CloseReason, Participant, Room } from '@/types/room';

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
  const { room, participants, entries, ready } = useRoom(code);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const closingRef = useRef(false);

  const me = participants.find((p) => p.id === user?.uid);
  const remaining = Math.max(0, (room?.entryLimit ?? 10) - (me?.entryCount ?? 0));
  const msLeft = room?.closesAt ? room.closesAt.getTime() - now : null;
  const timedOut = msLeft != null && msLeft <= 0;

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

  const runClose = async (reason: CloseReason) => {
    if (!user || !room || closingRef.current) return;
    closingRef.current = true;
    setBusy(true);
    try {
      const won = await closeThoughts(code, user.uid, reason);
      if (!won) return;
      try {
        await callSynthesizeRoom(code);
      } catch {
        await writeSynthesizedCards(code, mockSynthesize(entries, room.topic));
      }
    } catch (e) {
      Alert.alert('Could not close', e instanceof Error ? e.message : String(e));
      closingRef.current = false;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!user || !room || room.status !== 'lobby' || entries.length === 0 || !timedOut) return;
    void runClose('timeout');
  }, [user?.uid, room?.status, timedOut, entries.length]);

  const onSubmit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await submitEntry(code, user.uid, draft);
      setDraft('');
    } catch (e) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen loading={authLoading || !ready} error={authError || (!room && ready ? 'Room not found' : null)}>
      <View style={styles.page}>
        <BrandMark size="sm" />
        <RoomStageBar stage="thoughts" />
        <Text style={type.kicker}>Lobby</Text>
        {room?.parentRoomId ? (
          <Pressable onPress={() => router.replace(`/summary/${room.parentRoomId}`)} accessibilityRole="button">
            <Text style={controls.ghostText}>Follow-up of {room.parentRoomId} · back to original</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => void Clipboard.setStringAsync(code)} accessibilityRole="button">
          <Text style={controls.ghostText}>Tap to copy code</Text>
        </Pressable>
        <Text style={type.title}>{room?.topic}</Text>
        <Text style={type.body}>
          {participants.length} in the room · {entries.length} thoughts · 10 each
        </Text>
        <ParticipationStats participants={participants} />
        {room?.status === 'lobby' && room.closesAt ? (
          <Text style={timedOut ? styles.closed : type.body}>
            {timedOut
              ? entries.length === 0
                ? `Time’s up (${formatEndedAt(room.closesAt)}). Add a thought, then close.`
                : 'Time’s up — closing thoughts…'
              : `${formatEndsAt(room.closesAt)} · anyone can close sooner`}
          </Text>
        ) : null}
        <ParticipantCluster participants={participants} />

        {room?.status === 'synthesizing' ? (
          <Text style={styles.wait}>
            {closedBanner(room, participants)} Cooking up the cards…
          </Text>
        ) : (
          <>
            <Text style={[type.label, styles.label]}>Your take ({remaining} left)</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={remaining > 0 && room?.status === 'lobby'}
              placeholder="Say the thing out loud."
              placeholderTextColor={colors.faint}
              style={[controls.input, styles.area]}
              multiline
            />
            <Button disabled={busy || remaining <= 0 || room?.status !== 'lobby'} onPress={onSubmit} label="Submit" />
          </>
        )}

        {room?.status === 'lobby' ? (
          <Button
            disabled={busy || entries.length === 0}
            onPress={() => void runClose('manual')}
            variant="secondary"
            label={busy ? 'Working…' : 'Close thoughts'}
            style={styles.lock}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 20, gap: 10 },
  wait: { ...type.section, color: colors.accentHover, marginTop: 24 },
  closed: { ...type.footnote, color: colors.accentHover },
  label: { marginTop: 8 },
  area: { minHeight: 90, textAlignVertical: 'top' },
  lock: { marginTop: 'auto' },
});
