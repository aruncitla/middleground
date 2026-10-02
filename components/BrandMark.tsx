import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LoopMark } from '@/components/LoopMark';
import { type } from '@/lib/theme';

type BrandProps = {
  size?: 'sm' | 'md';
  toHome?: boolean;
  fromMark?: boolean;
};

export function BrandMark({ toHome = true, fromMark = false }: BrandProps) {
  const row = (
    <View style={styles.row}>
      <LoopMark height={28} />
      <Text style={type.brand}>{fromMark ? 'from Middleground' : 'Middleground'}</Text>
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
});
