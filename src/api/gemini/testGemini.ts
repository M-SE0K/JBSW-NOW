import { Asset } from "expo-asset";
import { analyzePosterImage } from "./gemini";
import type { GeminiAnalysisResult } from "../../types";

/**
 * 테스트 전용: 번들된 데모 이미지(`app/img/poster1.png`)를 불러와 즉시 분석합니다.
 *
 * 사용처:
 * - `app/test/local-image.tsx`의 버튼 액션에서 테스트용으로 직접 호출
 *
 * 실제 기능 구현 코드는 `analyzePosterImage`(./gemini)이며,
 * 이 함수는 테스트 편의를 위해 번들 에셋을 URI로 변환하여 위 함수를 호출합니다.
 */
export async function analyzePosterImageFromBundledAsset(): Promise<GeminiAnalysisResult> {
  const moduleAsset = Asset.fromModule(require("../../../app/img/poster1.png"));
  try {
    // 웹/네이티브 모두에서 URI 확보를 보장하기 위해 다운로드 시도 (웹에서는 no-op)
    await moduleAsset.downloadAsync();
  } catch (_) {
    // 다운로드 실패는 무시하고 uri/localUri 우선 사용
  }
  const uri = moduleAsset.localUri ?? moduleAsset.uri;
  if (!uri) throw new Error("Failed to resolve URI for app/img/poster1.png");
  return await analyzePosterImage({ uri });
}


