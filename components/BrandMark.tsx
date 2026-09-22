import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { type } from '@/lib/theme';

const mark = require('../assets/brand/bridge-m.png');

type BrandProps = {
  size?: 'sm' | 'md';
  toHome?: boolean;
};

export function BrandMark({ size = 'md', toHome = true }: BrandProps) {
  const dim = size === 'sm' ? 28 : 36;
  const row = (
    <View style={styles.row}>
      <Image source={mark} style={[styles.mark, { width: dim, height: dim * 0.62 }]} resizeMode="contain" />
      <Text style={[type.brand, size === 'sm' && styles.smWord]}>Middleground</Text>
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
  mark: { mixBlendMode: 'screen' },
  smWord: { fontSize: 14, letterSpacing: -0.3 },
});
