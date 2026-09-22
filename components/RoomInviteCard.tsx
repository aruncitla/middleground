import { forwardRef } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandMark } from '@/components/BrandMark';
import { VennField } from '@/components/VennField';
import { APP_HOST, APP_URL } from '@/lib/app';
import { colors, fonts, type } from '@/lib/theme';

export type RoomInviteCardProps = {
  name: string;
  code: string;
  topicsDebated: number;
  verdictsReached: number;
  memberCount: number;
};

export const RoomInviteCard = forwardRef<View, RoomInviteCardProps>(function RoomInviteCard(
  { name, code, topicsDebated, verdictsReached, memberCount },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} style={styles.frame}>
      <LinearGradient
        colors={['#09090b', '#111113', '#18181b', '#09090b']}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={styles.gradient}
      >
        <VennField variant="card" />
        <BrandMark size="sm" toHome={false} />
        <Text style={styles.kicker}>Room invite</Text>
        <Text style={styles.name} numberOfLines={3}>
          {name}
        </Text>
        <View style={styles.codeWell}>
          <Text style={styles.codeLabel}>Code</Text>
          <Text style={styles.code}>{code}</Text>
        </View>
        <Text style={styles.stats}>
          {topicsDebated} {topicsDebated === 1 ? 'topic' : 'topics'} debated · {verdictsReached}{' '}
          {verdictsReached === 1 ? 'verdict' : 'verdicts'} · {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </Text>
        <View style={styles.cta}>
          <Text style={styles.ctaLabel}>Join the room</Text>
          <Text style={styles.ctaCode}>{code}</Text>
        </View>
        <View style={styles.footer}>
          <View>
            <Text style={styles.watermark}>middleground</Text>
            <Pressable onPress={() => void Linking.openURL(APP_URL)} accessibilityRole="link">
              <Text style={styles.appLink}>{APP_HOST}</Text>
            </Pressable>
          </View>
          <Text style={styles.meta}>Bring a take. Find the overlap.</Text>
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    aspectRatio: 3 / 4.15,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 0 40px rgba(99, 102, 241, 0.16)',
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    justifyContent: 'space-between',
  },
  kicker: {
    ...type.kicker,
    color: colors.accentHover,
    textTransform: 'uppercase',
    marginTop: 16,
  },
  name: {
    ...type.title,
    fontSize: 26,
    lineHeight: 32,
    marginTop: 6,
  },
  codeWell: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    backgroundColor: 'rgba(24,24,27,0.72)',
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  codeLabel: { ...type.kicker, textTransform: 'uppercase' },
  code: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 42,
    letterSpacing: 4,
    lineHeight: 48,
  },
  stats: {
    ...type.body,
    color: colors.ink,
    marginTop: 16,
    textAlign: 'center',
  },
  cta: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
  },
  ctaLabel: { ...type.button, fontSize: 14 },
  ctaCode: { ...type.kicker, color: colors.ink, letterSpacing: 2 },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  watermark: {
    color: colors.faint,
    fontFamily: fonts.medium,
    fontWeight: '500',
    letterSpacing: -0.2,
    fontSize: 11,
  },
  appLink: {
    color: colors.accentHover,
    fontFamily: fonts.medium,
    fontWeight: '500',
    fontSize: 11,
  },
  meta: { ...type.footnote, textAlign: 'right', flexShrink: 1 },
});
