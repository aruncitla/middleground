import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { CopyButton } from '@/components/CopyButton';
import { Screen } from '@/components/Screen';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useSavedRooms } from '@/hooks/usePastRooms';
import { DEMO_ROOM_CODE } from '@/lib/app';
import { notify } from '@/lib/notify';
import { peekRoom } from '@/lib/roomService';
import { pathForRoom } from '@/lib/roomPath';
import { colors, controls, type } from '@/lib/theme';
import type { SavedRoom } from '@/types/room';

function formatDate(date: Date | null) {
  if (!date) return 'Unknown date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function previewLine(row: SavedRoom) {
  if (row.pending) return 'Loading room…';
  const live = row.liveTopic ? ' · live topic' : '';
  return `${row.topicsDebated} topics · ${row.verdictsReached} verdicts · ${row.memberCount} members${live}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading, error } = useGuestAuth();
  const { rooms: savedRooms, loading: roomsLoading } = useSavedRooms(user?.uid);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const onJoin = async () => {
    if (!user) {
      notify('Still signing you in', 'Try again in a moment.');
      return;
    }
    setBusy(true);
    try {
      const room = await peekRoom(code);
      if (!room) throw new Error('Room not found');
      const isGroup = room.kind === 'group' || (!room.kind && !room.parentRoomId && !room.containerId);
      if (isGroup) router.push(`/room/${room.id}`);
      else router.replace(pathForRoom(room.id, room.status));
    } catch (e) {
      notify('Join failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen loading={loading} error={error}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
        <View style={styles.script}>
          <Text style={styles.scriptLine}>Share your thoughts.</Text>
          <Text style={styles.scriptLine}>Vote on what everyone shared.</Text>
          <Text style={type.hero}>Find the overlap.</Text>
        </View>

        <View style={controls.panel}>
          <Text style={type.section}>Ask the group</Text>
          <Text style={type.footnote}>
            Browse a prompt pack, or write your own. One tap starts the topic.
          </Text>
          <Button
            disabled={busy}
            onPress={() => router.push('/new')}
            label="Start a topic"
          />
          <Pressable onPress={() => router.push(`/summary/${DEMO_ROOM_CODE}`)} accessibilityRole="button">
            <Text style={controls.ghostText}>See a live debate</Text>
          </Pressable>
        </View>

        <View style={controls.panel}>
          <Text style={type.section}>Got a code?</Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="e.g. K7M2QX"
            autoCapitalize="characters"
            maxLength={6}
            placeholderTextColor="rgba(250,250,249,0.28)"
            style={[controls.input, code ? type.code : styles.codeHint]}
            {...({ dataSet: { mgInput: 'code' } } as object)}
          />
          <Button disabled={busy} onPress={() => void onJoin()} variant="secondary" label="Join room" />
          <CopyButton value={code} />
        </View>

        <View style={controls.panel}>
          <Text style={type.section}>Saved rooms</Text>
          {savedRooms.length === 0 ? (
            <Text style={type.footnote}>
              {roomsLoading ? 'Loading rooms…' : 'Rooms you join will land here.'}
            </Text>
          ) : (
            savedRooms.map((row) => (
              <Pressable
                key={row.code}
                onPress={() => router.push(`/room/${row.code}`)}
                accessibilityRole="button"
                style={styles.pastRow}
              >
                <Text style={styles.pastTopic} numberOfLines={2}>
                  {row.name}
                </Text>
                <Text style={type.body}>{previewLine(row)}</Text>
                <Text style={type.footnote}>{formatDate(row.created)}</Text>
                <Text style={styles.pastCode}>{row.code}</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: 48, gap: 12 },
  script: { gap: 2, marginBottom: 6 },
  scriptLine: { ...type.body, fontSize: 14, lineHeight: 20 },
  pastRow: {
    ...controls.panel,
    padding: 14,
    gap: 4,
  },
  pastTopic: { ...type.section, fontSize: 15 },
  pastCode: { ...type.code, fontSize: 16 },
  codeHint: {
    fontFamily: 'Inter',
    fontSize: 16,
    letterSpacing: 0,
    fontWeight: '400',
    fontStyle: 'italic',
    color: colors.ink,
  },
});
