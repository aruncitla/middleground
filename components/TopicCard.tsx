import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, controls } from '@/lib/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function TopicCard({ children, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      <LinearGradient
        colors={['#FF6B6B', '#FF6B6B', '#FBBF24', '#2DD4BF', '#2DD4BF']}
        locations={[0, 0.38, 0.5, 0.62, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.edge}
      />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...controls.panel,
    padding: 0,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  edge: { height: 3, width: '100%' },
  body: { padding: 18, gap: 8 },
});
