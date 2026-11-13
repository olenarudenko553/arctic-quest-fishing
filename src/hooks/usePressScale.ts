import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { theme } from '../constants/theme';

/**
 * Press feedback the way this stack needs it: the Pressable stays the PARENT and
 * drives this value from onPressIn / onPressOut; the Animated.View lives INSIDE
 * it. Transform only, native driver (rule 4.6 / 12.5).
 */
export function usePressScale(min = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: min,
      useNativeDriver: true,
      ...theme.springs.press,
    }).start();
  }, [min, scale]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      ...theme.springs.press,
    }).start();
  }, [scale]);

  return { scale, onPressIn, onPressOut };
}

export default usePressScale;
