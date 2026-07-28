# PDF 요약 앱 (summary4pdf)

PDF 문서를 업로드하면 AI(OpenRouter 무료 모델)가 핵심 내용을 한 줄 요약 + 주요 포인트로 정리해 주는, 로그인 없는 단일 페이지 웹 도구입니다.

- **배포**: https://pdf-summary-app-five.vercel.app
- **스택**: Next.js 16 (App Router), React 19, TypeScript, [`unpdf`](https://github.com/unjs/unpdf)(PDF 텍스트 추출), OpenRouter API(무료 모델 폴백 체인)

## 특징

- 드래그앤드롭 또는 클릭으로 PDF 업로드
- 서버에서 텍스트 추출 → OpenRouter 무료 모델(`:free`)로 요약 생성 → 결과를 한 화면에 표시
- 인증, DB 없는 완전한 stateless 구조 (업로드 → 결과 표시가 한 번의 요청-응답으로 끝남)
- 무료 모델 5개 순차 폴백 체인 (레이트리밋/장애 시 자동 재시도)
- 업로드 제한: 최대 4MB, 최대 20페이지
- 반응형, 키보드 접근성 지원

## 개발

```bash
npm install
cp .env.example .env   # OPENROUTER_API_KEY 값을 채운다
npm run dev
```

- `npm run build` — 프로덕션 빌드
- `npx tsc --noEmit` — 타입체크
- `npm run lint` — ESLint

테스트 러너는 없습니다. 빌드, 타입체크, 수동 curl/브라우저 스모크 테스트로 검증합니다(자세한 내용은 [`docs/qa-report-pdf-summary.md`](docs/qa-report-pdf-summary.md) 참고).

## 문서

- [설계 문서](docs/superpowers/specs/2026-07-28-pdf-summary-app-design.md) — 아키텍처, 데이터 흐름, 에러 처리
- [PRD](docs/PRD.md) — 제품 요구사항
- [구현 계획](docs/superpowers/plans/2026-07-28-pdf-summary-app.md) — 8개 태스크 상세 구현 계획
- [QA 리포트](docs/qa-report-pdf-summary.md) — 엣지케이스 검증 결과

## 알려진 제약

- **한글(CJK) PDF 텍스트 추출**: `unpdf`/`pdf.js`가 한글 처리에 필요한 cmap 리소스를 서버리스 환경에서 안정적으로 로드하지 못하는 문제가 있어, 한글 PDF 업로드 시 요약 품질이 저하되거나 실패할 수 있습니다. 영어 등 라틴 문자 PDF는 정상 동작을 확인했습니다. 후속 수정이 필요합니다.
- 무료 모델만 사용하므로 OpenRouter 계정의 일일 무료 요청 한도(계정 기준)에 도달하면 요약이 일시적으로 실패할 수 있습니다.

## 배포

Vercel에 배포되어 있으며, `OPENROUTER_API_KEY` 환경변수가 Production/Preview에 설정되어 있어야 합니다.

```bash
vercel --prod
```
