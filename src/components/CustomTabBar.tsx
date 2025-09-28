import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, Animated, Text, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// 간단한 any 타입으로 처리하여 의존성 최소화
export default function CustomTabBar(props: any) {
  const { state, descriptors, navigation } = props;
  const [containerWidth, setContainerWidth] = useState(0);
  const routes = state?.routes || [];
  // 탭바에 노출할 허용 라우트만 화이트리스트로 제한
  const allowed = new Set(["index", "favorites/index", "hot/index"]);
  const visibleRoutes = routes.filter((r: any) => allowed.has(r.name));
  const tabCount = visibleRoutes.length || 1;
  const tabWidth = containerWidth > 0 ? containerWidth / tabCount : 0;

  const indicatorX = useRef(new Animated.Value(0)).current;

  // route.name -> icon 매핑
  const getIconName = (name: string, focused: boolean): keyof typeof Ionicons.glyphMap => {
    switch (name) {
      case "index":
        return focused ? "home" : "home-outline" as any;
      case "favorites/index":
        return focused ? "bookmark" : "bookmark-outline" as any;
      case "hot/index":
        return focused ? "flame" : "flame-outline" as any;
      default:
        return focused ? "ellipse" : "ellipse-outline" as any;
    }
  };

  const activeTint = descriptors[routes[state.index]?.key]?.options?.tabBarActiveTintColor || "#111";
  const inactiveTint = descriptors[routes[state.index]?.key]?.options?.tabBarInactiveTintColor || "#888";

  useEffect(() => {
    if (tabWidth > 0) {
      const currentKey = routes[state.index]?.key;
      const activeVisibleIndex = Math.max(
        0,
        visibleRoutes.findIndex((r: any) => r.key === currentKey)
      );
      Animated.timing(indicatorX, {
        toValue: tabWidth * activeVisibleIndex,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [state.index, tabWidth, routes, visibleRoutes]);

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: "#eaeaea",
      }}
    >
      {/* 슬라이딩 인디케이터 (아래 작은 바) */}
      {tabWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 4,
            left: 0,
            width: tabWidth,
            transform: [{ translateX: indicatorX }],
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: Math.max(16, tabWidth * 0.35),
              height: 3,
              borderRadius: 1.5,
              backgroundColor: activeTint || "#007AFF",
            }}
          />
        </Animated.View>
      )}

      {visibleRoutes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const focused = routes[state.index]?.key === route.key;
        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{
              width: tabWidth || undefined,
              flex: tabWidth ? undefined : 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 6,
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
          >
            <Ionicons
              name={getIconName(route.name, focused)}
              size={24}
              color={focused ? activeTint : inactiveTint}
            />
            {options.title ? (
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 10,
                  fontWeight: focused ? "700" : "500",
                  color: focused ? activeTint : inactiveTint,
                }}
                numberOfLines={1}
              >
                {options.title}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}


