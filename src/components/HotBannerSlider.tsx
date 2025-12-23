import React, { useEffect, useState, useRef } from "react";
import { View, Text, Image, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, StyleSheet, useColorScheme, Platform, Linking } from "react-native";
import { fetchRecentHotTopWithinDays } from "../services/hot";
import { maybeProxyForWeb } from "../utils/imageProxy";
import type { Event } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = SCREEN_WIDTH;
const ITEM_HEIGHT = Platform.OS === "web" 
  ? Math.round(SCREEN_WIDTH * 0.25) 
  : Math.round(SCREEN_WIDTH * 0.6);

export default function HotBannerSlider() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);

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

  useEffect(() => {
    if (!items.length || items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % items.length;
        scrollRef.current?.scrollTo({ x: next * ITEM_WIDTH, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (loading) {
    return (
      <View style={[styles.container, { height: ITEM_HEIGHT, backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? "#6366F1" : "#4F46E5"} />
        </View>
      </View>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <View style={[styles.container, { height: ITEM_HEIGHT, backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / ITEM_WIDTH);
          setIndex(i);
        }}
        scrollEventThrottle={16}
      >
        {items.map((ev) => (
          <TouchableOpacity 
            key={ev.id} 
            activeOpacity={0.9} 
            onPress={() => handlePress(ev)}
            style={styles.slideContainer}
          >
            <Image
              source={{ uri: maybeProxyForWeb(ev.posterImageUrl as string) as string }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.overlay}>
              <Text 
                style={[styles.title, { color: "#FFFFFF" }]} 
                numberOfLines={2}
              >
                {ev.title || "인기 소식"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {items.length > 1 && (
        <View style={styles.indicatorContainer}>
          {items.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.indicator,
                { 
                  backgroundColor: i === index ? "#FFFFFF" : "rgba(255,255,255,0.5)",
                  width: i === index ? 24 : 6,
                }
              ]} 
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 16,
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  slideContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: Platform.OS === "web" ? 24 : 18,
    fontWeight: "800",
    lineHeight: Platform.OS === "web" ? 32 : 24,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  indicatorContainer: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  indicator: {
    height: 6,
    borderRadius: 3,
  },
});

