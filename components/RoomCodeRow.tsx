import { StyleSheet, Text, View } from 'react-native';
import { CopyButton } from '@/components/CopyButton';
import { colors, radii, type } from '@/lib/theme';

type Props = {
  code: string;
  url: string;
};

export function RoomCodeRow({ code, url }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.chip}>
        <Text style={styles.chipLabel}>Room</Text>
        <Text style={styles.code}>{code}</Text>
      </View>
      <View style={styles.copy}>
        <CopyButton value={url} label="Copy room link" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface3,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipLabel: { ...type.kicker, textTransform: 'uppercase' },
  code: { ...type.code, fontSize: 18, letterSpacing: 2 },
  copy: { width: '100%' },
});
