import React, { useCallback, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList, RefreshControl, View, Button } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import EventCard from "../../src/components/EventCard";
import Loading from "../../src/components/Loading";
import ErrorState from "../../src/components/ErrorState";
import EmptyState from "../../src/components/EmptyState";
import { fetchEvents } from "../../src/api/events";
import { Event } from "../../src/types";
import { useRouter } from "expo-router";

export default function EventsScreen() {
  const router = useRouter();
  const [filters, setFilters] = useState<{ tags?: string[]; orgId?: string; startDate?: string; endDate?: string }>({});

  const query = useInfiniteQuery({
    queryKey: ["events", filters],
    queryFn: ({ pageParam }) => fetchEvents({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined,
    getNextPageParam: (last: any) => last?.nextCursor ?? undefined,
  });
  const data = useMemo(() => (query.data?.pages ?? []).flatMap((p: any) => p.data) as Event[], [query.data]);

  const openFilters = () => router.push({ pathname: "/(modals)/filters", params: { current: JSON.stringify(filters) } });

  const onRefresh = useCallback(() => query.refetch(), [query]);
  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  }, [query.hasNextPage, query.isFetchingNextPage]);

  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState message={(query.error as Error)?.message} onRetry={() => query.refetch()} />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Button title="필터" onPress={openFilters} />
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => router.push({ pathname: "/events/[id]", params: { id: item.id } })} />
        )}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={onRefresh} />}        
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={<EmptyState title="행사가 없습니다" />}
      />
    </SafeAreaView>
  );
}


