import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchOrgs } from "../../src/api/orgs";
import Loading from "../../src/components/Loading";
import ErrorState from "../../src/components/ErrorState";
import EmptyState from "../../src/components/EmptyState";
import OrgCard from "../../src/components/OrgCard";
import { useRouter } from "expo-router";

export default function OrgsScreen() {
  const router = useRouter();
  const query = useQuery({ queryKey: ["orgs"], queryFn: fetchOrgs });
  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState message={(query.error as Error)?.message} onRetry={() => query.refetch()} />;
  const data = query.data ?? [];
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrgCard org={item} onPress={() => router.push({ pathname: "/orgs/[orgId]", params: { orgId: item.id } })} />
        )}
        ListEmptyComponent={<EmptyState title="기관이 없습니다" />}
      />
    </SafeAreaView>
  );
}


