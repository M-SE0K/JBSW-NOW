/**
 * Blob → base64 변환 유틸. DataURL 접두사를 제거한 순수 base64 문자열을 반환합니다.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 주어진 이미지 URI를 Gemini API의 `inline_data` 포맷으로 변환합니다.
 * - http(s): fetch → Blob → base64 → { mime_type, data }
 * - file://, asset: 환경에 따라 fetch 동작. 필요 시 Expo FileSystem 대체 고려
 */
export async function toInlineData(uri: string): Promise<{ mime_type: string; data: string }> {
  // HTTP(S) 원격 이미지면 fetch → base64 변환 (웹에서는 CORS 차단 시 프록시 폴백)
  if (uri.startsWith("http")) {
    try {
      const r = await fetch(uri);
      if (!r.ok) throw new Error(`Failed to fetch image: ${r.status}`);
      const blob = await r.blob();
      const base64 = await blobToBase64(blob);
      const mime = (blob as any).type || "image/png";
      return { mime_type: mime, data: base64 };
    } catch (err) {
      // 웹 환경 CORS 차단 시 프록시 경유 재시도
      const proxied = buildProxyUrl(uri);
      if (!proxied) throw err;
      const r2 = await fetch(proxied);
      if (!r2.ok) throw new Error(`Failed to fetch image via proxy: ${r2.status}`);
      const blob2 = await r2.blob();
      const base642 = await blobToBase64(blob2);
      const mime2 = (blob2 as any).type || "image/png";
      return { mime_type: mime2, data: base642 };
    }
  }
  // file:// 또는 asset 등은 React Native FS/Expo FileSystem 사용 권장
  // 여기서는 간단히 fetch 시도(환경에 따라 동작이 다를 수 있음)
  const r = await fetch(uri);
  const blob = await r.blob();
  const base64 = await blobToBase64(blob);
  const mime = (blob as any).type || "image/png";
  return { mime_type: mime, data: base64 };
}

/**
 * 환경변수(EXPO_PUBLIC_IMAGE_PROXY 등)를 활용해 프록시 URL을 구성합니다.
 * 우선순위: EXPO_PUBLIC_IMAGE_PROXY → cors.isomorphic-git.org → null
 * - EXPO_PUBLIC_IMAGE_PROXY 예시:
 *   - "https://cors.isomorphic-git.org/"(prefix 방식)
 *   - "https://images.weserv.nl/?url={url}"(템플릿 방식)
 */
function buildProxyUrl(target: string): string | null {
  try {
    const envProxy = (process.env.EXPO_PUBLIC_IMAGE_PROXY || process.env.IMAGE_PROXY || "").trim();
    if (envProxy) {
      if (envProxy.includes("{url}")) return envProxy.replace("{url}", encodeURIComponent(target));
      // prefix 방식
      return envProxy.endsWith("/") ? envProxy + target : envProxy + "/" + target;
    }
  } catch (_) {
    // ignore
  }
  // 기본 폴백 프록시 (prefix 방식)
  const fallback = "https://cors.isomorphic-git.org/";
  return fallback + target;
}


