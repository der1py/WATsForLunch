import { type PropsWithChildren, useEffect, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Animated, {
    FadeInDown,
    FadeOutUp,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const animationDuration = 180;

type ExpandableContentProps = PropsWithChildren & {
  expanded?: boolean;
};

/**
 * Reveals disclosure content. Supplying `expanded` uses a clipped
 * height-and-opacity accordion; omitting it preserves the existing
 * mount/unmount animation for conditional content.
 */
export function ExpandableContent({ children, expanded }: ExpandableContentProps) {
  if (expanded === undefined) {
    return (
      <Animated.View
        entering={FadeInDown.duration(animationDuration)}
        exiting={FadeOutUp.duration(animationDuration)}>
        {children}
      </Animated.View>
    );
  }

  return <AccordionContent expanded={expanded}>{children}</AccordionContent>;
}

function AccordionContent({ children, expanded }: Required<ExpandableContentProps>) {
  const [contentHeight, setContentHeight] = useState(0);
  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);

  useEffect(() => {
    animatedHeight.value = withTiming(expanded ? contentHeight : 0, {
      duration: animationDuration,
    });
    animatedOpacity.value = withTiming(expanded ? 1 : 0, { duration: animationDuration });
  }, [animatedHeight, animatedOpacity, contentHeight, expanded]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedOpacity.value,
  }));

  function handleContentLayout(event: LayoutChangeEvent) {
    setContentHeight(event.nativeEvent.layout.height);
  }

  return (
    <Animated.View
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      pointerEvents={expanded ? 'auto' : 'none'}
      style={[styles.accordion, animatedStyle]}>
      <View onLayout={handleContentLayout}>{children}</View>
    </Animated.View>
  );
}

const styles = {
  accordion: {
    overflow: 'hidden' as const,
  },
};
