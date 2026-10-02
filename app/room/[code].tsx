import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { RoomInviteCard } from '@/components/RoomInviteCard';
import { Screen } from '@/components/Screen';
import { SeatGate } from '@/components/SeatGate';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { roomShareUrl } from '@/lib/app';
import { notify } from '@/lib/notify';
import { avatarById } from '@/lib/theme';
import { pathForRoom } from '@/lib/roomPath';
import { loadSavedRoom, renameRoom } from '@/lib/roomService';
import { shareRoomInviteCard } from '@/lib/shareConsensus';
import { topicIsLive } from '@/lib/verdict';
import { colors, controls, type } from '@/lib/theme';
import type { SavedRoom, TopicPreview } from '@/types/room';

function formatDate(date: Date | null) {
  if (!date) return 'Unknown date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RoomHomeScreen() {
  const { code: raw, topic: rawTopic } = useLocalSearchParams<{
    code: string;
    topic?: string;
  }>();
  const code = String(raw ?? '').toUpperCase();
  const highlight = String(rawTopic ?? '').toUpperCase();
  const router = useRouter();
  const { user, loading, error } = useGuestAuth();
  const [saved, setSaved] = useState<SavedRoom | null>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const inviteRef = useRef<View>(null);

  useFocusEffect(
    useCallback(() => {
      if (!code || !user) return;
      let cancelled = false;
      setReady(false);
      void (async () => {
        try {
          const next = await loadSavedRoom(code);
          if (cancelled) return;
          setSaved(next);
          setNameDraft(next?.name ?? '');
          setReady(true);
        } catch {
          if (cancelled) return;
          setSaved(null);
          setReady(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [code, user]),
  );

  const isHost = Boolean(user && saved && user.uid === saved.hostId);
  const shareUrl = saved ? roomShareUrl(saved.code) : '';
  const container = saved?.code ?? code;

  const onCopyLink = async () => {
    if (!shareUrl) return;
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onShareInvite = async () => {
    if (!saved) return;
    setShowInvite(true);
    setSharing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      const result = await shareRoomInviteCard(inviteRef.current, saved.name, saved.code, shareUrl);
      if (result === 'copied') {
        notify('Invite ready', 'Link copied. If an image downloaded, attach it in WhatsApp or any chat.');
      }
    } catch (e) {
      notify('Could not share', e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  };

  const openTopic = (row: TopicPreview) => {
    router.push(pathForRoom(row.code, row.status));
  };

  const onRename = async () => {
    if (!saved) return;
    try {
      await renameRoom(saved.code, nameDraft);
      setRenaming(false);
      const next = await loadSavedRoom(saved.code);
      setSaved(next);
      setNameDraft(next?.name ?? nameDraft);
    } catch (e) {
      notify('Could not rename', e instanceof Error ? e.message : String(e));
    }
  };

  const stats = useMemo(() => {
    if (!saved) return [];
    return [
      { label: 'Topics debated', value: String(saved.topicsDebated) },
      { label: 'Verdicts reached', value: String(saved.verdictsReached) },
      { label: 'Members', value: String(saved.memberCount) },
      { label: 'Week streak', value: saved.weekStreak ? `${saved.weekStreak}` : '0' },
    ];
  }, [saved]);

  return (
    <Screen loading={loading || !ready} error={error || (!saved && ready ? 'Room not found' : null)}>
      <SeatGate containerCode={container} uid={user?.uid} required={false}>
        {(session) => {
          const avatar = session.seat ? avatarById(session.seat.avatarId) : null;
          return (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
              <BrandMark />
              <Pressable onPress={() => router.replace('/')} accessibilityRole="button">
                <Text style={controls.ghostText}>All rooms</Text>
              </Pressable>
              {renaming ? (
                <View style={styles.rename}>
                  <Text style={type.label}>Room name</Text>
                  <TextInput
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    style={controls.input}
                    placeholder="Friday crew"
                    placeholderTextColor={colors.muted}
                    maxLength={80}
                  />
                  <Button label="Save name" onPress={() => void onRename()} />
                  <Pressable
                    onPress={() => {
                      setRenaming(false);
                      setNameDraft(saved?.name ?? '');
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={controls.ghostText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={type.title}>{saved?.name}</Text>
                  <Pressable onPress={() => setRenaming(true)} accessibilityRole="button">
                    <Text style={controls.ghostText}>Rename room</Text>
                  </Pressable>
                </>
              )}
              <Pressable onPress={() => void onCopyLink()} accessibilityRole="button">
                <Text style={styles.code}>{saved?.code}</Text>
              </Pressable>
              {saved?.created ? <Text style={type.footnote}>Created {formatDate(saved.created)}</Text> : null}
              {session.seat ? (
                <Text style={type.footnote}>
                  {avatar?.emoji} {session.seat.displayName}
                </Text>
              ) : (
                <Pressable onPress={() => session.setSwitching(true)} accessibilityRole="button">
                  <Text style={controls.ghostText}>Add a name to join in</Text>
                </Pressable>
              )}
              <Pressable onPress={() => session.setSwitching(true)} accessibilityRole="button">
                <Text style={controls.ghostText}>Switch seat</Text>
              </Pressable>
              <Pressable onPress={() => void onCopyLink()} accessibilityRole="button">
                <Text style={controls.ghostText}>{copied ? 'Link copied' : 'Copy room link'}</Text>
              </Pressable>
              <Button
                label={sharing ? 'Preparing…' : 'Share invite card'}
                onPress={() => void onShareInvite()}
                disabled={sharing}
              />

              {(showInvite || sharing) && saved ? (
                <>
                  <RoomInviteCard
                    ref={inviteRef}
                    name={saved.name}
                    code={saved.code}
                    topicsDebated={saved.topicsDebated}
                    verdictsReached={saved.verdictsReached}
                    memberCount={saved.memberCount}
                  />
                  <Text style={styles.shareHint}>
                    Room invite — code and roster. Different from a topic’s verdict card.
                  </Text>
                </>
              ) : null}

              <View style={styles.stats}>
                    {stats.map((item) => (
                  <View key={item.label} style={styles.stat}>
                    <Text style={styles.statValue}>
                      {item.label === 'Members'
                        ? String(Math.max(session.seats.length, Number(item.value) || 0))
                        : item.value}
                    </Text>
                    <Text style={styles.statLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>

              {isHost ? (
                <View style={controls.panel}>
                  <Text style={type.section}>Host</Text>
                  <Button
                    label="New topic"
                    onPress={() => router.push(`/new?room=${saved?.code}`)}
                  />
                </View>
              ) : (
                <Button label="New topic" onPress={() => router.push(`/new?room=${saved?.code}`)} />
              )}

              {saved?.liveTopic ? (
                <View style={styles.section}>
                  <Text style={type.section}>Live now</Text>
                  <VerdictCard
                    row={saved.liveTopic}
                    highlight={highlight === saved.liveTopic.code}
                    onPress={() => openTopic(saved.liveTopic!)}
                    onOpenSub={(sub) => openTopic(sub)}
                  />
                </View>
              ) : null}

              <View style={styles.section}>
                <Text style={type.section}>Past topics</Text>
                {saved?.pastTopics.length ? (
                  saved.pastTopics.map((row) => (
                    <VerdictCard
                      key={row.code}
                      row={row}
                      highlight={highlight === row.code || row.subtopics.some((s) => s.code === highlight)}
                      onPress={() => openTopic(row)}
                      onOpenSub={(sub) => openTopic(sub)}
                    />
                  ))
                ) : (
                  <Text style={type.footnote}>Finished topics land here as verdict cards.</Text>
                )}
              </View>
            </ScrollView>
          );
        }}
      </SeatGate>
    </Screen>
  );
}

function VerdictCard({
  row,
  highlight,
  onPress,
  onOpenSub,
}: {
  row: TopicPreview;
  highlight?: boolean;
  onPress: () => void;
  onOpenSub: (row: TopicPreview) => void;
}) {
  const live = topicIsLive(row.status);
  return (
    <View style={[styles.card, highlight && styles.cardOn]}>
      <Pressable onPress={onPress} accessibilityRole="button" style={styles.cardMain}>
        {live ? <Text style={styles.live}>Live</Text> : null}
        <Text style={styles.prompt}>{row.prompt}</Text>
        <Text style={type.footnote}>{formatDate(row.date)}</Text>
        <Text style={styles.verdict}>{row.verdict}</Text>
        <Text style={type.body}>
          {row.cardCount} cards · {row.people} {row.people === 1 ? 'person' : 'people'}
          {row.subtopicCount ? ` · ${row.subtopicCount} sub-topics` : ''}
        </Text>
      </Pressable>
      {row.subtopics.map((sub) => (
        <Pressable
          key={sub.code}
          onPress={() => onOpenSub(sub)}
          accessibilityRole="button"
          style={styles.sub}
        >
          <Text style={styles.subKicker}>Sub-topic</Text>
          <Text style={styles.subPrompt}>{sub.prompt}</Text>
          <Text style={type.footnote}>{sub.verdict}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22, paddingBottom: 48, gap: 10 },
  rename: { gap: 8 },
  code: { ...type.kicker, fontSize: 18, letterSpacing: 2, color: colors.ink },
  shareHint: { ...type.footnote, maxWidth: 420, alignSelf: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    flexGrow: 1,
    minWidth: 70,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 2,
  },
  statValue: { ...type.title, fontSize: 20 },
  statLabel: { ...type.footnote },
  section: { gap: 8, marginTop: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardOn: { borderColor: colors.accentHover },
  cardMain: { padding: 14, gap: 4 },
  live: { ...type.kicker, color: colors.accentHover, textTransform: 'uppercase' },
  prompt: { ...type.section, fontSize: 16 },
  verdict: { ...type.body, color: colors.ink },
  sub: {
    padding: 12,
    paddingLeft: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardAlt,
    gap: 2,
  },
  subKicker: { ...type.kicker, color: colors.accentHover, textTransform: 'uppercase' },
  subPrompt: { ...type.body, color: colors.ink, fontSize: 14 },
});
