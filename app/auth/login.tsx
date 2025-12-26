import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
  useColorScheme,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential, Auth } from "firebase/auth";
import { auth as firebaseAuth } from "../../src/db/firebase";
import { getCurrentUser, subscribeAuth } from "../../src/services/auth";

// 타입 안전성을 위해 auth를 명시적으로 타입 지정
const auth: Auth = firebaseAuth;
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

// iOS에서 AuthSession 완료 처리
WebBrowser.maybeCompleteAuthSession();

const REDIRECT_STORAGE_KEY = "login_redirect_path";

// 플랫폼별 Alert 함수
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [loading, setLoading] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  const isWeb = Platform.OS === "web";
  const isLargeScreen = isWeb && dimensions.width >= 1024;
  const redirectParam = params.redirect ? decodeURIComponent(params.redirect) : "/";
  const [user, setUser] = useState(() => getCurrentUser());

  // iOS/Android용 Google Auth 설정
  // 웹에서는 Firebase signInWithPopup을 직접 사용하므로 이 hook은 사용하지 않음
  // 하지만 React hook 규칙을 위해 항상 호출해야 하므로, 웹일 때는 빈 설정으로 호출
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    Platform.OS === 'web' 
      ? {
          // 웹에서는 사용하지 않지만 hook 규칙을 위해 빈 설정 전달
          clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
          scopes: ['profile', 'email'],
        }
      : {
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: ['profile', 'email'],
        }
  );
  
  if (Platform.OS !== 'web') {
  console.log("[AUTH] iOS Client ID configured for Development Build");
  }

const hasWebStorage =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const getStoredRedirect = () => {
  if (!hasWebStorage) return null;
  try {
    return window.localStorage.getItem(REDIRECT_STORAGE_KEY);
  } catch {
    return null;
  }
};

const setStoredRedirect = (path: string) => {
  if (!hasWebStorage) return;
  try {
    window.localStorage.setItem(REDIRECT_STORAGE_KEY, path);
  } catch {}
};

