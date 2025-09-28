import "../db/firebase";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from "firebase/firestore";

/**
 * 배너 이미지 저장/조회 전담 모듈 (bannerStore)
 * - 역할: 크롤링 등으로 수집된 외부 이미지 URL을 `bannerImage` 컬렉션에 저장/조회
 * - 분리 의도: 배너 데이터 관리 로직을 한 곳에 모아 재사용성과 테스트 용이성 확보
 */

/**
 * 배너 저장 요청 파라미터
 * - imageUrl: 외부 이미지 URL (필수)
 * - sourceUrl: 원문/출처 URL (선택)
 * - title: 식별/표시용 제목 (선택)
 * - orgId: 조직 식별자 (선택)
 */
export type SaveBannerImageParams = {
  imageUrl: string;
  sourceUrl?: string | null;
  title?: string | null;
  orgId?: string | null;
};

/**
 * 배너 이미지 도큐먼트 스키마 (클라이언트 사용용)
 */
export type BannerImageDoc = {
  id: string;
  imageUrl: string;
  sourceUrl: string | null;
  title: string | null;
  orgId: string | null;
  createdAt?: any;
  updatedAt?: any;
};

/**
 * 배너 이미지 URL을 `bannerImage` 컬렉션에 저장합니다.
 * - 동일 URL이 이미 존재하면 새로 만들지 않고 기존 문서 id를 반환합니다.
 * - 최초 생성 시 createdAt/updatedAt을 서버 타임스탬프로 기록합니다.
 * @returns { id, created } 또는 null(잘못된 URL)
 */
export async function saveBannerImage(params: SaveBannerImageParams): Promise<{ id: string; created: boolean } | null> {
  const url = (params.imageUrl || "").trim();
  if (!url) return null;

  const db = getFirestore();
  const col = collection(db, "bannerImage");

  const dupQ = query(col, where("imageUrl", "==", url), limit(1));
  const dupSnap = await getDocs(dupQ);
  if (!dupSnap.empty) {
    return { id: dupSnap.docs[0].id, created: false };
  }

  const docRef = await addDoc(col, {
    imageUrl: url,
    sourceUrl: params.sourceUrl ?? null,
    title: params.title ?? null,
    orgId: params.orgId ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, created: true };
}

/**
 * 최근 생성된 배너 이미지를 가져옵니다.
 * - 정렬: createdAt DESC, 최대 maxCount개
 * - 주의(Firestore 제약):
 *   where("imageUrl", "!=", null) + orderBy("createdAt") 조합은 인덱스가 필요하거나
 *   환경에 따라 제약에 걸릴 수 있습니다. 문제가 되면 다음 중 하나를 고려하세요:
 *   1) where 제거 후 클라이언트에서 imageUrl 존재 여부 필터링
 *   2) hasImage: true 같은 플래그 필드를 저장해 단일 필드 조건만 사용
 *   3) 콘솔에서 제안하는 복합 인덱스 생성
 */
export async function fetchRecentBannerImages(maxCount: number = 200): Promise<BannerImageDoc[]> {
  const db = getFirestore();
  const col = collection(db, "bannerImage");
  const q = query(col, where("imageUrl", "!=", null), orderBy("createdAt", "desc"), limit(maxCount));
  const snap = await getDocs(q);
  const out: BannerImageDoc[] = [];
  snap.forEach((doc) => {
    const d = doc.data() as any;
    out.push({
      id: doc.id,
      imageUrl: d.imageUrl,
      sourceUrl: d.sourceUrl ?? null,
      title: d.title ?? null,
      orgId: d.orgId ?? null,
      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null,
    });
  });
  return out;
}


