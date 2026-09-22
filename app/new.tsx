import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { PromptPacks } from '@/components/PromptPacks';
import { Screen } from '@/components/Screen';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { notify } from '@/lib/notify';
import { loadProfile, saveProfile } from '@/lib/profileLocal';
import { CLOSE_WINDOWS, createRoom, createSeat, createTopicInRoom, joinRoom, isSeatTakenError, peekRoom, rememberJoinedRoom } from '@/lib/roomService';
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
  const [topic, setTopic] = useState('');
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [closeWindow, setCloseWindow] = useState<CloseWindowId>('1h');
  const [mode, setMode] = useState<TopicMode>('debate');

  useEffect(() => {
    const stored = loadProfile();
    setName((current) => current.trim() || stored.name);
  }, []);

  const start = async (prompt: string, nextMode: TopicMode) => {
    const text = prompt.trim();
    const storedProfile = loadProfile();
    const seatName = (name.trim() || storedProfile.name).trim();
    if (!user) {
      setFormError('Still signing you in. Try again in a moment.');
      return;
    }
    if (!seatName) {
      setFormError('Type a display name first.');
      return;
    }
    if (!text) {
      setFormError('Pick a prompt or write your own topic.');
      return;
    }
    if (!inRoom && !roomName.trim()) {
      setFormError('Give the group a room name. The topic stays the question you’re asking.');
      return;
    }
    setFormError(null);
    setBusy(true);
    try {
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
      const created = await peekRoom(inRoom ? container : code);
      if (created) await rememberJoinedRoom(user.uid, created.id, created).catch(() => {});
      router.replace(`/lobby/${code}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setFormError(message);
      notify('Could not start', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen loading={loading} error={error}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
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

        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        <Text style={[type.label, styles.label]}>Your name</Text>
        <TextInput
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (formError) setFormError(null);
          }}
          placeholder="Your name"
          autoComplete="name"
          placeholderTextColor={colors.faint}
          style={controls.input}
        />

        {inRoom ? null : (
          <>
            <Text style={[type.label, styles.label]}>Room name</Text>
            <TextInput
              value={roomName}
              onChangeText={(value) => {
                setRoomName(value);
                if (formError) setFormError(null);
              }}
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
  error: { ...type.body, color: colors.danger },
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
