import { StyleSheet, View, type ViewStyle } from 'react-native';

type CircleSpec = {
  size: number;
  style: ViewStyle;
  fill: string;
  stroke: string;
};

const AMBIENT: CircleSpec[] = [
  {
    size: 400,
    style: { top: -96, right: -72 },
    fill: 'rgba(79, 70, 229, 0.16)',
    stroke: 'rgba(99, 102, 241, 0.34)',
  },
  {
    size: 340,
    style: { top: 28, right: 86 },
    fill: 'rgba(99, 102, 241, 0.12)',
    stroke: 'rgba(165, 180, 252, 0.28)',
  },
  {
    size: 210,
    style: { top: 210, left: 18 },
    fill: 'rgba(255, 255, 255, 0.03)',
    stroke: 'rgba(161, 161, 170, 0.22)',
  },
  {
    size: 300,
    style: { bottom: -110, left: -90 },
    fill: 'rgba(251, 191, 36, 0.06)',
    stroke: 'rgba(251, 191, 36, 0.18)',
  },
];

const CARD: CircleSpec[] = [
  {
    size: 220,
    style: { top: 88, left: -36 },
    fill: 'rgba(79, 70, 229, 0.12)',
    stroke: 'rgba(99, 102, 241, 0.28)',
  },
  {
    size: 220,
    style: { top: 88, right: -36 },
    fill: 'rgba(99, 102, 241, 0.1)',
    stroke: 'rgba(165, 180, 252, 0.24)',
  },
];

const SETS = { ambient: AMBIENT, card: CARD } as const;

type Props = {
  variant?: keyof typeof SETS;
};

export function VennField({ variant = 'ambient' }: Props) {
  return (
    <View pointerEvents="none" style={styles.layer}>
      {SETS[variant].map((circle, i) => (
        <View
          key={i}
          style={[
            styles.circle,
            {
              width: circle.size,
              height: circle.size,
              borderRadius: circle.size / 2,
              backgroundColor: circle.fill,
              borderColor: circle.stroke,
            },
            circle.style,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderWidth: 1,
    mixBlendMode: 'screen',
  },
});
