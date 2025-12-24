import React, { useEffect, useState, useRef } from "react";
import { View, Text, Image, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, StyleSheet, useColorScheme, Platform, Linking } from "react-native";
import { fetchRecentHotTopWithinDays } from "../services/hot";
import { maybeProxyForWeb } from "../utils/imageProxy";
import { cleanCrawledText } from "../utils/textCleaner";
import type { Event } from "../types";

export default function HotBannerSlider() {
  const isDark = useColorScheme() === "dark";
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  const [containerWidth, setContainerWidth] = useState(0);
  const isFullScreen = Platform.OS === "web" && dimensions.width >= 1400;

  // 화면 크기 변경 감지
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const handlePress = async (ev: Event) => {
    const urlRaw = ev.sourceUrl;
    if (!urlRaw) {
      console.warn("[HotBannerSlider] no sourceUrl for event", ev.id);
      return;
    }
    try {
      const url = encodeURI(urlRaw);
      const can = await Linking.canOpenURL(url);
      if (!can) {
        console.warn("[HotBannerSlider] cannot open url", url);
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      console.warn("[HotBannerSlider] openURL error", e);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 인기 소식 5개 가져오기 (이미지와 sourceUrl이 있는 것만)
        const hotEvents = await fetchRecentHotTopWithinDays(30, 10);
        const withImagesAndUrl = hotEvents.filter(ev => !!ev.posterImageUrl && !!ev.sourceUrl).slice(0, 5);
        
        if (mounted) {
          setItems(withImagesAndUrl);
        }
      } catch (error) {
        console.warn("[HotBannerSlider] fetch error", error);
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 웹에서 전체화면일 때 1400px로 고정, 작은 화면에서는 반응형
  const finalItemWidth = isFullScreen
    ? 1400 
    : (containerWidth > 0 ? containerWidth : dimensions.width);
  const finalItemHeight = Platform.OS === "web" 
    ? Math.round(finalItemWidth * (isFullScreen ? 0.25 : 0.35)) 
    : Math.round(dimensions.width * 0.6);
  const finalStyles = createStyles(finalItemWidth, finalItemHeight);
  
  useEffect(() => {
    if (!items.length || items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % items.length;
        scrollRef.current?.scrollTo({ x: next * finalItemWidth, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length, finalItemWidth]);

  if (loading) {
    return (
      <View style={[finalStyles.container, { height: finalItemHeight, backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
        <View style={finalStyles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? "#6366F1" : "#4F46E5"} />
        </View>
      </View>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <View 
      style={[finalStyles.container, { height: finalItemHeight, backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        if (width > 0) {
          // 웹에서 전체화면일 때는 1400px로 고정, 작은 화면에서는 실제 너비 사용
          const targetWidth = isFullScreen ? 1400 : width;
          if (Math.abs(targetWidth - containerWidth) > 1) {
            setContainerWidth(targetWidth);
          }
        }
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / finalItemWidth);
          setIndex(i);
        }}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={finalItemWidth}
        snapToAlignment="start"
        contentContainerStyle={{ 
          width: finalItemWidth * items.length,
          flexDirection: 'row',
        }}
      >
        {items.map((ev) => (
            <TouchableOpacity 
            key={ev.id} 
            activeOpacity={0.95} 
            onPress={() => handlePress(ev)}
            style={finalStyles.slideContainer}
          >
            <Image
              source={{ uri: maybeProxyForWeb(ev.posterImageUrl as string) as string }}
              style={finalStyles.image}
            />
            {/* 그라데이션 오버레이 */}
            <View style={finalStyles.gradientOverlay} />
            <View style={finalStyles.overlay}>
              <View style={finalStyles.titleContainer}>
                <Text 
                  style={[finalStyles.title, { color: "#FFFFFF" }]} 
                  numberOfLines={2}
                >
                  {ev.title || "인기 소식"}
                </Text>
                {Platform.OS === "web" && (() => {
                  const displaySummary = (() => {
                    const fromSummary = typeof ev.summary === "string" ? ev.summary : null;
                    const fromAi = ev.ai && typeof ev.ai.summary === "string" ? ev.ai.summary : null;
                    const text = fromSummary || fromAi;
                    return text ? cleanCrawledText(text, { maxLength: 100 }) : null;
                  })();
                  
                  return displaySummary ? (
                    <Text 
                      style={finalStyles.summary}
                      numberOfLines={1}
                    >
                      {displaySummary}
                    </Text>
                  ) : null;
                })()}
                {Platform.OS === "web" && (
                  <View style={finalStyles.readMoreBadge}>
                    <Text style={finalStyles.readMoreText}>자세히 보기 →</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {items.length > 1 && (
        <View style={finalStyles.indicatorContainer}>
          {items.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                scrollRef.current?.scrollTo({ x: i * finalItemWidth, animated: true });
                setIndex(i);
              }}
              style={finalStyles.indicatorWrapper}
            >
              <View 
                style={[
                  finalStyles.indicator,
                  { 
                    backgroundColor: i === index ? "#FFFFFF" : "rgba(255,255,255,0.4)",
                    width: i === index ? 32 : 8,
                    opacity: i === index ? 1 : 0.6,
                  }
                ]} 
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (itemWidth: number, itemHeight: number) => StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 16,
    width: "100%",
    ...(Platform.OS === "web" && {
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
    }),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  slideContainer: {
    width: itemWidth,
    height: itemHeight,
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Platform.OS === "web" ? 32 : 20,
    paddingVertical: Platform.OS === "web" ? 32 : 24,
    paddingBottom: Platform.OS === "web" ? 40 : 32,
  },
  titleContainer: {
    gap: 12,
  },
  title: {
    fontSize: Platform.OS === "web" ? 28 : 20,
    fontWeight: "800",
    lineHeight: Platform.OS === "web" ? 36 : 26,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: Platform.OS === "web" ? -0.5 : 0,
    marginBottom: Platform.OS === "web" ? 8 : 0,
  },
  summary: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    lineHeight: 20,
    marginBottom: 12,
  },
  readMoreBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    ...(Platform.OS === "web" && {
      backdropFilter: "blur(10px)",
    }),
  },
  readMoreText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  indicatorContainer: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 16 : 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  indicatorWrapper: {
    padding: 4,
  },
  indicator: {
    height: 6,
    borderRadius: 3,
    transition: "all 0.3s ease",
  },
});

