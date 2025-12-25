import React, { useEffect } from "react";
import { View, StyleSheet, useColorScheme, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ActivityIndicator } from "react-native";

type PageTransitionProps = {
  children: React.ReactNode;
  isVisible: boolean;
  showLoading?: boolean;
  direction?: "left" | "right";
};

export const PageTransition = ({ 
  children, 
  isVisible, 
  showLoading = false,
  direction = "right" 
}: PageTransitionProps) => {
  const screenWidth = Dimensions.get("window").width;
  const scheme = useColorScheme();
  
  // 배너 슬라이더와 동일한 부드러운 애니메이션
  const translateX = useSharedValue(isVisible ? 0 : (direction === "right" ? -screenWidth : screenWidth));

  useEffect(() => {
    if (isVisible) {
      // 들어올 때: 방향에 따라 반대편에서 부드럽게 들어옴
      const enterFromX = direction === "right" ? -screenWidth : screenWidth;
      translateX.value = enterFromX;
      
      // 배너 슬라이더와 유사한 부드러운 타이밍
      translateX.value = withTiming(0, {
        duration: 350,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // iOS 기본 이징 커브
      });
    } else {
      // 나갈 때: 방향에 따라 반대편으로 부드럽게 나감
      const exitToX = direction === "right" ? screenWidth : -screenWidth;
      
      // 나가는 모션을 더 명확하게 보이도록
      translateX.value = withTiming(exitToX, {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }
  }, [isVisible, direction, screenWidth]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
      ],
    };
  });

  if (showLoading) {
    return (
      <View style={[styles.container, { backgroundColor: scheme === "dark" ? "#0F172A" : "#F9FAFB" }]}>
        <ActivityIndicator size="large" color={scheme === "dark" ? "#fff" : "#111"} />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

