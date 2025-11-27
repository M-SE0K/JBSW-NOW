import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";

// 구글 로그인 전용이므로 별도 회원가입 화면은 불필요.
// 로그인 화면으로 리다이렉트 처리.
export default function SignupScreen() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/auth/login");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
