import React, { useEffect, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import SectionHeader from "../../src/components/SectionHeader";
import EventsList from "../../src/components/EventsList";
import type { Event } from "../../src/types";
import { fetchRecentHotTopWithinDays } from "../../src/services/hot";
import { subscribe as subscribeFavorites, ensureUserId as ensureFavUser } from "../../src/services/favorites";

export default function HotScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [favTick, setFavTick] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const top10 = await fetchRecentHotTopWithinDays(30, 10);
      setEvents(top10);
    } catch (e) {
      //console.error("[HOT] load error", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const top10 = await fetchRecentHotTopWithinDays(30, 10);
      setEvents(top10);
    } catch (e) {
      //console.error("[HOT] refresh error", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    ensureFavUser();
    const unsub = subscribeFavorites(() => setFavTick((v) => v + 1));
    return () => unsub();
  }, []);

  return (
    <SafeAreaView style={styles.container}> 
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>불러오는 중...</Text>
          </View>
        ) : (
          <EventsList
            events={events}
            placeholderColor="#f5f5f5"
            emptyText="최근 30일 내 인기 소식이 없습니다"
            onPressItem={(ev) => {
              console.log("[UI] hot item press", ev.id);
            }}
            style={{ paddingTop: 0 }}
            ListHeaderComponent={<SectionHeader title="실시간 인기 소식" showMore={false} style={{ marginTop: 0 }} />}
            refreshing={refreshing}
            onRefresh={onRefresh}
            extraData={favTick}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    color: "#666",
  },
});