const clearStoredRedirect = () => {
  if (!hasWebStorage) return;
  try {
    window.localStorage.removeItem(REDIRECT_STORAGE_KEY);
  } catch {}
};

  const resolveRedirectPath = () => {
    // 네이티브(iOS/Android)는 항상 홈으로 리디렉트
    if (Platform.OS !== "web") return "/";

    const stored = isWeb ? getStoredRedirect() : null;
    return redirectParam || stored || "/";
  };

  // 웹에서 리디렉트 파라미터를 로컬스토리지에 저장 (다른 계정 사용 시 URL 파라미터 손실 방지)
  useEffect(() => {
    if (isWeb && hasWebStorage) {
      setStoredRedirect(redirectParam || "/");
    }
  }, [isWeb, redirectParam]);

  // 이미 로그인된 경우 즉시 리다이렉트
  useEffect(() => {
    if (user) {
      const path = resolveRedirectPath();
      clearStoredRedirect();
      router.replace(path as any);
    }
  }, [user]);

  // auth 상태 구독
  useEffect(() => {
    const unsub = subscribeAuth(setUser);
    return () => unsub();
  }, []);

  // iOS: Google 로그인 응답 처리
  useEffect(() => {
    if (response?.type === "success") {
      // useIdTokenAuthRequest는 id_token을 반환
      const { id_token } = response.params;
      console.log("[AUTH] Got id_token, signing in with Firebase...");
      handleIdTokenLogin(id_token);
    } else if (response?.type === "error") {
      console.error("[AUTH] iOS Google error:", response.error);
      setLoading(false);
      showAlert("오류", "Google 로그인 중 문제가 발생했습니다.");
    } else if (response?.type === "dismiss") {
      setLoading(false);
    }
  }, [response]);

  // 웹에서 리디렉트 결과 처리
  useEffect(() => {
    if (Platform.OS === 'web') {
      getRedirectResult(auth as any).then((result) => {
        if (result?.user) {
          handleAuthSuccess(result.user);
        }
      }).catch((error) => {
        console.error("[AUTH] Redirect result error:", error);
      });
    }
  }, []);

  // 화면 크기 변경 감지 (웹용)
  useEffect(() => {
    if (isWeb) {
      const subscription = Dimensions.addEventListener("change", ({ window }) => {
        setDimensions(window);
      });
      return () => subscription?.remove();
    }
  }, [isWeb]);

  // ID Token으로 Firebase 로그인 (iOS용)
  const handleIdTokenLogin = async (idToken: string) => {
    try {
      // Firebase에 Google credential로 로그인
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth as any, credential);
      
      // 이메일 도메인 체크
      const email = result.user.email;
      if (!email || !email.endsWith("@jbnu.ac.kr")) {
        await (auth as any).signOut();
        showAlert("로그인 실패", "전북대학교(@jbnu.ac.kr) 계정으로만 로그인할 수 있습니다.");
        setLoading(false);
        return;
      }
      
      console.log("[AUTH] Firebase login success:", email);
      
      // 리다이렉트 파라미터가 있으면 해당 페이지로, 없으면 메인 페이지로
      const redirectPath = resolveRedirectPath();
      clearStoredRedirect();
      router.replace(redirectPath as any);
    } catch (e: any) {
      console.error("[AUTH] Firebase credential error:", e);
      showAlert("오류", "로그인 처리 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = async (user: any) => {
    // 이메일 도메인 체크
    const email = user.email;
    if (!email || !email.endsWith("@jbnu.ac.kr")) {
      await (auth as any).signOut();
      showAlert("로그인 실패", "전북대학교(@jbnu.ac.kr) 계정으로만 로그인할 수 있습니다.");
      return;
    }
    
    console.log("[AUTH] Login success:", email);
    
    // 리다이렉트 파라미터가 있으면 해당 페이지로, 없으면 메인 페이지로
    const redirectPath = resolveRedirectPath();
    clearStoredRedirect();
    router.replace(redirectPath as any);
  };

  const handleGoogleSignIn = async () => {
    console.log("[AUTH] Button clicked, Platform:", Platform.OS);
    setLoading(true);
    
    try {
      if (Platform.OS === 'web') {
        // 웹: Firebase signInWithPopup 사용
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        setStoredRedirect(redirectParam || "/");
        
        try {
          const result = await signInWithPopup(auth as any, provider);
          await handleAuthSuccess(result.user);
        } catch (popupError: any) {
          if (popupError.code === 'auth/popup-blocked') {
            setStoredRedirect(redirectParam || "/");
            await signInWithRedirect(auth as any, provider);
          } else if (popupError.code === 'auth/popup-closed-by-user') {
            // 사용자가 팝업을 닫음 - 무시
          } else {
            throw popupError;
          }
        }
      } else {
        // iOS/Android: expo-auth-session 사용 (Development Build)
        console.log("[AUTH] Using expo-auth-session with iOS Client ID...");
        if (!request) {
          showAlert("오류", "Google 로그인을 초기화하는 중입니다. 잠시 후 다시 시도해주세요.");
          setLoading(false);
          return;
        }
        await promptAsync();
        // 응답은 useEffect에서 처리됨
        return; // loading은 useEffect에서 처리
      }
    } catch (e: any) {
      console.error("[AUTH] Google sign-in error:", e);
      showAlert("오류", `로그인 중 문제가 발생했습니다: ${e.message}`);
    } finally {
      if (Platform.OS === 'web') {
        setLoading(false);
      }
    }
  };



  // 웹 대형 화면: 좌우 분할 레이아웃
  if (isLargeScreen) {
    return (
      <View style={[styles.webContainer, { backgroundColor: "#F9FAFB" }]}>
        {/* 좌측: 브랜딩 영역 */}
        <View style={[styles.leftPanel, { backgroundColor: "#F8FAFC" }]}>
          {/* Enhanced SVG Background Pattern */}
          <View style={styles.svgBackground}>
            <Svg width="100%" height="100%" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
              <Defs>
                <LinearGradient id="grad_bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={"#6466E9"} stopOpacity="0.08" />
                  <Stop offset="100%" stopColor={"#6466E9"} stopOpacity="0.02" />
                </LinearGradient>
                <LinearGradient id="circle_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={"#6466E9"} stopOpacity="0.15" />
                  <Stop offset="100%" stopColor={"#6466E9"} stopOpacity="0.05" />
                </LinearGradient>
              </Defs>
              
              {/* Full Background Gradient */}
              <Path d="M0 0 L800 0 L800 800 L0 800 Z" fill="url(#grad_bg)" />
              
              {/* Decorative Circles - Artistic Composition */}
              <Circle cx="0" cy="0" r="500" fill="url(#circle_grad)" opacity="0.6" />
              <Circle cx="800" cy="800" r="450" fill="url(#circle_grad)" opacity="0.5" />
              
              {/* Floating Elements */}
              <Circle cx="650" cy="150" r="80" fill={"#6466E9"} fillOpacity="0.04" />
              <Circle cx="100" cy="650" r="120" fill={"#6466E9"} fillOpacity="0.03" />
              <Circle cx="400" cy="400" r="250" fill="none" stroke={"#6466E9"} strokeOpacity="0.05" strokeWidth="1" strokeDasharray="10 10" />
            </Svg>
          </View>
          
          <View style={styles.leftContent}>
            {/* Logo */}
            <View style={styles.leftHeader}>
              <View style={[styles.webLogoBox, { backgroundColor: "#6466E9" }]}>
                <Text style={[styles.webLogoLetter, { color: "#FFFFFF" }]}>J</Text>
              </View>
              <View style={styles.logoTextContainer}>
                <Text style={[styles.logoTextJBSW, { color: "#111827" }]}>JBSW</Text>
                <Text style={[styles.logoTextNOW, { color: "#6466E9", marginLeft: 4 }]}>NOW</Text>
              </View>
            </View>

            {/* Title Section */}
            <View style={styles.leftTitleSection}>
              <Text style={[styles.leftTitle, { color: "#111827" }]}>
                전북권 대학 SW 정보 통합{"\n"}플랫폼,{" "}
                <Text style={{ color: "#6466E9" }}>JBSW NOW</Text>
              </Text>
              <Text style={[styles.leftSubtitle, { color: "#6B7280" }]}>
                전북권 모든 대학의 SW 정보를{"\n"}한눈에 쉽고 빠르게 확인하세요.
              </Text>
            </View>

            {/* Footer List */}
            <View style={styles.universityList}>
              <View style={styles.universityDivider} />
              <Text style={styles.universityText}>
                전북대학교 • 군산대학교 • 원광대학교 • SW중심대학사업단
              </Text>
            </View>
          </View>

        </View>

        {/* 우측: 로그인 폼 */}
        <View style={styles.rightPanel}>
          <ScrollView contentContainerStyle={styles.rightContent} showsVerticalScrollIndicator={false}>
            <View style={styles.rightHeader}>
              {!isWeb && (
                <Pressable 
                  onPress={() => router.back()} 
                  style={styles.webBackButton}
                >
                  <Ionicons name="chevron-back" size={24} color="#374151" />
                </Pressable>
              )}
            </View>

            <View style={styles.webFormContainer}>
              <View style={styles.webFormHeader}>
                <Text style={styles.webFormTitle}>로그인</Text>
                <Text style={styles.webFormSubtitle}>
                  JBSW NOW 계정으로 서비스를 이용해보세요.
                </Text>
              </View>

              <View style={styles.webInfoCard}>
                <View style={styles.webIconWrapper}>
                  <Ionicons name="school" size={28} color={"#6466E9"} />
                </View>
                <Text style={styles.webInfoText}>
                  재학생 인증을 위해{"\n"}학교 구글 계정으로 로그인해주세요
                </Text>
                <View style={styles.webDomainBadge}>
                  <Ionicons name="mail-outline" size={14} color={"#6466E9"} style={{ marginRight: 6 }} />
                  <Text style={[styles.webDomainText, { color: "#6466E9" }]}>@jbnu.ac.kr</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.webGoogleButton,
                  { 
                    opacity: pressed || loading ? 0.9 : 1,
                    backgroundColor: "#6466E9",
                  }
                ]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <View style={styles.webGoogleIconWrapper}>
                      <Text style={styles.webGoogleIcon}>G</Text>
                    </View>
                    <Text style={[styles.webGoogleButtonText, { marginLeft: 12, color: "#FFFFFF" }]}>
                      Google 계정으로 계속하기
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  // 모바일 또는 작은 웹 화면: 기존 레이아웃
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? "#0F172A" : "#F9FAFB" }]}>
      {/* 배경 그라데이션 효과 */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()} 
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.6 : 1 }
          ]}
        >
          <Ionicons name="chevron-back" size={24} color={isDark ? "#E5E7EB" : "#374151"} />
        </Pressable>
        <Text style={[styles.title, { color: isDark ? "#F9FAFB" : "#111827" }]}>로그인</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* 로고 섹션 */}
        <View style={styles.logoSection}>
          <View style={[styles.logoWrapper, { backgroundColor: isDark ? "rgba(79, 70, 229, 0.1)" : "rgba(99, 102, 241, 0.08)" }]}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>J</Text>
            </View>
            <View style={[styles.logoTextContainer, { marginLeft: 12 }]}>
              <Text style={[styles.logoTextJBSW, { color: isDark ? "#F9FAFB" : "#111827" }]}>JBSW</Text>
              <Text style={[styles.logoTextNOW, { color: "#6366F1", marginLeft: 4 }]}>NOW</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: isDark ? "#94A3B8" : "#6B7280" }]}>
            전북대학교 SW 정보 통합 플랫폼
          </Text>
        </View>

        {/* 안내 카드 */}
        <View style={[
          styles.infoCard,
          { 
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            ...(Platform.OS === "web" && {
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            }),
          }
        ]}>
          <View style={[styles.iconWrapper, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.1)" }]}>
            <Ionicons name="school" size={32} color="#6366F1" />
          </View>
          <Text style={[styles.infoText, { color: isDark ? "#F9FAFB" : "#111827" }]}>
            재학생 인증을 위해{"\n"}학교 구글 계정으로 로그인해주세요
          </Text>
          <View style={[styles.domainBadge, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)" }]}>
            <Ionicons name="mail-outline" size={14} color="#6366F1" style={{ marginRight: 4 }} />
            <Text style={[styles.domainText, { color: "#6366F1" }]}>
              @jbnu.ac.kr
            </Text>
          </View>
        </View>

        {/* Google 로그인 버튼 */}
        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            {
              backgroundColor: "#6466E9",
              opacity: pressed || loading ? 0.9 : 1,
            }
          ]}
          onPress={handleGoogleSignIn}
          disabled={loading || (Platform.OS !== 'web' && !request)}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <View style={styles.mobileGoogleIconWrapper}>
                <Text style={styles.mobileGoogleIcon}>G</Text>
              </View>
              <Text style={[styles.googleButtonText, { color: "#FFFFFF", marginLeft: 12 }]}>
                Google 계정으로 계속하기
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 웹 대형 화면 스타일
  webContainer: {
    flex: 1,
    flexDirection: "row",
    ...(Platform.OS === "web" && { minHeight: "100vh" as any }),
  },
  leftPanel: {
    width: "50%",
    position: "relative",
    overflow: "hidden",
  },
  svgBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  leftContent: {
    flex: 1,
    padding: 48,
    paddingTop: 48,
    paddingBottom: 48,
    zIndex: 10,
    position: "relative",
    justifyContent: "flex-start",
  },
  leftHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 48,
  },
  webLogoBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  webLogoLetter: {
    fontSize: 24,
    fontWeight: "800",
  },
  logoTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  logoTextJBSW: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  logoTextNOW: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  leftTitleSection: {
    alignItems: "flex-start",
    marginBottom: "auto" as any,
  },
  leftTitle: {
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 44,
    marginBottom: 24,
    textAlign: "left",
  },
  leftSubtitle: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: "left",
  },
  universityList: {
    marginTop: 32,
    paddingTop: 32,
    alignItems: "flex-start",
  },
  universityDivider: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },
  universityText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "left",
    fontWeight: "500",
  },
  rightPanel: {
    width: "50%",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  rightContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 64,
  },
  rightHeader: {
    marginBottom: 40,
  },
  webBackButton: {
    padding: 8,
    alignSelf: "flex-start",
  },
  webFormContainer: {
    maxWidth: 400,
    width: "100%",
  },
  webFormHeader: {
    marginBottom: 32,
  },
  webFormTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  webFormSubtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  webInfoCard: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    marginBottom: 24,
  },
  webIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(100, 102, 233, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  webInfoText: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  webDomainBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(100, 102, 233, 0.1)",
  },
  webDomainText: {
    fontSize: 15,
    fontWeight: "700",
  },
  webGoogleButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6466E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  webGoogleIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  webGoogleIcon: {
    color: "#4285F4",
    fontSize: 16,
    fontWeight: "800",
  },
  webGoogleButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // 모바일/작은 화면 스타일
  container: {
    flex: 1,
    position: "relative",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    paddingTop: Platform.OS === "web" ? 40 : 20,
    paddingBottom: Platform.OS === "web" ? 40 : 60,
    zIndex: 1,
  },
  logoSection: {
    alignItems: "center",
    marginTop: Platform.OS === "web" ? 20 : 0,
  },
  logoWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  infoCard: {
    alignItems: "center",
    padding: 32,
    borderRadius: 20,
    marginVertical: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  infoText: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "600",
    marginBottom: 16,
  },
  domainBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  domainText: {
    fontSize: 15,
    fontWeight: "700",
  },
  googleButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6466E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  mobileGoogleIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  mobileGoogleIcon: {
    color: "#4285F4",
    fontSize: 16,
    fontWeight: "800",
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
}) as any;
