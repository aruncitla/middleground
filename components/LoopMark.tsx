import { useId } from 'react';
import Svg, { ClipPath, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  size?: number;
  mono?: boolean;
};

const VB_W = 76;
const VB_H = 32;
const LEFT = 'M15 3 L33 3 A13 13 0 0 1 33 29 L15 29 A13 13 0 0 1 15 3 Z';
const RIGHT = 'M43 3 L61 3 A13 13 0 0 1 61 29 L43 29 A13 13 0 0 1 43 3 Z';

export function LoopMark({ size = 52, mono = false }: Props) {
  const uid = useId().replace(/:/g, '');
  const glow = `mg-glow-${uid}`;
  const clipL = `mg-l-${uid}`;
  const clipR = `mg-r-${uid}`;
  const height = Math.round((size * VB_H) / VB_W);
  const stroke = mono ? '#FFFFFF' : undefined;
  return (
    <Svg
      width={size}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      fill="none"
      accessibilityLabel="Middleground"
    >
      <Defs>
        <ClipPath id={clipL}>
          <Path d={LEFT} />
        </ClipPath>
        <ClipPath id={clipR}>
          <Path d={RIGHT} />
        </ClipPath>
        <RadialGradient id={glow} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FCD34D" />
          <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {mono ? null : (
        <G clipPath={`url(#${clipL})`}>
          <G clipPath={`url(#${clipR})`}>
            <Rect width={76} height={32} fill={`url(#${glow})`} />
          </G>
        </G>
      )}
      <Path d={LEFT} fill="none" stroke={stroke ?? '#FF6B6B'} strokeWidth={4} />
      <Path d={RIGHT} fill="none" stroke={stroke ?? '#2DD4BF'} strokeWidth={4} />
    </Svg>
  );
}
