import React, { useEffect, useState, useRef } from "react";
import { View, Image, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity } from "react-native";
import { fetchRecentNoticeBanners } from "../api/eventsFirestore";
import { maybeProxyForWeb } from "../utils/imageProxy";
import type { Event } from "../types";

const { width } = Dimensions.get("window");
const ITEM_WIDTH = width;
const ITEM_HEIGHT = Math.round(width * 9 / 16);

type Props = {
  limit?: number;
  onPressItem?: (event: Event) => void;
  imageUrls?: string[]; // 하드코딩된 배너 이미지 URL 배열 (제공 시 이 값을 우선 사용)
  imageSourceUrls?: Record<string, string>; // 이미지 URL을 키로 하는 sourceUrl 매핑 (선택사항)
};

export const BannerSlider = ({ limit = 10, onPressItem, imageUrls, imageSourceUrls }: Props) => {
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 1) imageUrls가 제공되면 이를 우선 사용
        if (imageUrls && imageUrls.length > 0) {
          const nowIso = new Date().toISOString();
          const hardcoded: Event[] = imageUrls.map((url, i) => ({
            id: `hardcoded-${i}`,
            title: "",
            startAt: nowIso,
            org: { id: "hardcoded", name: "hardcoded", logoUrl: null },
            sourceUrl: imageSourceUrls?.[url] || null,
            posterImageUrl: url,
          }));
          if (mounted) setItems(hardcoded.slice(0, limit));
          return;
        }

        const notices = await fetchRecentNoticeBanners(limit);
        const onlyNotices = notices.filter(d => !!d.posterImageUrl);
        if (mounted) setItems(onlyNotices.slice(0, limit));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [limit, imageUrls]);

  useEffect(() => {
    if (!items.length) return;
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
      <View style={{ height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!items.length) {
    return <View style={{ height: ITEM_HEIGHT }} />;
  }

  return (
    <View style={{ width: ITEM_WIDTH, height: ITEM_HEIGHT }}>
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
          <TouchableOpacity key={ev.id} activeOpacity={0.9} onPress={() => onPressItem?.(ev)}>
            <Image
              source={{ uri: maybeProxyForWeb(ev.posterImageUrl as string) as string }}
              style={{ width: ITEM_WIDTH, height: ITEM_HEIGHT, resizeMode: "cover" }}
              onError={(err) => console.warn("[UI] BannerSlider:image error", { id: ev.id, error: err?.nativeEvent || err })}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={{ position: "absolute", bottom: 8, width: "100%", flexDirection: "row", justifyContent: "center" }}>
        {items.map((_, i) => (
          <View key={i} style={{ width: 6, height: 6, borderRadius: 3, marginHorizontal: 3, backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.5)" }} />
        ))}
      </View>
    </View>
  );
};

export default BannerSlider;


