# 보물섬 두뇌 탐험대

초등학생용 1~2인 두뇌 보드 웹게임. 디벗(태블릿) 브라우저에서 링크만 열면 바로 플레이할 수 있습니다.

- `index.html` 게임 화면 / `style.css` 디자인 / `game.js` 게임 로직
- `quiz-data.js` 퀴즈 문제 은행 (문제 추가·수정은 이 파일만 고치면 됩니다)
- `images/` 게임에서 쓰는 축소 이미지 / `images-original/` 원본 이미지

## 퀴즈 문제 추가하기
`quiz-data.js`의 배열에 한 줄 추가:
```js
{ type:'pattern', level:1, q:'문제 내용', o:['보기1','보기2','보기3','보기4'], a:0, h:'해설(선택)' },
```
- type: pattern(규칙 찾기) / shape(도형 패턴) / logic(논리 추론) / common(상식) / word(단어 퍼즐)
- level: 1(쉬움) 2(보통) 3(어려움) · a: 정답 보기 번호(0부터)

## 우리 반 랭킹(Firebase) 연결하기
1. https://console.firebase.google.com 에서 프로젝트 만들기 (애널리틱스는 꺼도 됨)
2. 왼쪽 [빌드] → [Realtime Database] → 데이터베이스 만들기 (위치: 아시아, **테스트 모드**로 시작)
3. [규칙] 탭을 아래처럼 바꾸고 게시:
```json
{ "rules": { "ranking": { ".read": true, ".write": true,
  "$id": { ".validate": "newData.hasChildren(['nick','score']) && newData.child('nick').isString() && newData.child('nick').val().length <= 12 && newData.child('score').isNumber()" } } } }
```
4. 프로젝트 설정(⚙) → 내 앱 → 웹 앱(</>) 추가 → 나오는 `firebaseConfig` 값을 `game.js` 맨 위 `FIREBASE_CONFIG` 에 넣기

연결 전에는 각 기기 안에서만 랭킹이 기록됩니다.
