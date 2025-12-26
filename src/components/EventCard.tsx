import React from "react";
import { View, Text, useColorScheme, TouchableOpacity, Linking, Image, StyleSheet, Platform, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isFavorite, subscribe, toggleFavorite } from "../services/favorites";
import { incrementHotClick } from "../services/hot";
import { cleanCrawledText } from "../utils/textCleaner";
import { Event } from "../types";
import { maybeProxyForWeb } from "../utils/imageProxy";

type Props = {
  event: Event;
  onPress?: () => void;
};

export const EventCard = ({ event, onPress }: Props) => {
  const scheme = useColorScheme();
  const [fav, setFav] = React.useState<boolean>(isFavorite(event.id));
  const [hotClickCount, setHotClickCount] = React.useState<number | null>(event.hotClickCount ?? null);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const bgColorAnim = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    setFav(isFavorite(event.id));
    const unsub = subscribe(() => setFav(isFavorite(event.id)));
    return unsub;
  }, [event.id]);
  
  React.useEffect(() => {
    if (event.hotClickCount !== undefined) {
      setHotClickCount(event.hotClickCount);
    }
  }, [event.hotClickCount]);
  
  const openSource = async () => {
    const urlRaw = event.sourceUrl;
    if (!urlRaw) return;
    try {
      const url = encodeURI(urlRaw);
      const can = await Linking.canOpenURL(url);
      if (!can) {
        console.warn("[UI] cannot open url", url);
        return;
      }
      setHotClickCount((prev) => (prev ?? 0) + 1);
      try {
        await incrementHotClick({ key: event.id, title: String(event.title || ""), sourceUrl: event.sourceUrl || null, posterImageUrl: event.posterImageUrl || null });
      } catch (hotError) {
        console.warn("[UI] incrementHotClick error (non-blocking)", hotError);
      }
      await Linking.openURL(url);
    } catch (e) {
      console.warn("[UI] openURL error", e);
    }
  };

  const displayTitle = typeof event.title === "string" ? cleanCrawledText(event.title, { maxLength: 80 }) : event.title;
  const displaySummary = (() => {
    const fromSummary = typeof event.summary === "string" ? event.summary : null;
    const fromAi = event.ai && typeof event.ai.summary === "string" ? event.ai.summary : null;
    const text = fromSummary || fromAi;
    return text ? cleanCrawledText(text, { maxLength: 300 }) : null;
  })();

  const hasAISummary = !!(event.ai?.summary);
  const imageUrl = event.posterImageUrl ? maybeProxyForWeb(event.posterImageUrl) : null;
  const dateStr = event.startAt ? new Date(event.startAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "";
  
  const orgName = event.org?.name || "";
  const univTag = orgName.includes("전북") ? "전북대" : 
                  orgName.includes("군산") ? "군산대" : 
                  orgName.includes("원광") ? "원광대" : null;
  
  const hasHotTag = event.tags?.some(t => t.toLowerCase().includes("hot") || t.includes("HOT")) || (hotClickCount && hotClickCount > 10);
  const otherTags = event.tags?.filter(t => !t.toLowerCase().includes("hot")) || [];

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(bgColorAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(bgColorAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const backgroundColor = bgColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      scheme === "dark" ? "#1E293B" : "#fff",
      scheme === "dark" ? "#334155" : "#F3F4F6",
    ],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          backgroundColor: backgroundColor,
          borderColor: scheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
        },
      ]}
    >
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.touchableContent}
      >
      {hasAISummary && (
        <View style={[styles.aiBackgroundEffect, { backgroundColor: scheme === "dark" ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.05)" }]} />
      )}

      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image 
            source={{ uri: imageUrl as string }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: scheme === "dark" ? "#334155" : "#E2E8F0" }]}>
            <Text style={[styles.imagePlaceholderText, { color: scheme === "dark" ? "#64748B" : "#94A3B8" }]}>No Image</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.tagsRow}>
          {univTag && (
            <View style={[
              styles.univTag,
              {
                backgroundColor: univTag === "전북대" ? "#DBEAFE" : 
                                 univTag === "군산대" ? "#FEF3C7" : "#D1FAE5",
              }
            ]}>
              <Text style={[
                styles.univTagText,
                {
                  color: univTag === "전북대" ? "#1E40AF" : 
                         univTag === "군산대" ? "#854D0E" : "#166534",
                }
              ]}>
                {univTag}
              </Text>
            </View>
          )}
          {hasHotTag && (
            <View style={[styles.tag, { backgroundColor: scheme === "dark" ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2" }]}>
              <Text style={[styles.tagText, { color: scheme === "dark" ? "#FCA5A5" : "#DC2626" }]}>HOT</Text>
            </View>
          )}
          {otherTags.slice(0, 1).map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: scheme === "dark" ? "#334155" : "#F1F5F9" }]}>
              <Text style={[styles.tagText, { color: scheme === "dark" ? "#CBD5E1" : "#475569" }]}>{tag}</Text>
            </View>
          ))}
          {hasAISummary && (
            <View style={[styles.aiTag, { backgroundColor: scheme === "dark" ? "rgba(139, 92, 246, 0.2)" : "#EDE9FE" }]}>
              <Ionicons name="sparkles" size={10} color={scheme === "dark" ? "#A78BFA" : "#7C3AED"} />
              <Text style={[styles.aiTagText, { color: scheme === "dark" ? "#A78BFA" : "#7C3AED" }]}>Gemini 요약</Text>
            </View>
          )}
          <View style={styles.rightActions}>
            {dateStr && (
              <Text style={[styles.date, { color: scheme === "dark" ? "#94A3B8" : "#9CA3AF" }]}>{dateStr}</Text>
            )}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                toggleFavorite(event.id);
              }}
              style={styles.favoriteButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={fav ? "heart" : "heart-outline"}
                size={18}
                color={fav ? "#EF4444" : (scheme === "dark" ? "#94A3B8" : "#9CA3AF")}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.title, { color: scheme === "dark" ? "#F1F5F9" : "#111827" }]} numberOfLines={1}>
          {displayTitle}
        </Text>

        {displaySummary && (
          <Text style={[styles.summary, { color: scheme === "dark" ? "#94A3B8" : "#4B5563" }]} numberOfLines={2}>
            {displaySummary}
          </Text>
        )}

        {event.sourceUrl && (
          <TouchableOpacity 
            onPress={openSource}
            style={styles.readMoreButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.readMoreText, { color: scheme === "dark" ? "#94A3B8" : "#6B7280" }]}>
              원문 보기
            </Text>
            <Ionicons name="open-outline" size={12} color={scheme === "dark" ? "#94A3B8" : "#6B7280"} />
          </TouchableOpacity>
        )}
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    marginHorizontal: 0,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: "relative",
    overflow: "hidden",
  },
  touchableContent: {
    flex: 1,
    flexDirection: "row",
  },
  aiBackgroundEffect: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 96,
    height: 96,
  },
  imageContainer: {
    width: 120,
    height: 96,
    borderRadius: 10,
    overflow: "hidden",
    flexShrink: 0,
    marginRight: 16,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    position: "relative",
    zIndex: 10,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  univTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  univTagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.2)",
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
  date: {
    fontSize: 12,
  },
  favoriteButton: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 6,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  readMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },
});

export default EventCard;
