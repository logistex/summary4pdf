# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.
**초안 상태**입니다 — 아직 코드가 없고 요구사항 논의 전이라, 확정된 사실이 아니라 앞으로 채워야 할 항목들을 정리해 두었습니다. 실제 설계, 구현이 진행되면 이 문서를 그 결과로 갱신하세요.

## 프로젝트

**PDF 요약 앱** — PDF 문서를 업로드하면 AI(OpenRouter 무료 모델)가 핵심 내용을 요약해 보여주는, 로그인 없는 단일 페이지 웹 도구.

- 상세 설계: [`docs/superpowers/specs/2026-07-28-pdf-summary-app-design.md`](docs/superpowers/specs/2026-07-28-pdf-summary-app-design.md) (브레인스토밍으로 확정, 사용자 승인 완료). PRD, 기능 명세는 이 설계를 바탕으로 product-manager가 착수 시 작성.
- 형제 프로젝트: [`../7장 공감 다이어리 앱 Study_05_01`](../7장%20공감%20다이어리%20앱%20Study_05_01) — 동일 시리즈의 이전 프로젝트로, 스택/아키텍처 패턴 참고용.

## 확정된 사항

- **서브에이전트**: `.claude/agents/`에 복사해 둔 5개(`product-manager`, `backend-developer`, `frontend-developer`, `ai-integration-specialist`, `qa-engineer`)를 그대로 사용한다. 별도 커스터마이징 없음.
- **프레임워크, 배포**: 형제 프로젝트와 동일하게 **Next.js App Router + Vercel**.
- **인증, 데이터 저장 없음**: 이 앱은 로그인/계정과 요약 히스토리 저장이 **필요 없다**. 업로드 → 텍스트 추출 → 요약 → 결과 표시만 하는 완전한 stateless 도구(새로고침 시 결과 유실은 의도된 동작).
- **환경변수**: 형제 프로젝트([`../7장 공감 다이어리 앱 Study_05_01`](../7장%20공감%20다이어리%20앱%20Study_05_01))와 **동일한 `.env` 파일**을 재사용하지만, 이 앱이 실제로 쓰는 값은 **`OPENROUTER_API_KEY`뿐**이다. `DATABASE_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`은 파일에는 있어도 이 앱에서는 사용하지 않는다.
- **LLM**: OpenRouter, 무료 모델(`:free`)만 사용, 순차 폴백 체인(형제 프로젝트 패턴 재사용) — `ai-integration-specialist.md`에 명시된 정책 그대로 유효함.
- **PDF 처리**: 서버사이드 처리. 업로드 제한 최대 4MB, 20페이지, 초과 시 에러. 파싱 라이브러리는 `unpdf` 권장(최종 선택은 backend-developer 착수 시 확정).
- **요약 결과 표시**: 스트리밍 없이 완료 후 한 번에 표시. 구조화된 형식(한 줄 요약 + 포인트 bullet 3~5개).
- 자세한 아키텍처, 컴포넌트, 에러 처리, 테스트 범위는 설계 문서 참고.

## 아직 정해지지 않은 것들 (착수 시 확정)

- PDF 텍스트 추출 라이브러리 최종 선택(`unpdf` 권장, backend-developer가 최신 문서 확인 후 확정)

## 서브에이전트 재사용

이전 프로젝트(공감 다이어리)에서 쓰던 5개 역할 에이전트를 `.claude/agents/`에 그대로 복사해 왔습니다:

- `product-manager` — PRD, 요구사항, 로드맵
- `backend-developer` — 서버/API/DB
- `frontend-developer` — UI/UX/접근성
- `ai-integration-specialist` — LLM/AI 연동
- `qa-engineer` — 테스트/코드리뷰

`backend-developer.md`, `frontend-developer.md`, `qa-engineer.md`의 "이 프로젝트 관련 참고" 섹션은 위 "확정된 사항"(형제 프로젝트와 동일한 `.env` → OpenRouter 무료 모델 / PostgreSQL(Supabase) 공유 / 구글 OAuth)에 맞춰 갱신해 두었습니다. 프레임워크, PDF 파싱 방식 등 여전히 미정인 항목은 각 파일에서 "아직 정해지지 않은 것들" 참고하도록 안내해 뒀습니다.

## 한국어 작성 규칙

이 프로젝트의 코드(사용자 노출 문자열)와 문서(마크다운)에 한국어를 쓸 때는 다음을 지킨다. 2026-07-29 문법 검사에서 발견된 패턴을 반영한 것이다.

- **가운뎃점(·) 대신 쉼표(,)를 쓴다.** 가운뎃점은 "금·은·동메달"처럼 짝을 이루거나 공통 성분을 축약할 때만 쓰는 부호이지, 단순 열거("빌드, 타입체크, 배포"처럼 서로 다른 항목을 나열)에는 쓰지 않는다. 이 프로젝트는 전자를 후자 용도로 반복 사용했던 걸 전체적으로 쉼표로 바꿨다 — 새로 쓰는 문서/코드에도 이 규칙을 지킨다.
- **완결된 문장으로 된 UI 메시지·에러 메시지는 마침표로 끝낸다.** (`lib/constants.ts`의 모든 메시지 참고.) 버튼 라벨(예: "다시 시도")이나 제목처럼 문장이 아닌 짧은 라벨에는 마침표를 붙이지 않는다.
- **보조용언은 띄어 쓴다** (예: "시도해 주세요", "요약해 줍니다" — "시도해주세요"처럼 붙여 쓰지 않는다). 붙여 쓰는 것도 맞춤법상 허용되지만, 이 프로젝트는 격식체 문서 기준으로 띄어 쓰는 쪽으로 통일했다.
- **예외**: [`docs/superpowers/plans/2026-07-28-pdf-summary-app.md`](docs/superpowers/plans/2026-07-28-pdf-summary-app.md)는 과거 실행 기록이라 의도적으로 위 규칙을 소급 적용하지 않는다.

## 명령어

착수 후 실제 스캐폴딩이 끝나면 이 섹션을 채우세요 (예: `npm run dev`, `npm run build`, `npm run lint` 등).
