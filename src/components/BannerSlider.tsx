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
};

export const BannerSlider = ({ limit = 10, onPressItem }: Props) => {
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log("[UI] BannerSlider:fetch start", { limit });
        const notices = await fetchRecentNoticeBanners(limit);
        const onlyNotices = notices.filter(d => !!d.posterImageUrl);
        console.log("[UI] BannerSlider:fetch done (notices only)", { notices: notices.length, used: onlyNotices.length });
        console.log("[UI] BannerSlider:items preview", onlyNotices.slice(0, 5).map((m) => ({ id: m.id, posterImageUrl: m.posterImageUrl })));
        if (mounted) setItems(onlyNotices.slice(0, limit));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; console.log("[UI] BannerSlider:unmount"); };
  }, [limit]);

  useEffect(() => {
    if (!items.length) return;
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % items.length;
        if (next !== prev) {
          console.log("[UI] BannerSlider:auto-advance", { from: prev, to: next, total: items.length });
        }
        scrollRef.current?.scrollTo({ x: next * ITEM_WIDTH, animated: true });
        return next;
      });
    }, 4000);
    return () => { clearInterval(timer); console.log("[UI] BannerSlider:auto-advance:stopped"); };
  }, [items.length]);

  if (loading) {
    return (
      <View style={{ height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!items.length) {
    console.log("[UI] BannerSlider:empty");
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
          if (i !== index) {
            console.log("[UI] BannerSlider:scroll", { from: index, to: i });
          }
          setIndex(i);
        }}
        scrollEventThrottle={16}
      >
        {items.map((ev) => (
          <TouchableOpacity key={ev.id} activeOpacity={0.9} onPress={() => { console.log("[UI] BannerSlider:press", { id: ev.id, url: ev.posterImageUrl, sourceUrl: ev.sourceUrl }); onPressItem?.(ev); }}>
            <Image
              source={{ uri: maybeProxyForWeb(ev.posterImageUrl as string) as string }}
              style={{ width: ITEM_WIDTH, height: ITEM_HEIGHT, resizeMode: "cover" }}
              onLoad={() => console.log("[UI] BannerSlider:image load", { id: ev.id })}
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


