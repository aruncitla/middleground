import { StyleSheet, Text, View } from 'react-native';
import { avatarById, colors } from '@/lib/theme';

type Props = {
  avatarId: string;
  displayName: string;
  entryCount?: number;
  size?: number;
};

export function AvatarBadge({ avatarId, displayName, entryCount, size = 56 }: Props) {
  const avatar = avatarById(avatarId);
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.orb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: avatar.color,
          },
        ]}
      >
        <Text style={[styles.emoji, { fontSize: size * 0.46 }]}>{avatar.emoji}</Text>
      </View>
      {typeof entryCount === 'number' ? (
        <View style={styles.chip}>
          <Text style={styles.chipText}>{entryCount}</Text>
        </View>
      ) : null}
      <Text numberOfLines={1} style={styles.name}>
        {displayName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: 72 },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.border,
  },
  emoji: { lineHeight: 32 },
  chip: {
    position: 'absolute',
    top: -4,
    right: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chipText: { color: colors.ink, fontSize: 11, fontFamily: 'Inter', fontWeight: '600' },
  name: { marginTop: 6, color: colors.muted, fontSize: 11, fontFamily: 'Inter', fontWeight: '500' },
});
