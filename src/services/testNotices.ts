// 알림 리스트 검증용 테스트 데이터(실제 notices 샘플 매핑)
// - 타입은 실제 화면에서 사용하는 LocalNotificationItem과 동일합니다.
import type { LocalNotificationItem } from "./notifications";

export const testNotices: LocalNotificationItem[] = [
  {
    id: "sw-mentor-converge-1",
    title: "접수마감 SW융합 2025학년도 2학기 SW융합 멘토링 프로그램 교육(활동)기간25.09.15(월) ~ 25.11.30(일) 신청기간25.08.25(월) ~ 25.09.04(목) 교육장소- 정원무제한 포인트10",
    body: "SW중심대학사업단프로그램_SW융합",
    data: { url: "https://swuniv.jbnu.ac.kr/main/jbnusw?gc=Program&do=view&page=2&program_id=7M-yxub0PeM68a81b78" },
    createdAt: "2025-09-28T06:50:28.442412",
  },
  {
    id: "sw-digital-agri-track-2",
    title: "신청하기 SW융합 2025학년도 2학기 디지털농업AI 트랙 활동학생 선발 교육(활동)기간25.10.16(목) 신청기간25.09.26(금) ~ 25.10.16(목) 교육장소- 정원무제한 포인트-",
    body: "SW중심대학사업단프로그램_SW융합",
    data: { url: "https://swuniv.jbnu.ac.kr/main/jbnusw?gc=Program&do=view&page=1&program_id=kGt7Qyg4udg68cbdc1f" },
    createdAt: "2025-09-28T06:50:25.827549",
  },
  {
    id: "sw-mentor-major-10",
    title: "접수마감 SW전공 2025학년도 2학기 SW전공 멘토링 프로그램 교육(활동)기간25.09.15(월) ~ 25.11.30(일) 신청기간25.08.25(월) ~ 25.09.09(화) 교육장소- 정원무제한 포인트10",
    body: "SW중심대학사업단프로그램_SW전공",
    data: { url: "https://swuniv.jbnu.ac.kr/main/jbnusw?gc=Program&do=view&page=1&program_id=kyw7QQR66mA68a82176" },
    createdAt: "2025-09-28T06:50:28.074353",
  },
  {
    id: "csai-board-4929",
    title: "[ 전체게시판공지 ] 폭력예방교육/연구활동종사자 안전교육 미이수 학생 성적조회 제한 안내(전체 재학생 해당)",
    body: "폭력예방교육 및 연구활동종사자 안전교육 미이수 시 성적조회 제한 안내. 대상: 컴퓨터인공지능학부 전체 재학생. 자세한 내용은 링크 참조.",
    data: { url: "https://csai.jbnu.ac.kr/bbs/csai/4929/332055/artclView.do" },
    createdAt: "2025-09-28T06:50:06.023584",
  },
];


