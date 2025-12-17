# Firebase Firestore 보안 규칙 설정 가이드

## 문제
`hotClicks` 컬렉션에 대한 쓰기 권한이 없어서 조회수가 증가하지 않습니다.

## 해결 방법

Firebase 콘솔에서 Firestore 보안 규칙을 다음과 같이 설정하세요:

### 1. Firebase 콘솔 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 "Firestore Database" 클릭
4. "규칙" 탭 클릭

### 2. 보안 규칙 추가

다음 규칙을 추가하여 `hotClicks` 컬렉션에 대한 읽기/쓰기 권한을 부여하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 기존 규칙들...
    
    // hotClicks 컬렉션: 모든 사용자가 읽고 쓸 수 있음
    match /hotClicks/{documentId} {
      allow read: if true;
      allow create: if true;
      allow update: if true;
    }
  }
}
```

### 3. 더 안전한 규칙 (권장)

인증된 사용자만 쓰기를 허용하려면:

```javascript
match /hotClicks/{documentId} {
  allow read: if true;
  allow create: if request.auth != null;
  allow update: if request.auth != null;
}
```

### 4. 규칙 게시
1. 규칙 작성 후 "게시" 버튼 클릭
2. 확인 대화상자에서 "게시" 확인

## 참고
- 규칙 변경 후 몇 분 정도 소요될 수 있습니다
- 개발 환경에서는 `allow read, write: if true;`로 설정해도 되지만, 프로덕션에서는 더 엄격한 규칙을 권장합니다

