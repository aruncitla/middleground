import { Image, StyleSheet, Text, View } from 'react-native';
import { type } from '@/lib/theme';

const mark = require('../assets/brand/bridge-m.png');

type BrandProps = {
  size?: 'sm' | 'md';
};

export function BrandMark({ size = 'md' }: BrandProps) {
  const dim = size === 'sm' ? 28 : 36;
  return (
    <View style={styles.row} accessibilityRole="header">
      <Image source={mark} style={[styles.mark, { width: dim, height: dim * 0.62 }]} resizeMode="contain" />
      <Text style={[type.brand, size === 'sm' && styles.smWord]}>Middleground</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { mixBlendMode: 'screen' },
  smWord: { fontSize: 14, letterSpacing: -0.3 },
});
