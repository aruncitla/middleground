import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from '@/components/BrandMark';
import { colors, type } from '@/lib/theme';

type Props = {
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
};

export function Screen({ children, loading, error }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.header}>
          <BrandMark />
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accentHover} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : (
          <View style={styles.body}>{children}</View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  header: {
    height: 56,
    justifyContent: 'center',
  },
  body: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { ...type.body, color: colors.danger, textAlign: 'center' },
});
