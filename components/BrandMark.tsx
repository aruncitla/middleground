import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LoopMark } from '@/components/LoopMark';
import { type } from '@/lib/theme';

type BrandProps = {
  size?: 'sm' | 'md';
  toHome?: boolean;
  fromMark?: boolean;
};

export function BrandMark({ size = 'md', toHome = true, fromMark = false }: BrandProps) {
  const dim = size === 'sm' ? 44 : 56;
  const row = (
    <View style={styles.row}>
      <LoopMark size={dim} />
      <Text style={[type.brand, size === 'sm' && styles.smWord]}>
        {fromMark ? 'from Middleground' : 'Middleground'}
      </Text>
    </View>
  );
  if (!toHome) return row;
  return (
    <Link href="/" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel="Middleground home">
        {row}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  smWord: { fontSize: 14, letterSpacing: -0.3 },
});
