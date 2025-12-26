import { useState, useRef, useMemo } from "react";
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
  "/settings": 5,
  "/settings/": 5,
  "/settings/index": 5,
  "/search": 6,
  "/search/": 6,
  "/search/index": 6,
  "/notification": 7,
  "/notification/": 7,
  "/notification/index": 7,
  "/notification/settings": 8,
};

export const usePageTransition = () => {
  const [isVisible, setIsVisible] = useState(true); // 즉시 표시
  const [direction, setDirection] = useState<"left" | "right">("right");
  const prevTabIndexRef = useRef<number | null>(null);
  const pathname = usePathname();

  // 현재 탭 인덱스를 메모이제이션
  const currentTabIndex = useMemo(() => {
    return TAB_INDEX_MAP[pathname || "/"] ?? 0;
  }, [pathname]);

  useFocusEffect(
    useCallback(() => {
      // 방향 결정 (이전 인덱스와 비교)
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

      // 즉시 페이지 전환 애니메이션 시작
      setIsVisible(true);

      return () => {
        setIsVisible(false);
      };
    }, [currentTabIndex])
  );

  return { isVisible, direction };
};

