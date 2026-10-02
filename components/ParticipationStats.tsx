import { StyleSheet, Text, View } from 'react-native';
import { thoughtCount } from '@/lib/entries';
import { type } from '@/lib/theme';
import type { Entry, Participant, Seat, Vote } from '@/types/room';

type Props = {
  participants: Participant[];
  seats?: Seat[];
  entries?: Entry[];
  votes?: Vote[];
  cardIds?: string[];
  showVotes?: boolean;
  showShare?: boolean;
};

export function ParticipationStats({
  participants,
  seats,
  entries = [],
  votes = [],
  showVotes = false,
}: Props) {
  const people = Math.max(seats?.length ?? 0, participants.length);
  const thoughts = thoughtCount(entries);
  const voteCount = votes.length;
  if (people === 0 && thoughts === 0 && voteCount === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={type.body}>
        {people} {people === 1 ? 'person' : 'people'} in
        {showVotes ? ` · ${voteCount} ${voteCount === 1 ? 'vote' : 'votes'} cast` : ` · ${thoughts} ${thoughts === 1 ? 'thought' : 'thoughts'}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
});
