import * as Clipboard from 'expo-clipboard';
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
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useSavedRooms } from '@/hooks/usePastRooms';
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
        <BrandMark />
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
        </View>

        <View style={controls.panel}>
          <Text style={type.section}>Got a code?</Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="K7M2QX"
            autoCapitalize="characters"
            maxLength={6}
            placeholderTextColor={colors.faint}
            style={controls.input}
          />
          <Button disabled={busy} onPress={() => void onJoin()} variant="secondary" label="Join room" />
          <Pressable onPress={() => void Clipboard.setStringAsync(code)} style={styles.ghost}>
            <Text style={controls.ghostText}>Copy typed code</Text>
          </Pressable>
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
  page: { padding: 22, paddingBottom: 48, gap: 10 },
  script: { gap: 2, marginBottom: 6 },
  scriptLine: { ...type.body, fontSize: 14, lineHeight: 20 },
  ghost: { alignItems: 'center', paddingVertical: 6 },
  pastRow: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pastTopic: { ...type.section, fontSize: 15 },
  pastCode: { ...type.footnote, color: colors.muted, letterSpacing: 0.6 },
});
