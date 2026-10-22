/**
 * 보물섬 두뇌 탐험대 — 우리 반 랭킹 서버 (Google Apps Script)
 *
 * 설치 방법 (3단계)
 * 1. 구글 시트를 하나 새로 만들고, 메뉴 [확장 프로그램] → [Apps Script] 를 엽니다.
 * 2. 열린 편집기의 내용을 모두 지우고 이 파일 전체를 붙여 넣은 뒤 저장(💾)합니다.
 * 3. 오른쪽 위 [배포] → [새 배포] → 유형 "웹 앱" 선택
 *    - 실행 사용자: "나"
 *    - 액세스 권한: "모든 사용자"
 *    → [배포] 를 누르면 나오는 "웹 앱 URL"을 복사해서
 *      game.js 맨 위의  const RANK_URL = '';  안에 붙여 넣으면 끝!
 *
 * 기록은 시트의 "ranking" 탭에 한 줄씩 쌓입니다. 줄을 지우면 랭킹에서도 사라져요.
 */

const SHEET_NAME = 'ranking';
const HEADER = ['날짜', '닉네임', '캐릭터', '점수', '별', '턴', '정답', '문제수', '난이도'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(HEADER); sh.setFrozenRows(1); }
  return sh;
}

// 게임이 끝날 때 기록 저장
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const nick = String(d.nick || '').slice(0, 12);
    if (!nick) throw new Error('no nick');
    sheet_().appendRow([d.date || new Date(), nick, d.char || '', +d.score || 0, +d.stars || 0, +d.turns || 0, +d.correct || 0, +d.tries || 0, +d.level || 0]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// 랭킹 불러오기 (?action=top)
function doGet(e) {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const list = rows.filter(r => r[1]).map(r => ({
    date: r[0] instanceof Date ? Utilities.formatDate(r[0], 'Asia/Seoul', 'yyyy-MM-dd') : String(r[0]),
    nick: String(r[1]), char: String(r[2]), score: +r[3], stars: +r[4], turns: +r[5], correct: +r[6], tries: +r[7], level: +r[8],
  }));
  return json_(list);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
