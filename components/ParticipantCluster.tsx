import { ScrollView, StyleSheet, View } from 'react-native';
import { AvatarBadge } from '@/components/AvatarBadge';
import type { Participant } from '@/types/room';

export function ParticipantCluster({ participants }: { participants: Participant[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {participants.map((p, i) => (
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
