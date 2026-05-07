import { useEffect } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

export type AnimType = 'bounceIn' | 'float' | 'pulse' | 'springSelect';

interface Props {
  emoji: string;
  style?: StyleProp<TextStyle>;
  type?: AnimType;
  delay?: number;
  selected?: boolean;
}

export default function AnimatedEmoji({
  emoji,
  style,
  type = 'bounceIn',
  delay = 0,
  selected,
}: Props) {
  const scale = useSharedValue(type === 'bounceIn' ? 0 : 1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (type === 'bounceIn') {
      scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 180 }));
    } else if (type === 'float') {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 900 }),
          withTiming(0, { duration: 900 }),
        ),
        -1,
        true,
      );
    } else if (type === 'pulse') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 1000 }),
          withTiming(1, { duration: 1000 }),
        ),
        -1,
        true,
      );
    }
  }, []);

  // springSelect reacts to the `selected` prop changing
  useEffect(() => {
    if (type !== 'springSelect') return;
    scale.value = withSpring(selected ? 1.15 : 1.0, { damping: 6, stiffness: 200 });
  }, [selected, type]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[style, animatedStyle]}>{emoji}</Animated.Text>
  );
}
