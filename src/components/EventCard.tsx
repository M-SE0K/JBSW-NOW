import React from "react";
import { View, Text, useColorScheme, TouchableOpacity, Linking } from "react-native";
import { isFavorite, toggleFavorite, subscribe, ensureUserId } from "../services/favorites";
import { incrementHotClick } from "../services/hot";
import { cleanCrawledText } from "../utils/textCleaner";
import { Event } from "../types";
import { formatDateTime } from "../utils/date";

type Props = {
  event: Event;
  onPress?: () => void;
};

export const EventCard = ({ event, onPress }: Props) => {
  const scheme = useColorScheme();
  const [fav, setFav] = React.useState<boolean>(isFavorite(event.id));
  const [hotClickCount, setHotClickCount] = React.useState<number | null>(event.hotClickCount ?? null);
  
  React.useEffect(() => {
    ensureUserId();
    setFav(isFavorite(event.id));
    const unsub = subscribe(() => setFav(isFavorite(event.id)));
    return unsub;
  }, [event.id]);
  
  // event.hotClickCount가 변경되면 로컬 상태도 업데이트
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
      // 조회수 즉시 업데이트 (낙관적 업데이트 - 권한 오류와 관계없이 UI에 표시)
      setHotClickCount((prev) => (prev ?? 0) + 1);
      
      // 인기글 카운트 증가 (실패해도 URL 열기는 계속 진행)
      try {
        await incrementHotClick({ key: event.id, title: String(event.title || ""), sourceUrl: event.sourceUrl || null, posterImageUrl: event.posterImageUrl || null });
      } catch (hotError) {
        console.warn("[UI] incrementHotClick error (non-blocking)", hotError);
        // 권한 오류가 발생해도 UI에는 이미 조회수가 표시됨
      }
      await Linking.openURL(url);
    } catch (e) {
      console.warn("[UI] openURL error", e);
    }
  };
  // 타이틀 가공: JSON 규칙으로 생성된 제목이 없을 경우, 간단 정제
  const displayTitle = typeof event.title === "string" ? cleanCrawledText(event.title, { maxLength: 80 }) : event.title;
  const displaySummary = (() => {
    const fromSummary = typeof event.summary === "string" ? event.summary : null;
    const fromAi = event.ai && typeof event.ai.summary === "string" ? event.ai.summary : null;
    const text = fromSummary || fromAi;
    return text ? cleanCrawledText(text, { maxLength: 300 }) : null;
  })();

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{
      backgroundColor: scheme === "dark" ? "#1c1c1c" : "#fff",
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 8,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: scheme === "dark" ? "#fff" : "#111" }}>{displayTitle}</Text>
      {displaySummary ? (
        <Text numberOfLines={3} style={{ marginTop: 8, color: scheme === "dark" ? "#ddd" : "#444" }}>{displaySummary}</Text>
      ) : null}

      <View style={{ marginTop: 10 }}>
        <Text style={{ color: scheme === "dark" ? "#bbb" : "#666" }}>
          {formatDateTime(event.startAt)}{event.endAt ? ` ~ ${formatDateTime(event.endAt)}` : ""}
        </Text>
        {event.location ? (
          <Text style={{ color: scheme === "dark" ? "#bbb" : "#666", marginTop: 2 }}>{event.location}</Text>
        ) : null}
      </View>

      {!!event.tags?.length && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
          {event.tags!.map((t) => (
            <View key={t} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: scheme === "dark" ? "#2a2a2a" : "#f1f1f1", borderRadius: 999, marginRight: 6, marginBottom: 6 }}>
              <Text style={{ fontSize: 12, color: scheme === "dark" ? "#ddd" : "#333" }}>#{t}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, flexWrap: "wrap" }}>
          <Text style={{ color: scheme === "dark" ? "#aaa" : "#666", fontSize: 13 }}>{event.org?.name}</Text>
          {hotClickCount != null && hotClickCount > 0 ? (
            <View style={{ 
              marginLeft: 10, 
              flexDirection: "row", 
              alignItems: "center",
              backgroundColor: scheme === "dark" ? "rgba(255, 107, 107, 0.15)" : "rgba(255, 107, 107, 0.1)",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 13, marginRight: 4 }}>🔥</Text>
              <Text style={{ 
                fontSize: 12, 
                color: scheme === "dark" ? "#ff6b6b" : "#e63946", 
                fontWeight: "700",
                letterSpacing: 0.3,
              }}>
                {hotClickCount.toLocaleString()}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {event.sourceUrl ? (
            <TouchableOpacity onPress={openSource} style={{ marginRight: 14 }}>
              <Text style={{ color: "#2f80ed", fontWeight: "600", fontSize: 13 }}>원문 보기</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={async () => { console.log("[FAV] press toggle", { id: event.id }); await toggleFavorite(event.id); }}>
            <Text style={{ color: fav ? "#e11d48" : (scheme === "dark" ? "#aaa" : "#666"), fontWeight: "700", fontSize: 18 }}>
              {fav ? "♥" : "♡"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default EventCard;


