import { Platform, View } from 'react-native';
import { Button } from '@/components/Button';
import { VOTE_LABELS, type VoteChoice } from '@/lib/voteChoice';

type Props = {
  onChoice: (choice: VoteChoice) => void;
  current?: VoteChoice;
};

export function VoteButtons({ onChoice, current }: Props) {
  return (
    <View style={styles.row as object}>
      <View style={styles.side}>
        <Button
          variant="coral"
          label={VOTE_LABELS.disagree}
          selected={current === 'disagree'}
          onPress={() => onChoice('disagree')}
        />
      </View>
      <View style={styles.mid}>
        <Button
          variant="maybe"
          label={VOTE_LABELS.maybe}
          selected={current === 'maybe'}
          onPress={() => onChoice('maybe')}
        />
      </View>
      <View style={styles.side}>
        <Button
          variant="primary"
          label={VOTE_LABELS.agree}
          selected={current === 'agree'}
          onPress={() => onChoice('agree')}
        />
      </View>
    </View>
  );
}

const styles = {
  row:
    Platform.OS === 'web'
      ? {
          display: 'grid' as const,
          gridTemplateColumns: '1fr 104px 1fr',
          gap: 10,
          zIndex: 20,
        }
      : {
          flexDirection: 'row' as const,
          gap: 10,
          zIndex: 20,
        },
  side: { flex: 1, minWidth: 0 },
  mid: { width: 104, flexGrow: 0, flexShrink: 0 },
};
