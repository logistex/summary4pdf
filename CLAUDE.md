# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.
**초안 상태**입니다 — 아직 코드가 없고 요구사항 논의 전이라, 확정된 사실이 아니라 앞으로 채워야 할 항목들을 정리해 두었습니다. 실제 설계·구현이 진행되면 이 문서를 그 결과로 갱신하세요.

## 프로젝트

**PDF 요약 앱** — (한 줄 설명 TBD: 예. PDF 문서를 업로드하면 AI가 핵심 내용을 요약해 주는 웹앱)

- 상세 설계 문서는 아직 없음. 착수 시 [`docs/PRD.md`](docs/PRD.md) 등으로 정리 예정.
- 형제 프로젝트: [`../7장 공감 다이어리 앱 Study_05_01`](../7장%20공감%20다이어리%20앱%20Study_05_01) — 동일 시리즈의 이전 프로젝트로, 스택/아키텍처 패턴 참고용.

## 확정된 사항

- **서브에이전트**: `.claude/agents/`에 복사해 둔 5개(`product-manager`, `backend-developer`, `frontend-developer`, `ai-integration-specialist`, `qa-engineer`)를 그대로 사용한다. 별도 커스터마이징 없음.
- **환경변수**: 형제 프로젝트([`../7장 공감 다이어리 앱 Study_05_01`](../7장%20공감%20다이어리%20앱%20Study_05_01))와 **동일한 `.env`**를 사용한다 — `OPENROUTER_API_KEY`, `DATABASE_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`(배포 시 `AUTH_TRUST_HOST` 추가). 스캐폴딩 시 형제 프로젝트의 `.env`를 그대로 복사해 사용.
- 위 결정에 따라 자연히 함께 정해지는 것들:
  - **LLM**: OpenRouter, 무료 모델(`:free`)만 사용 — `ai-integration-specialist.md`에 이미 명시된 정책 그대로 유효함 (형제 프로젝트와 동일 키를 쓰므로 별도 조정 불필요).
  - **인증**: 필요함 — 구글 OAuth(Auth.js), 형제 프로젝트와 **같은 구글 OAuth 앱**.
  - **데이터 저장**: 필요함 — 형제 프로젝트와 **같은 Postgres(Supabase) DB**를 공유. 형제 프로젝트가 `diary` 스키마로 `public`(recipe4fridge 앱)과 분리했던 것처럼, 이 앱도 **전용 스키마**로 테이블을 분리해야 함(스키마 이름은 착수 시 결정).

## 아직 정해지지 않은 것들 (착수 시 먼저 확정)

- 프레임워크·배포 스택 자체는 아직 명시적으로 확인되지 않음 (다만 `.env` 구성이 `pg` + Auth.js 조합을 전제하므로, 형제 프로젝트와 동일한 Next.js App Router + Vercel일 가능성이 높음 — 착수 시 확인)
- PDF 업로드·파싱 방식 (클라이언트 업로드 vs 서버 처리, 파싱 라이브러리)
- 전용 DB 스키마 이름 및 테이블 설계
- 요약 생성 세부 (스트리밍 여부, 긴 문서 청킹 전략)
- 요약 히스토리 보관 UI/기능 범위 (DB 공유는 확정됐지만 정확히 무엇을 저장할지는 미정)

## 서브에이전트 재사용

이전 프로젝트(공감 다이어리)에서 쓰던 5개 역할 에이전트를 `.claude/agents/`에 그대로 복사해 왔습니다:

- `product-manager` — PRD·요구사항·로드맵
- `backend-developer` — 서버/API/DB
- `frontend-developer` — UI/UX/접근성
- `ai-integration-specialist` — LLM/AI 연동
- `qa-engineer` — 테스트/코드리뷰

`backend-developer.md`, `frontend-developer.md`, `qa-engineer.md`의 "이 프로젝트 관련 참고" 섹션은 위 "확정된 사항"(형제 프로젝트와 동일한 `.env` → OpenRouter 무료 모델 / PostgreSQL(Supabase) 공유 / 구글 OAuth)에 맞춰 갱신해 두었습니다. 프레임워크·PDF 파싱 방식 등 여전히 미정인 항목은 각 파일에서 "아직 정해지지 않은 것들" 참고하도록 안내해 뒀습니다.

## 명령어

착수 후 실제 스캐폴딩이 끝나면 이 섹션을 채우세요 (예: `npm run dev`, `npm run build`, `npm run lint` 등).
