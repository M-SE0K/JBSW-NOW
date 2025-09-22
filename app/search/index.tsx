import React, { useCallback, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList, RefreshControl, View, TextInput, Button } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import EventCard from "../../src/components/EventCard";
import Loading from "../../src/components/Loading";
import ErrorState from "../../src/components/ErrorState";
import EmptyState from "../../src/components/EmptyState";
import { fetchEvents } from "../../src/api/events";
import { Event } from "../../src/types";
import { useRouter } from "expo-router";

export default function SearchScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["search", submitted],
    queryFn: ({ pageParam }) => fetchEvents({ q: submitted || undefined, cursor: pageParam }),
    getNextPageParam: (last) => last?.nextCursor ?? undefined,
    enabled: !!submitted,
  });
  const data = (query.data?.pages ?? []).flatMap((p) => p.data) as Event[];

  const onSearch = () => setSubmitted(q.trim());
  const onRefresh = useCallback(() => query.refetch(), [query]);
  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  }, [query.hasNextPage, query.isFetchingNextPage]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 16, flexDirection: "row", gap: 8 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="키워드 입력"
          style={{ flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}
          onSubmitEditing={onSearch}
        />
        <Button title="검색" onPress={onSearch} />
      </View>

      {query.isLoading && submitted ? <Loading /> : null}
      {query.isError ? <ErrorState message={(query.error as Error)?.message} onRetry={() => query.refetch()} /> : null}

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => router.push({ pathname: "/events/[id]", params: { id: item.id } })} />
        )}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={submitted ? <EmptyState title="검색 결과가 없습니다" /> : <EmptyState title="검색어를 입력해 주세요" />}
      />
    </SafeAreaView>
  );
}


