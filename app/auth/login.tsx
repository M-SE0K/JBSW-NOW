import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
  useColorScheme,
  Image,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential } from "firebase/auth";
import { auth } from "../../src/db/firebase";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

// iOS에서 AuthSession 완료 처리
WebBrowser.maybeCompleteAuthSession();

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [loading, setLoading] = useState(false);

  // Development Build에서는 iOS Client ID 사용
  // Expo Go에서는 Web Client ID + 프록시 URI 사용
  const isExpoGo = !__DEV__ || Platform.OS === 'web' ? false : 
    (global as any).expo?.modules?.ExpoGo !== undefined;
  
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
      getRedirectResult(auth).then((result) => {
        if (result?.user) {
          handleAuthSuccess(result.user);
        }
      }).catch((error) => {
        console.error("[AUTH] Redirect result error:", error);
      });
    }
  }, []);

  // ID Token으로 Firebase 로그인 (iOS용)
  const handleIdTokenLogin = async (idToken: string) => {
    try {
      // Firebase에 Google credential로 로그인
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      
      // 이메일 도메인 체크
      const email = result.user.email;
      if (!email || !email.endsWith("@jbnu.ac.kr")) {
        await auth.signOut();
        showAlert("로그인 실패", "전북대학교(@jbnu.ac.kr) 계정으로만 로그인할 수 있습니다.");
        setLoading(false);
        return;
      }
      
      console.log("[AUTH] Firebase login success:", email);
      router.replace("/settings");
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
      await auth.signOut();
      showAlert("로그인 실패", "전북대학교(@jbnu.ac.kr) 계정으로만 로그인할 수 있습니다.");
      return;
    }
    
    console.log("[AUTH] Login success:", email);
    router.replace("/settings");
  };

  const handleGoogleSignIn = async () => {
    console.log("[AUTH] Button clicked, Platform:", Platform.OS);
    setLoading(true);
    
    try {
      if (Platform.OS === 'web') {
        // 웹: Firebase signInWithPopup 사용
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        try {
          const result = await signInWithPopup(auth, provider);
          await handleAuthSuccess(result.user);
        } catch (popupError: any) {
          if (popupError.code === 'auth/popup-blocked') {
            await signInWithRedirect(auth, provider);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={isDark ? "#fff" : "#000"} />
        </Pressable>
        <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>로그인</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={require("../img/jbsw_now_logo.png")} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.subtitle, { color: isDark ? "#ccc" : "#666" }]}>
            전북대학교 SW 정보 통합 플랫폼
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <Ionicons name="school-outline" size={48} color={isDark ? "#fff" : "#333"} style={{ marginBottom: 16 }} />
          <Text style={[styles.infoText, { color: isDark ? "#fff" : "#333" }]}>
            재학생 인증을 위해{"\n"}학교 구글 계정으로 로그인해주세요.
          </Text>
          <Text style={[styles.domainText, { color: "#007AFF" }]}>
            @jbnu.ac.kr
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            { opacity: pressed || loading ? 0.7 : 1 },
          ]}
          onPress={handleGoogleSignIn}
          disabled={loading || (Platform.OS !== 'web' && !request)}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.googleButtonText}>Google 계정으로 계속하기</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    paddingBottom: 60,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  infoContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  infoText: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "600",
  },
  domainText: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  googleButton: {
    height: 56,
    backgroundColor: "#fff",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
});
