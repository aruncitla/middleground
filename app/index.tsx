import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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
import { usePastRooms } from '@/hooks/usePastRooms';
import { createRoom, joinRoom, CLOSE_WINDOWS } from '@/lib/roomService';
import { pathForRoom } from '@/lib/roomPath';
import { avatars, colors, controls, type, type AvatarId } from '@/lib/theme';
import type { CloseWindowId, RoomPreview } from '@/types/room';

function formatDate(date: Date | null) {
  if (!date) return 'Unknown date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function previewLine(row: RoomPreview) {
  const people = row.people === 1 ? '1 person' : `${row.people} people`;
  if (row.total <= 0) {
    return `${people} · still collecting thoughts · ${formatDate(row.date)}`;
  }
  return `${people} · ${row.agreed} of ${row.total} points agreed · ${formatDate(row.date)}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading, error } = useGuestAuth();
  const { rooms: pastRooms } = usePastRooms(user?.uid);
  const [topic, setTopic] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('fox');
  const [busy, setBusy] = useState(false);
  const [closeWindow, setCloseWindow] = useState<CloseWindowId>('1h');

  const goRoom = (roomCode: string, status?: string) => router.replace(pathForRoom(roomCode, status));

  const openPast = async (row: RoomPreview) => {
    if (!user) return;
    try {
      await joinRoom(row.code, user.uid, name || 'Guest', avatarId);
    } catch {
      /* already a participant, or room gone */
    }
    router.push(pathForRoom(row.code, row.status));
  };

  const onCreate = async () => {
    if (!user) return;
    const nextTopic = topic.trim();
    if (!nextTopic) return;
    setBusy(true);
    try {
      const roomCode = await createRoom(user.uid, nextTopic, { closeWindow });
      await joinRoom(roomCode, user.uid, name || 'Host', avatarId);
      goRoom(roomCode, 'lobby');
    } catch (e) {
      Alert.alert('Create failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const joined = await joinRoom(code, user.uid, name || 'Guest', avatarId);
      goRoom(joined.code, joined.status);
    } catch (e) {
      Alert.alert('Join failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen loading={loading} error={error}>
      <ScrollView contentContainerStyle={styles.page}>
        <BrandMark />
        <View style={styles.script}>
          <Text style={styles.scriptLine}>Share your thoughts.</Text>
          <Text style={styles.scriptLine}>Vote on what everyone shared.</Text>
          <Text style={type.hero}>Find the overlap.</Text>
        </View>

        <Text style={[type.label, styles.label]}>Your name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ada"
          placeholderTextColor={colors.faint}
          style={controls.input}
        />

        <Text style={[type.label, styles.label]}>Avatar</Text>
        <View style={styles.avatars}>
          {avatars.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => setAvatarId(a.id)}
              style={[
                styles.avatar,
                { backgroundColor: a.color },
                avatarId === a.id && styles.avatarOn,
              ]}
            >
              <Text style={styles.emoji}>{a.emoji}</Text>
            </Pressable>
          ))}
        </View>

        <View style={controls.panel}>
          <Text style={type.section}>Ask the group</Text>
          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder="Where should we go on vacation?"
            placeholderTextColor={colors.faint}
            style={controls.input}
          />
          <Text style={[type.label, styles.label]}>Close thoughts after</Text>
          <View style={styles.durations}>
            {(Object.values(CLOSE_WINDOWS) as { id: CloseWindowId; label: string }[]).map((window) => (
              <Pressable
                key={window.id}
                onPress={() => setCloseWindow(window.id)}
                accessibilityRole="button"
                style={[styles.duration, closeWindow === window.id && styles.durationOn]}
              >
                <Text style={closeWindow === window.id ? styles.durationLabelOn : styles.durationLabel}>
                  {window.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={type.footnote}>10 thoughts each. Up to 20 to swipe. Close it when you’re ready.</Text>
          <Button
            disabled={busy || !topic.trim()}
            onPress={onCreate}
            label={busy ? 'Working…' : 'Create room'}
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
          <Button disabled={busy} onPress={onJoin} variant="secondary" label="Join room" />
          <Pressable onPress={() => void Clipboard.setStringAsync(code)} style={styles.ghost}>
            <Text style={controls.ghostText}>Copy typed code</Text>
          </Pressable>
        </View>

        <View style={controls.panel}>
          <Text style={type.section}>Past discussions</Text>
          {pastRooms.length === 0 ? (
            <Text style={type.footnote}>Rooms you join will land here.</Text>
          ) : (
            pastRooms.map((group) => (
              <View key={group.room.code} style={styles.pastGroup}>
                <PastRow row={group.room} onPress={() => void openPast(group.room)} />
                {group.children.map((child) => (
                  <PastRow
                    key={child.code}
                    row={child}
                    nested
                    onPress={() => void openPast(child)}
                  />
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function PastRow({
  row,
  nested,
  onPress,
}: {
  row: RoomPreview;
  nested?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.pastRow, nested && styles.pastChild]}
    >
      {nested ? <Text style={styles.subKicker}>Sub-discussion</Text> : null}
      <Text style={styles.pastTopic} numberOfLines={2}>
        {row.topic}
      </Text>
      {row.parentRoomId && !nested ? (
        <Text style={type.footnote}>Sub-discussion of {row.parentRoomId}</Text>
      ) : null}
      <Text style={type.body}>{previewLine(row)}</Text>
      <Text style={styles.pastCode}>{row.code}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22, paddingBottom: 48, gap: 10 },
  script: { gap: 2, marginBottom: 6 },
  scriptLine: { ...type.body, fontSize: 14, lineHeight: 20 },
  label: { marginTop: 8 },
  avatars: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarOn: {
    borderColor: colors.accentHover,
    boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.35)',
  },
  emoji: { fontSize: 22 },
  durations: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  duration: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  durationOn: {
    borderColor: colors.accentHover,
    boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.35)',
  },
  durationLabel: { ...type.body, color: colors.muted },
  durationLabelOn: { ...type.body, color: colors.ink },
  ghost: { alignItems: 'center', paddingVertical: 6 },
  pastGroup: { gap: 8 },
  pastRow: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pastChild: {
    marginLeft: 16,
    backgroundColor: colors.cardAlt,
    borderLeftWidth: 2,
    borderLeftColor: colors.accentSoft,
  },
  subKicker: { ...type.kicker, color: colors.accentHover, textTransform: 'uppercase' },
  pastTopic: { ...type.section, fontSize: 15 },
  pastCode: { ...type.footnote, color: colors.muted, letterSpacing: 0.6 },
});
