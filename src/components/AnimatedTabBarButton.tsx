import React from 'react';
import { Pressable, View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

export const AnimatedTabBarButton = (props: BottomTabBarButtonProps) => {
  const { children, onPress, accessibilityState } = props;
  const focused = accessibilityState?.selected;

  // 웹 환경에서만 호버 애니메이션 적용
  if (Platform.OS !== 'web') {
    return (
      <Pressable onPress={onPress} style={styles.container}>
        {children}
      </Pressable>
    );
  }

  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(focused ? 1 : 0.6);
  const backgroundOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.container}
      onHoverIn={() => {
        scale.value = withTiming(1.15, { duration: 200 });
        translateY.value = withTiming(-5, { duration: 200 });
        opacity.value = withTiming(1, { duration: 200 });
        backgroundOpacity.value = withTiming(1, { duration: 200 });
      }}
      onHoverOut={() => {
        scale.value = withTiming(1, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        opacity.value = withTiming(focused ? 1 : 0.6, { duration: 200 });
        backgroundOpacity.value = withTiming(0, { duration: 200 });
      }}
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(100, 102, 233, 0.1)',
              borderRadius: 12,
            },
            backgroundAnimatedStyle,
          ]}
        />
        <Animated.View style={[styles.innerContent, animatedStyle]}>
          {children}
        </Animated.View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // 웹 호환성을 위해 cursor 스타일 추가 (React Native Web이 처리)
    // @ts-ignore
    cursor: 'pointer',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
});

