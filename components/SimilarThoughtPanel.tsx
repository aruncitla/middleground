import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { colors, controls, type } from '@/lib/theme';
import type { SimilarKind } from '@/lib/similarThought';

type Props = {
  kind: SimilarKind;
  thought: string;
  author: string;
  onVoteTheirs: () => void;
  onAddAnyway?: () => void;
  onEditMine: () => void;
};

export function SimilarThoughtPanel({ kind, thought, author, onVoteTheirs, onAddAnyway, onEditMine }: Props) {
  const exact = kind === 'exact';
  return (
    <View style={styles.panel}>
      <Text style={type.section}>{exact ? 'Already in the room' : 'Looks similar to an existing thought'}</Text>
      <Text style={styles.thought}>{thought}</Text>
      <Text style={type.footnote}>{author}</Text>
      <Button label="Vote on theirs" onPress={onVoteTheirs} />
      {exact ? null : <Button variant="secondary" label="Add mine anyway" onPress={onAddAnyway} />}
      <Pressable onPress={onEditMine} accessibilityRole="button">
        <Text style={controls.ghostText}>Edit mine</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    ...controls.panel,
    gap: 8,
  },
  thought: {
    ...type.body,
    color: colors.ink,
  },
});
