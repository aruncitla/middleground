import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VennField } from '@/components/VennField';
import { colors, type } from '@/lib/theme';

type Props = {
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
};

export function Screen({ children, loading, error }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <VennField variant="ambient" />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentHover} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { ...type.body, color: colors.danger, textAlign: 'center' },
});
