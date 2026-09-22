import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { PromptPacks } from '@/components/PromptPacks';
import { Screen } from '@/components/Screen';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { loadProfile, saveProfile } from '@/lib/profileLocal';
import { CLOSE_WINDOWS, createRoom, createSeat, createTopicInRoom, joinRoom, isSeatTakenError } from '@/lib/roomService';
import type { TopicMode } from '@/lib/promptPacks';
import { colors, controls, type } from '@/lib/theme';
import type { CloseWindowId } from '@/types/room';

const MODES: { id: TopicMode; label: string }[] = [
  { id: 'debate', label: 'Debate' },
  { id: 'hot-takes', label: 'Hot takes' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'predictions', label: 'Predictions' },
];

export default function NewTopicScreen() {
  const router = useRouter();
  const { room: rawRoom } = useLocalSearchParams<{ room?: string }>();
  const container = String(rawRoom ?? '').toUpperCase();
  const inRoom = container.length === 6;
  const { user, loading, error } = useGuestAuth();
  const stored = loadProfile();
  const [topic, setTopic] = useState('');
  const [name, setName] = useState(stored.name);
  const [roomName, setRoomName] = useState('');
  const [busy, setBusy] = useState(false);
  const [closeWindow, setCloseWindow] = useState<CloseWindowId>('1h');
  const [mode, setMode] = useState<TopicMode>('debate');

  const start = async (prompt: string, nextMode: TopicMode) => {
    if (!user) return;
    const text = prompt.trim();
    if (!text) return;
    if (!inRoom && !roomName.trim()) {
      Alert.alert('Name the room', 'Give the group a name. The topic stays the question you’re asking.');
      return;
    }
    setBusy(true);
    try {
      const storedProfile = loadProfile();
      const seatName = name.trim() || storedProfile.name;
      if (!seatName) throw new Error('Pick a display name first');
      const avatarId = storedProfile.avatarId || 'fox';
      saveProfile({ name: seatName, avatarId });
      const code = inRoom
        ? await createTopicInRoom(container, user.uid, text, { closeWindow, mode: nextMode })
        : await createRoom(user.uid, text, {
            closeWindow,
            mode: nextMode,
            kind: 'group',
            name: roomName.trim(),
          });
      await joinRoom(code, user.uid, seatName, avatarId);
      try {
        await createSeat(inRoom ? container : code, user.uid, seatName, avatarId);
      } catch (e) {
        if (!isSeatTakenError(e)) throw e;
      }
      if (inRoom) await joinRoom(container, user.uid, seatName, avatarId).catch(() => {});
      router.replace(`/lobby/${code}`);
    } catch (e) {
      Alert.alert('Could not start', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen loading={loading} error={error}>
      <ScrollView contentContainerStyle={styles.page}>
        <BrandMark />
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={controls.ghostText}>{inRoom ? `Back to ${container}` : 'Back'}</Text>
        </Pressable>
        <Text style={type.title}>{inRoom ? 'New topic' : 'Ask the group'}</Text>
        <Text style={type.body}>
          {inRoom
            ? 'Same room, new round. Pick a pack or write your own.'
            : 'Tap a prompt to start. Or write your own.'}
        </Text>

        <Text style={[type.label, styles.label]}>Your name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ada"
          placeholderTextColor={colors.faint}
          style={controls.input}
        />

        {inRoom ? null : (
          <>
            <Text style={[type.label, styles.label]}>Room name</Text>
            <TextInput
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Friday crew"
              placeholderTextColor={colors.faint}
              style={controls.input}
              maxLength={80}
            />
            <Text style={type.footnote}>
              Required. Shown on the home list and invite. The topic stays the question you’re asking.
            </Text>
          </>
        )}

        <PromptPacks disabled={busy} onPick={(prompt, packMode) => void start(prompt, packMode)} />

        <View style={controls.panel}>
          <Text style={type.section}>Write your own</Text>
          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder="Where should we go on vacation?"
            placeholderTextColor={colors.faint}
            style={controls.input}
          />
          <Text style={[type.label, styles.label]}>Mode</Text>
          <View style={styles.row}>
            {MODES.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setMode(item.id)}
                accessibilityRole="button"
                style={[styles.chip, mode === item.id && styles.chipOn]}
              >
                <Text style={mode === item.id ? styles.chipLabelOn : styles.chipLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[type.label, styles.label]}>Close thoughts after</Text>
          <View style={styles.row}>
            {(Object.values(CLOSE_WINDOWS) as { id: CloseWindowId; label: string }[]).map((window) => (
              <Pressable
                key={window.id}
                onPress={() => setCloseWindow(window.id)}
                accessibilityRole="button"
                style={[styles.chip, closeWindow === window.id && styles.chipOn]}
              >
                <Text style={closeWindow === window.id ? styles.chipLabelOn : styles.chipLabel}>
                  {window.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button
            disabled={busy || !topic.trim() || (!inRoom && !roomName.trim())}
            onPress={() => void start(topic, mode)}
            label={busy ? 'Working…' : inRoom ? 'Start topic' : 'Create room'}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22, paddingBottom: 48, gap: 10 },
  label: { marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipOn: {
    borderColor: colors.accentHover,
    boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.35)',
  },
  chipLabel: { ...type.body, color: colors.muted, fontSize: 13 },
  chipLabelOn: { ...type.body, color: colors.ink, fontSize: 13 },
});
