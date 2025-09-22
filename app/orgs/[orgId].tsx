import React, { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList, RefreshControl } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import EventCard from "../../src/components/EventCard";
import Loading from "../../src/components/Loading";
import ErrorState from "../../src/components/ErrorState";
import EmptyState from "../../src/components/EmptyState";
import { fetchEvents } from "../../src/api/events";
import { Event } from "../../src/types";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function OrgDetailScreen() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const router = useRouter();
  const query = useInfiniteQuery({
    queryKey: ["org-events", orgId],
    queryFn: ({ pageParam }) => fetchEvents({ orgId: orgId!, cursor: pageParam }),
    getNextPageParam: (last) => last?.nextCursor ?? undefined,
  });
  const data = (query.data?.pages ?? []).flatMap((p) => p.data) as Event[];

  const onRefresh = useCallback(() => query.refetch(), [query]);
  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  }, [query.hasNextPage, query.isFetchingNextPage]);

  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState message={(query.error as Error)?.message} onRetry={() => query.refetch()} />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => router.push({ pathname: "/events/[id]", params: { id: item.id } })} />
        )}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={<EmptyState title="이 기관의 행사가 없습니다" />}
      />
    </SafeAreaView>
  );
}


