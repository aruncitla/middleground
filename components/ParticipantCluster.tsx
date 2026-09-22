import { ScrollView, StyleSheet, View } from 'react-native';
import { AvatarBadge } from '@/components/AvatarBadge';
import { seatEntryCount } from '@/lib/entries';
import type { Entry, Participant, Seat } from '@/types/room';

export function ParticipantCluster({
  participants,
  seats,
  entries = [],
}: {
  participants: Participant[];
  seats?: Seat[];
  entries?: Entry[];
}) {
  const rows = seats?.length
    ? seats.map((s) => ({
        id: s.id,
        displayName: s.displayName,
        avatarId: s.avatarId,
        entryCount: seatEntryCount(entries, s),
      }))
    : participants.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        avatarId: p.avatarId,
        entryCount: p.entryCount,
      }));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {rows.map((p, i) => (
        <View key={p.id} style={[styles.item, { marginLeft: i === 0 ? 0 : -8 }]}>
          <AvatarBadge avatarId={p.avatarId} displayName={p.displayName} entryCount={p.entryCount} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 8, paddingRight: 16, alignItems: 'flex-start' },
  item: { zIndex: 1 },
});
