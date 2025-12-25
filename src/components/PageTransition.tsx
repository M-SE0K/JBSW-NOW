import React, { useEffect, useMemo, memo } from "react";
import { StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

type PageTransitionProps = {
  children: React.ReactNode;
  isVisible: boolean;
  direction?: "left" | "right";
};

export const PageTransition = memo(({ 
  children, 
  isVisible, 
  direction = "right" 
}: PageTransitionProps) => {
  // Dimensions를 한 번만 계산하고 캐싱
  const screenWidth = useMemo(() => Dimensions.get("window").width, []);
  
  // 애니메이션 값 초기화 (direction 변경 시에도 올바르게 초기화)
  const translateX = useSharedValue(0);
  const directionRef = React.useRef(direction);

  useEffect(() => {
    // direction이 변경되면 이전 애니메이션 취소
    if (directionRef.current !== direction) {
      cancelAnimation(translateX);
      directionRef.current = direction;
    }

    if (isVisible) {
      // 들어올 때: 방향에 따라 반대편에서 부드럽게 들어옴
      const enterFromX = direction === "right" ? -screenWidth : screenWidth;
      translateX.value = enterFromX;
      
      // 배너 슬라이더와 유사한 부드러운 타이밍
      translateX.value = withTiming(0, {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // iOS 기본 이징 커브
      });
    } else {
      // 나갈 때: 방향에 따라 반대편으로 부드럽게 나감
      const exitToX = direction === "right" ? screenWidth : -screenWidth;
      
      // 나가는 모션을 더 명확하게 보이도록
      translateX.value = withTiming(exitToX, {
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }
  }, [isVisible, direction, screenWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
      ],
    };
  }, []);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  );
});

PageTransition.displayName = "PageTransition";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

