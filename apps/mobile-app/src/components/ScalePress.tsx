import React, { useRef } from 'react';
import { Animated, Pressable, ViewStyle, StyleProp, Platform } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ScalePressProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'checkbox' | 'radio' | 'tab' | 'menuitem';
}

export function ScalePress({
  onPress,
  onLongPress,
  children,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
}: ScalePressProps) {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleValue, {
      toValue: 0.97,
      duration: 80,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      tension: 180,
      friction: 10,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[
        style,
        {
          transform: [{ scale: scaleValue } as any],
        },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
