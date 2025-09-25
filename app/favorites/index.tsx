import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getFavorites, addFavorite, removeFavorite } from "../../src/api/favorites";
import { FavoriteItem } from "../../src/api/favorites";

export default function FavoritesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  
  // 즐겨찾기 쿼리
  const favoritesQuery = useInfiniteQuery({
    queryKey: ["favorites"],
    queryFn: ({ pageParam }) => getFavorites({ cursor: pageParam as string | undefined }),
    getNextPageParam: (last: any) => last?.nextCursor ?? undefined,
    initialPageParam: undefined,
  });

  const favorites = (favoritesQuery.data?.pages ?? [])
    .flatMap((page: any) => page.data) as FavoriteItem[];

  const handleSearch = () => {
    // TODO: 즐겨찾기 내 검색 기능 구현
    console.log("즐겨찾기 검색:", searchQuery);
  };

  const handleItemPress = (item: FavoriteItem) => {
    if (item.type === "event") {
      router.push({ pathname: "/events/[id]", params: { id: item.itemId } });
    } else if (item.type === "organization") {
      router.push({ pathname: "/orgs/[orgId]", params: { orgId: item.itemId } });
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      await removeFavorite(favoriteId);
      favoritesQuery.refetch();
    } catch (error) {
      console.error("즐겨찾기 제거 실패:", error);
    }
  };

  const onRefresh = () => {
    favoritesQuery.refetch();
  };

  const renderFavoriteItem = ({ item }: { item: FavoriteItem }) => (
    <View style={styles.favoriteItem}>
      <Pressable 
        style={styles.itemContent}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.itemIcon}>
          <Ionicons 
            name={item.type === "event" ? "calendar-outline" : 
                  item.type === "organization" ? "business-outline" : 
                  "search-outline"} 
            size={20} 
            color="#666" 
          />
        </View>
        <View style={styles.itemText}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#ccc" />
      </Pressable>
      <Pressable 
        style={styles.deleteButton}
        onPress={() => handleRemoveFavorite(item.id)}
      >
        <Ionicons name="trash-outline" size={16} color="#ff4444" />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 검색 헤더 */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* 즐겨찾기 목록 */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>즐겨찾기</Text>
        
        {favoritesQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>즐겨찾기 로딩 중...</Text>
          </View>
        ) : favorites.length > 0 ? (
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            renderItem={renderFavoriteItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={favoritesQuery.isRefetching} onRefresh={onRefresh} />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>즐겨찾기가 없습니다</Text>
            <Text style={styles.emptyText}>관심 있는 이벤트나 조직을 즐겨찾기에 추가해보세요</Text>
          </View>
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
  header: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  favoriteItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
    color: "#999",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
});
