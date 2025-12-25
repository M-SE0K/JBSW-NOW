import { useState, useRef } from "react";
import { useFocusEffect, usePathname } from "expo-router";
import { useCallback } from "react";

// 탭 인덱스 매핑 (탭바 순서에 맞춤)
const TAB_INDEX_MAP: Record<string, number> = {
  "/": 0,
  "/index": 0,
  "/events": 1,
  "/events/": 1,
  "/events/index": 1,
  "/chat": 2,
  "/chat/": 2,
  "/chat/index": 2,
  "/favorites": 3,
  "/favorites/": 3,
  "/favorites/index": 3,
  "/hot": 4,
  "/hot/": 4,
  "/hot/index": 4,
};

export const usePageTransition = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const prevTabIndexRef = useRef<number | null>(null);
  const pathname = usePathname();

  useFocusEffect(
    useCallback(() => {
      // 현재 탭 인덱스 계산
      const currentTabIndex = TAB_INDEX_MAP[pathname || "/"] ?? 0;
      
      // 방향 결정
      if (prevTabIndexRef.current !== null) {
        if (prevTabIndexRef.current < currentTabIndex) {
          // 오른쪽으로 이동 (왼쪽에서 들어옴)
          setDirection("right");
        } else if (prevTabIndexRef.current > currentTabIndex) {
          // 왼쪽으로 이동 (오른쪽에서 들어옴)
          setDirection("left");
        }
      }
      
      // 이전 인덱스 업데이트
      prevTabIndexRef.current = currentTabIndex;

      // 페이지가 포커스될 때 로딩 시작
      setIsLoading(true);
      setIsVisible(false);

      // 짧은 딜레이 후 애니메이션 시작
      const loadingTimer = setTimeout(() => {
        setIsLoading(false);
        setIsVisible(true);
      }, 150);

      return () => {
        clearTimeout(loadingTimer);
        setIsVisible(false);
        setIsLoading(false);
      };
    }, [pathname])
  );

  return { isVisible, isLoading, direction };
};

