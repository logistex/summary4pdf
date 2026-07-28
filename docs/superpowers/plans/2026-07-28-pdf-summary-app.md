# PDF 요약 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **역할 배정(사용자 지정, 필수):** 이 계획의 각 태스크는 아래 명시된 `.claude/agents/` 역할 서브에이전트로 실행한다. subagent-driven-development의 기본(범용 서브에이전트)을 쓰지 말고, 각 태스크 헤더에 적힌 `agent:` 값을 서브에이전트 타입으로 지정해 디스패치할 것.

**Goal:** PDF를 업로드하면 OpenRouter 무료 모델이 핵심을 요약해 보여주는, 로그인·DB 없는 단일 페이지 Next.js 도구를 만든다.

**Architecture:** Next.js App Router(Vercel 배포) 단일 앱. 프런트엔드 단일 페이지(`app/page.tsx`)가 상태(idle/processing/result/error)를 관리하고, 백엔드는 `POST /api/summarize` 하나로 검증→PDF 텍스트 추출(`unpdf`)→OpenRouter 무료 모델 요약을 한 번의 요청-응답으로 처리한다. 세션·DB 없음.

**Tech Stack:** Next.js 16(App Router) · React 19 · TypeScript · `unpdf`(PDF 텍스트 추출) · OpenRouter API(무료 모델 폴백 체인, Node 내장 fetch) · Vercel 배포. 테스트 러너 없음(형제 프로젝트와 동일 컨벤션) — 빌드(`npm run build`)·타입체크(`npx tsc --noEmit`)·스모크 테스트로 검증.

## Global Constraints

- 업로드 제한: 최대 10MB, 최대 20페이지. 초과 시 400 에러(설계 문서 에러 표 참고).
- LLM은 OpenRouter **무료 모델(`:free`)만** 사용. 유료 모델 금지.
- 인증·DB·세션 없음 (완전 stateless).
- 요약 결과는 스트리밍 없이 완료 후 한 번에 표시.
- 결과 포맷: 구조화(한 줄 요약 + 포인트 bullet 3~5개).
- 모든 UI 텍스트·에러 메시지는 한국어.
- 환경변수는 형제 프로젝트(`../7장 공감 다이어리 앱 Study_05_01`)의 `.env`를 복사해 재사용하되, 이 앱은 `OPENROUTER_API_KEY`만 실제로 사용한다.
- 시크릿(`OPENROUTER_API_KEY` 등)은 코드·커밋·로그에 절대 남기지 않는다. `.env`는 git에 커밋되지 않는다(`.gitignore`로 제외).
- 참고 문서: [`docs/superpowers/specs/2026-07-28-pdf-summary-app-design.md`](../specs/2026-07-28-pdf-summary-app-design.md)

**로컬 테스트 PDF 생성·검증 관련 (Task 3 실행 중 발견, 계획 최초 작성 시에는 몰랐던 내용):**
- 이 macOS는 `textutil -convert pdf`를 지원하지 않는다(`-help` 출력에 pdf가 없음). 테스트용 PDF는 대신 macOS 내장 `cupsfilter`로 만든다: `cupsfilter input.txt > output.pdf` (별도 설치 불필요, 실제 유효한 PDF 생성 확인됨).
- 이 개발 머신의 Node 버전(v26.5.0)은 내장 `fetch()`가 `file://` 스킴을 아직 구현하지 않았다. 이 때문에 `unpdf`가 한글(CJK) cmap 리소스를 로드하지 못해, **로컬에서** 한글이 포함된 PDF를 추출하면 한글 부분이 깨지거나 누락된다(영어/숫자/문장부호는 정상 추출됨). 이는 `lib/pdf/extract.ts` 코드의 결함이 아니라 로컬 Node 버전의 한계이며, Vercel 배포 환경(표준 릴리스 Node)에서는 재현되지 않을 것으로 예상된다(확정은 아님).
- **정책(사용자 승인)**: 코드는 수정하지 않는다. 로컬 스모크 테스트·브라우저 확인은 전부 **영어 텍스트**로 진행해 기능 흐름(업로드→추출→요약→표시, 에러 케이스)만 검증한다. 한글 처리는 배포 후 실제 환경에서 별도로 재확인한다. 아래 Task 4/6/7/8의 테스트 PDF 생성 예시 문구가 한글로 되어 있는 곳은 전부 이 정책에 따라 영어 문구로 대체해서 실행한다.

---

## Task 1: PRD·기능 명세 작성

**agent:** `product-manager`

**Files:**
- Create: `docs/PRD.md`

**Interfaces:**
- Consumes: [`docs/superpowers/specs/2026-07-28-pdf-summary-app-design.md`](../specs/2026-07-28-pdf-summary-app-design.md) (이미 승인된 설계 — 임의로 뒤집지 말 것)
- Produces: `docs/PRD.md` — 이후 모든 태스크가 기능 범위 확인용으로 참조

이 태스크는 코드가 아니라 문서 산출물이므로, "실패하는 테스트"가 아니라 아래 **완료 체크리스트**로 검증한다.

- [ ] **Step 1: 설계 문서 정독**

`docs/superpowers/specs/2026-07-28-pdf-summary-app-design.md` 전체를 읽는다. 이 설계는 이미 사용자 승인을 받았으므로 범위·기술 결정(Next.js App Router, 인증·DB 없음, 10MB/20페이지 제한, OpenRouter 무료 모델, 구조화 요약, 스트리밍 없음)을 뒤집지 않는다.

- [ ] **Step 2: `docs/PRD.md` 작성**

다음 섹션을 반드시 포함한다 (설계 문서 내용을 PRD 형식으로 구체화):
1. 한 줄 설명 / 배경
2. 목표와 성공 기준 (예: "PDF 업로드 후 30초 내 요약 결과 표시", "지원 파일 최대 10MB/20페이지")
3. 사용자 시나리오 (업로드 → 처리 중 → 결과 확인 / 실패 시나리오)
4. 기능 요구사항: 업로드(드래그앤드롭+클릭), 텍스트 추출, AI 요약(구조화: 한 줄 요약 + 포인트 3~5개), 결과 표시, 에러 처리
5. 비기능 요구사항: 업로드 제한(10MB/20페이지), 처리 시간(Vercel `maxDuration=60`), 무료 모델만 사용, 인증·DB 없음(stateless)
6. 에러 케이스 표 (설계 문서의 에러 처리 표를 그대로 인용)
7. Out of Scope: 로그인/계정, 히스토리 저장, 스트리밍 표시, 긴 문서 청킹(map-reduce)
8. 작업 분담: backend-developer(업로드·추출) → ai-integration-specialist(OpenRouter 요약) → frontend-developer(UI) → qa-engineer(테스트)

- [ ] **Step 3: 체크리스트로 자체 검토**

작성한 `docs/PRD.md`를 다시 읽고 다음을 확인한다:
- [ ] 위 8개 섹션이 모두 존재하는가?
- [ ] "TBD"/"추후 결정" 같은 미정 표현이 없는가? (있다면 설계 문서를 참고해 구체적 값으로 채운다)
- [ ] 설계 문서의 결정(스택·제한값·에러 메시지)과 모순되는 내용이 없는가?

- [ ] **Step 4: 커밋**

```bash
git add docs/PRD.md
git commit -m "docs: PDF 요약 앱 PRD 작성"
```

---

## Task 2: Next.js 프로젝트 스캐폴딩

**agent:** `backend-developer`

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`(임시 placeholder — Task 6에서 실제 UI로 교체)
- Create: `.env.example`
- Modify: `.gitignore`
- (자동 생성, 손대지 않음: `next-env.d.ts` — `npm run dev`/`npm run build` 최초 실행 시 Next.js가 만든다)

**Interfaces:**
- Produces: `npm run dev`/`npm run build`/`npx tsc --noEmit`가 동작하는 빈 Next.js App Router 프로젝트. 이후 모든 태스크가 이 위에서 파일을 추가한다.

- [ ] **Step 1: `package.json` 작성**

```json
{
  "name": "pdf-summary-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.2.12",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "unpdf": "^1.8.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.12",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: `tsconfig.json` 작성**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: `next.config.ts` 작성**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

- [ ] **Step 4: `eslint.config.mjs` 작성**

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
```

- [ ] **Step 5: `.gitignore` 갱신**

기존 `.gitignore`(이미 존재)를 아래 내용으로 교체한다:

```gitignore
# 환경변수 / 시크릿 (절대 커밋 금지)
.env
.env.*
!.env.example

# 의존성
node_modules/

# Next.js 빌드 산출물
.next/
out/
build/

# 로그
*.log

# 런타임/캐시
.vercel/
*.tsbuildinfo
next-env.d.ts

# 에디터/OS
.DS_Store
.vscode/
.idea/
```

- [ ] **Step 6: 의존성 설치**

Run: `npm install`
Expected: 에러 없이 완료, `node_modules/`와 `package-lock.json` 생성됨.

- [ ] **Step 7: `app/layout.tsx` 작성**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF 요약",
  description: "PDF 문서를 업로드하면 AI가 핵심 내용을 요약해 줍니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: `app/globals.css` 작성**

```css
:root {
  --bg: #f7f8fa;
  --surface: #ffffff;
  --text: #1f2430;
  --text-soft: #5b6472;
  --border: #e2e5ea;
  --accent: #3563e9;
  --accent-strong: #274bc2;
  --danger: #c0392b;
  --danger-soft: #fbeae8;
  --radius: 12px;
  --maxw: 640px;
  --font-sans: "Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
    "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #14161c;
    --surface: #1c2028;
    --text: #eef0f4;
    --text-soft: #a7afbd;
    --border: #2c313c;
    --accent: #7295ff;
    --accent-strong: #93aeff;
    --danger: #e57368;
    --danger-soft: #3a2422;
  }
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  min-height: 100vh;
  color: var(--text);
  background: var(--bg);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.6;
}

button {
  font: inherit;
  cursor: pointer;
}

:where(a, button, input, [tabindex]):focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
  border-radius: 6px;
}
```

- [ ] **Step 9: `app/page.tsx` 임시 placeholder 작성**

(Task 6에서 실제 업로드 UI로 완전히 교체될 임시 파일 — 지금은 스캐폴딩이 정상 동작하는지 확인하기 위한 최소 페이지)

```tsx
export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>PDF 요약</h1>
      <p>준비 중입니다.</p>
    </main>
  );
}
```

- [ ] **Step 10: 환경변수 복사**

```bash
cp "../7장 공감 다이어리 앱 Study_05_01/.env" .env
```

- [ ] **Step 11: `.env.example` 작성**

(실제 값은 절대 넣지 않는다 — 키 이름만)

```env
# 이 앱이 실제로 사용하는 값은 OPENROUTER_API_KEY 뿐입니다.
OPENROUTER_API_KEY=

# 아래 값들은 형제 프로젝트(공감 다이어리 앱)와 .env 파일을 공유하기 때문에
# 존재하지만, 이 앱에서는 사용하지 않습니다.
DATABASE_URL=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SECRET=
```

- [ ] **Step 12: 빌드·타입체크로 검증**

Run: `npm run build`
Expected: 에러 없이 빌드 성공, `/`(홈) 라우트가 정적/서버 렌더 대상으로 표시됨.

Run: `npx tsc --noEmit`
Expected: 출력 없음(에러 0건).

- [ ] **Step 13: 커밋**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts eslint.config.mjs \
  app/layout.tsx app/globals.css app/page.tsx .env.example .gitignore
git commit -m "chore: Next.js App Router 프로젝트 스캐폴딩"
```

(`.env`는 `.gitignore`에 의해 자동 제외되므로 `git add`에 포함하지 않는다. `git status`로 `.env`가 스테이징되지 않았는지 반드시 확인한다.)

---

## Task 3: PDF 텍스트 추출 모듈

**agent:** `backend-developer`

**Files:**
- Create: `lib/constants.ts`
- Create: `lib/pdf/extract.ts`

**Interfaces:**
- Consumes: `unpdf`의 `extractText`, `getDocumentProxy` (npm 패키지, Task 2에서 설치됨)
- Produces:
  - `MAX_FILE_SIZE_BYTES: number`, `MAX_PAGE_COUNT: number`, `NOT_PDF_MESSAGE: string`, `SIZE_LIMIT_MESSAGE: string` (from `lib/constants.ts`)
  - `extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }>` (from `lib/pdf/extract.ts`) — Task 4의 API 라우트가 그대로 가져다 쓴다.

- [ ] **Step 1: `lib/constants.ts` 작성**

```ts
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_PAGE_COUNT = 20;

export const NOT_PDF_MESSAGE = "PDF 파일만 업로드할 수 있습니다";
export const SIZE_LIMIT_MESSAGE = `문서가 너무 큽니다(최대 10MB, ${MAX_PAGE_COUNT}페이지)`;
export const EXTRACT_FAILED_MESSAGE = "이 PDF에서 텍스트를 추출할 수 없습니다";
export const SUMMARY_FAILED_MESSAGE =
  "요약 생성에 실패했습니다. 잠시 후 다시 시도해주세요";
```

- [ ] **Step 2: `lib/pdf/extract.ts` 작성**

```ts
import { extractText, getDocumentProxy } from "unpdf";

export interface ExtractResult {
  text: string;
  pageCount: number;
}

/**
 * PDF 바이너리에서 텍스트와 페이지 수를 추출한다.
 * 텍스트 레이어가 없는 PDF(스캔 이미지 등)는 text가 빈 문자열일 수 있다 —
 * 호출부(API 라우트)가 빈 텍스트를 별도로 검사해 에러 처리한다.
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractResult> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { text: text.trim(), pageCount: totalPages };
}
```

- [ ] **Step 3: 스모크 테스트용 실제 PDF 생성 (macOS `cupsfilter` 사용, 테스트 러너 없는 이 프로젝트 컨벤션 — `textutil`은 이 macOS에서 pdf 출력을 지원하지 않아 대신 사용)**

영어 텍스트 사용(Global Constraints의 로컬 검증 정책 참고 — 한글은 이 Node 버전의 `fetch() file://` 제약으로 로컬에서 깨진다):

```bash
echo "This is a PDF extraction smoke test document for the summary app." > /tmp/pdf-smoke-test.txt
cupsfilter /tmp/pdf-smoke-test.txt > /tmp/pdf-smoke-test.pdf
```

Expected: `/tmp/pdf-smoke-test.pdf` 생성됨(오류 없음, `file` 명령으로 확인 시 `PDF document`).

- [ ] **Step 4: 임시 스모크 스크립트 작성 및 실행**

`scripts/smoke-extract.ts` (임시 파일 — 검증 후 삭제):

```ts
import { readFile } from "node:fs/promises";
import { extractPdfText } from "../lib/pdf/extract";

const buffer = await readFile("/tmp/pdf-smoke-test.pdf");
const result = await extractPdfText(buffer);
console.log(JSON.stringify(result));

if (!result.text.includes("extraction smoke test")) {
  throw new Error("추출된 텍스트에 예상 문구가 없습니다: " + result.text);
}
if (result.pageCount !== 1) {
  throw new Error(`예상 페이지 수 1, 실제 ${result.pageCount}`);
}
console.log("OK: extract smoke test passed");
```

Run: `npx --yes tsx scripts/smoke-extract.ts`
Expected: `OK: extract smoke test passed` 출력, 에러 없음.

- [ ] **Step 5: 임시 스모크 스크립트 삭제**

```bash
rm scripts/smoke-extract.ts
rmdir scripts 2>/dev/null || true
```

(이 스크립트는 검증용 일회성 파일이라 커밋 대상이 아니다. 정식 테스트 러너가 생기면 그때 정식 테스트로 옮긴다.)

- [ ] **Step 6: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add lib/constants.ts lib/pdf/extract.ts
git commit -m "feat: PDF 텍스트 추출 모듈 추가 (unpdf)"
```

---

## Task 4: `/api/summarize` 라우트 + 요약 스텁 연결

**agent:** `backend-developer`

**Files:**
- Create: `lib/ai/summarize.ts` (지금은 **스텁** — 실제 텍스트 앞부분을 그대로 되돌려주는 더미 구현. Task 5에서 OpenRouter 연동으로 교체하되, export 시그니처는 그대로 유지한다)
- Create: `app/api/summarize/route.ts`

**Interfaces:**
- Consumes: `extractPdfText` (Task 3), `MAX_FILE_SIZE_BYTES`/`MAX_PAGE_COUNT`/`NOT_PDF_MESSAGE`/`SIZE_LIMIT_MESSAGE`/`EXTRACT_FAILED_MESSAGE`/`SUMMARY_FAILED_MESSAGE` (Task 3)
- Produces:
  - `summarizeText(text: string): Promise<{ summary: string; points: string[] }>` (from `lib/ai/summarize.ts`) — Task 5가 내부 구현만 교체, 시그니처는 고정. 실패 시 이 함수는 **예외를 던진다**(라우트가 잡아서 502 처리).
  - `POST /api/summarize` — `multipart/form-data`의 `file` 필드를 받아 `{ summary, points }`(200) 또는 `{ error }`(4xx/5xx)를 반환. Task 6의 프런트엔드가 그대로 호출한다.

- [ ] **Step 1: `lib/ai/summarize.ts` 스텁 작성**

```ts
export interface SummarizeResult {
  summary: string;
  points: string[];
}

/**
 * 임시 스텁 — 실제 요약이 아니라 입력 텍스트 앞부분을 잘라 되돌려준다.
 * API 라우트/프런트엔드를 먼저 엔드투엔드로 검증한 뒤, Task 5에서
 * OpenRouter 무료 모델 기반 실제 요약으로 내부 구현을 교체한다.
 * (export 시그니처는 고정 — 아래 함수 시그니처를 바꾸지 말 것.)
 */
export async function summarizeText(text: string): Promise<SummarizeResult> {
  const normalized = text.trim().replace(/\s+/g, " ");
  const summary = normalized.slice(0, 80) || "(내용 없음)";
  const points = [normalized.slice(0, 40) || "(내용 없음)"];
  return { summary, points };
}
```

- [ ] **Step 2: `app/api/summarize/route.ts` 작성**

```ts
import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/pdf/extract";
import { summarizeText } from "@/lib/ai/summarize";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_PAGE_COUNT,
  NOT_PDF_MESSAGE,
  SIZE_LIMIT_MESSAGE,
  EXTRACT_FAILED_MESSAGE,
  SUMMARY_FAILED_MESSAGE,
} from "@/lib/constants";

export const maxDuration = 60;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: NOT_PDF_MESSAGE }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: SIZE_LIMIT_MESSAGE }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let extracted: { text: string; pageCount: number };
  try {
    extracted = await extractPdfText(buffer);
  } catch {
    return NextResponse.json({ error: EXTRACT_FAILED_MESSAGE }, { status: 400 });
  }

  if (extracted.pageCount > MAX_PAGE_COUNT) {
    return NextResponse.json({ error: SIZE_LIMIT_MESSAGE }, { status: 400 });
  }

  if (!extracted.text) {
    return NextResponse.json({ error: EXTRACT_FAILED_MESSAGE }, { status: 400 });
  }

  try {
    const result = await summarizeText(extracted.text);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: SUMMARY_FAILED_MESSAGE }, { status: 502 });
  }
}
```

- [ ] **Step 3: 개발 서버 기동 후 정상 경로 스모크 테스트**

(Task 3에서 만든 `/tmp/pdf-smoke-test.pdf`가 없다면 Task 3의 Step 3 명령을 다시 실행해 생성한다.)

```bash
npm run dev > /tmp/pdf-app-dev.log 2>&1 &
DEV_PID=$!
sleep 3
curl -sS -i -X POST http://localhost:3000/api/summarize \
  -F "file=@/tmp/pdf-smoke-test.pdf"
```

Expected: `HTTP/1.1 200 OK`, 바디는 `{"summary":"...","points":["..."]}` 형태(스텁 값이므로 원문 앞부분을 자른 텍스트).

- [ ] **Step 4: 에러 경로 스모크 테스트 (PDF가 아닌 파일)**

```bash
curl -sS -i -X POST http://localhost:3000/api/summarize \
  -F "file=@/tmp/pdf-smoke-test.txt"
```

Expected: `HTTP/1.1 400`, 바디 `{"error":"PDF 파일만 업로드할 수 있습니다"}`.

- [ ] **Step 5: 개발 서버 종료**

```bash
kill $DEV_PID
```

- [ ] **Step 6: 타입체크·빌드**

Run: `npx tsc --noEmit` → 에러 없음.
Run: `npm run build` → 성공.

- [ ] **Step 7: 커밋**

```bash
git add lib/ai/summarize.ts app/api/summarize/route.ts
git commit -m "feat: /api/summarize 라우트 추가 (요약은 임시 스텁)"
```

---

## Task 5: OpenRouter 무료 모델 요약 연동

**agent:** `ai-integration-specialist`

**Files:**
- Create: `lib/ai/openrouter.ts`
- Modify: `lib/ai/summarize.ts` (Task 4의 스텁을 실제 OpenRouter 호출로 교체 — **export된 `summarizeText` 시그니처는 그대로 유지**해야 Task 4의 라우트가 수정 없이 동작한다)

**Interfaces:**
- Consumes: `OPENROUTER_API_KEY`(`.env`, Task 2에서 복사됨)
- Produces: `summarizeText(text: string): Promise<{ summary: string; points: string[] }>` — 시그니처 불변, 내부만 실제 AI 호출로 교체. 실패 시 예외를 던짐(Task 4 라우트가 502로 변환).

**중요:** 아래 `FREE_MODELS` 목록은 형제 프로젝트에서 2026-07-26에 실제 호출로 검증된 값이다. 구현 착수 시점 기준으로 여전히 사용 가능한지 OpenRouter 문서(`https://openrouter.ai/docs`)나 모델 목록 API로 다시 확인한 뒤 진행한다(모델은 자주 바뀐다 — `ai-integration-specialist.md`의 "불확실하면 멈추고 묻는다" 원칙 참고). 목록이 바뀌었다면 여전히 `:free`로 끝나는 무료 모델로만 교체한다.

- [ ] **Step 1: `lib/ai/openrouter.ts` 작성**

```ts
// OpenRouter 최소 클라이언트 (무료 모델 폴백 체인)
//
// - Node 내장 fetch로 OpenRouter의 OpenAI 호환 chat/completions 엔드포인트를 호출한다.
// - 여러 무료 모델을 순서대로 시도하는 폴백 체인을 둔다. 1순위가 429/5xx/네트워크
//   오류/타임아웃/응답검증 실패면 다음 무료 모델로 넘어간다.
// - 모델당 1회만 시도하고, 실패하면 곧바로 다음 모델로 넘어간다(지수 백오프 대신
//   "다른 무료 모델"로 폴백하는 편이 성공률·지연 모두 유리 — 형제 프로젝트에서 검증됨).
// - 인증 키(OPENROUTER_API_KEY)는 환경변수로만 읽고 로그에 절대 출력하지 않는다.
// - 유료 모델은 절대 사용하지 않는다. 아래 FREE_MODELS는 전부 :free(무료) 텍스트 모델이다.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * 무료 모델 폴백 체인(전부 OpenRouter `:free` 텍스트 모델, 유료 없음).
 * 앞에서부터 순서대로 시도하며, 실패하면 다음 모델로 넘어간다.
 * 구현 착수 시 OpenRouter 문서로 최신 무료 모델 목록을 재확인할 것.
 */
export const FREE_MODELS = [
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-20b:free",
  "google/gemma-4-26b-a4b-it:free",
  "inclusionai/ling-3.0-flash:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
] as const;

export const DEFAULT_MODEL = FREE_MODELS[0];

const TIMEOUT_MS = 10_000;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  models?: readonly string[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResult {
  content: string;
  model: string;
}

function debugLog(message: string): void {
  if (process.env.AI_DEBUG) {
    console.debug(`[ai/openrouter] ${message}`);
  }
}

async function requestModel(
  model: string,
  messages: ChatMessage[],
  apiKey: string,
  options: ChatOptions,
): Promise<string> {
  const body = JSON.stringify({
    model,
    messages,
    temperature: options.temperature ?? 0.5,
    max_tokens: options.max_tokens ?? 500,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("응답에 content가 없습니다.");
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export async function chatCompletionWithFallback(
  messages: ChatMessage[],
  options: ChatOptions = {},
  validate?: (content: string) => boolean,
): Promise<ChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const models = options.models ?? FREE_MODELS;
  let lastError: unknown;

  for (const model of models) {
    try {
      const content = await requestModel(model, messages, apiKey, options);
      if (validate && !validate(content)) {
        lastError = new Error("응답 검증 실패(파싱 불가 등)");
        debugLog(`모델 응답 검증 실패, 다음 모델로 폴백: ${model}`);
        continue;
      }
      debugLog(`응답 성공 모델: ${model}`);
      return { content, model };
    } catch (err) {
      lastError = err;
      const reason = err instanceof Error ? err.message : "알 수 없는 오류";
      debugLog(`모델 실패(${reason}), 다음 모델로 폴백: ${model}`);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("모든 무료 모델 호출에 실패했습니다.");
}
```

- [ ] **Step 2: `lib/ai/summarize.ts`를 실제 OpenRouter 호출로 교체**

```ts
import { chatCompletionWithFallback, type ChatMessage } from "./openrouter";

export interface SummarizeResult {
  summary: string;
  points: string[];
}

/**
 * 무료 모델의 컨텍스트 길이 제한을 고려해 입력 텍스트를 안전한 길이로 자른다.
 * 20페이지 제한과 별개로, 모델 호출 자체의 안정성을 위한 추가 방어선이다.
 */
const MAX_INPUT_CHARS = 12_000;

const SYSTEM_PROMPT = [
  "너는 한국어로 문서를 요약하는 어시스턴트다.",
  "사용자가 PDF에서 추출한 본문을 준다.",
  "다음 두 가지를 한국어로 만든다.",
  "1) summary: 문서 전체 핵심을 담은 한 문장 요약.",
  "2) points: 문서의 주요 내용을 담은 3~5개의 짧은 포인트 배열.",
  "설명이나 인사말 없이 아래 형식의 JSON 객체 하나만 출력한다.",
  '{"summary":"...","points":["...","..."]}',
].join("\n");

function stripCodeFence(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fence ? fence[1] : text).trim();
}

function parseModelJson(
  raw: string,
): { summary?: unknown; points?: unknown } | null {
  const cleaned = stripCodeFence(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function isValidParsed(
  parsed: { summary?: unknown; points?: unknown } | null,
): parsed is { summary: string; points: unknown[] } {
  return (
    !!parsed &&
    typeof parsed.summary === "string" &&
    parsed.summary.trim().length > 0 &&
    Array.isArray(parsed.points)
  );
}

/**
 * 추출된 PDF 텍스트를 OpenRouter 무료 모델 폴백 체인으로 요약한다.
 * 모든 무료 모델이 실패하거나 응답을 파싱할 수 없으면 예외를 던진다
 * (호출부인 /api/summarize 라우트가 잡아 502로 응답한다).
 */
export async function summarizeText(text: string): Promise<SummarizeResult> {
  const input = text.slice(0, MAX_INPUT_CHARS);
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: input },
  ];

  const { content: raw } = await chatCompletionWithFallback(
    messages,
    { max_tokens: 500 },
    (text) => isValidParsed(parseModelJson(text)),
  );

  const parsed = parseModelJson(raw);
  if (!isValidParsed(parsed)) {
    throw new Error("요약 응답 파싱 실패");
  }

  return {
    summary: parsed.summary,
    points: parsed.points.filter((p): p is string => typeof p === "string"),
  };
}
```

- [ ] **Step 3: 실제 요약 스모크 테스트**

```bash
npm run dev > /tmp/pdf-app-dev.log 2>&1 &
DEV_PID=$!
sleep 3
curl -sS -i -X POST http://localhost:3000/api/summarize \
  -F "file=@/tmp/pdf-smoke-test.pdf"
kill $DEV_PID
```

Expected: `HTTP/1.1 200 OK`, 바디의 `summary`가 Task 4 스텁처럼 원문을 그대로 자른 값이 **아니라** AI가 생성한 새로운 문장이어야 한다. `points` 배열 길이가 1~5. 실패하면 `/tmp/pdf-app-dev.log`에서 어떤 모델까지 폴백했는지 확인한다(필요 시 `AI_DEBUG=1 npm run dev`로 재실행).

- [ ] **Step 4: 타입체크·빌드**

Run: `npx tsc --noEmit` → 에러 없음.
Run: `npm run build` → 성공.

- [ ] **Step 5: 커밋**

```bash
git add lib/ai/openrouter.ts lib/ai/summarize.ts
git commit -m "feat: OpenRouter 무료 모델로 실제 PDF 요약 연동"
```

---

## Task 6: 업로드 UI + 페이지 상태 관리

**agent:** `frontend-developer`

**Files:**
- Create: `components/UploadDropzone.tsx`, `components/UploadDropzone.module.css`
- Create: `app/page.module.css`
- Modify: `app/page.tsx` (Task 2의 placeholder를 실제 업로드 흐름으로 교체)

**Interfaces:**
- Consumes: `POST /api/summarize`(Task 4/5), `MAX_FILE_SIZE_BYTES`/`NOT_PDF_MESSAGE`/`SIZE_LIMIT_MESSAGE`(Task 3의 `lib/constants.ts`)
- Produces: `UploadDropzone` 컴포넌트의 `onFileSelected: (file: File) => void` prop 계약 — Task 7이 그대로 재사용

- [ ] **Step 1: `components/UploadDropzone.tsx` 작성**

```tsx
"use client";

import { useRef, useState, type DragEvent } from "react";
import styles from "./UploadDropzone.module.css";

interface Props {
  onFileSelected: (file: File) => void;
}

export default function UploadDropzone({ onFileSelected }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  }

  return (
    <div
      className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="PDF 파일 업로드"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <p>PDF 파일을 여기에 끌어다 놓거나 클릭해서 선택하세요</p>
      <p className={styles.hint}>최대 10MB, 20페이지</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className={styles.hiddenInput}
        onChange={handleInputChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: `components/UploadDropzone.module.css` 작성**

```css
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  background: var(--surface);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.dropzone:hover,
.dropzone.dragOver {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
}

.hint {
  margin-top: 8px;
  color: var(--text-soft);
  font-size: 0.875rem;
}

.hiddenInput {
  display: none;
}
```

- [ ] **Step 3: `app/page.module.css` 작성**

```css
.main {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 48px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
}

.loading {
  text-align: center;
  color: var(--text-soft);
  padding: 48px 0;
}

.errorBox {
  border: 1px solid var(--danger);
  background: var(--danger-soft);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.errorBox button {
  align-self: flex-start;
  border: 1px solid var(--danger);
  background: transparent;
  color: var(--danger);
  border-radius: 8px;
  padding: 8px 16px;
}
```

- [ ] **Step 4: `app/page.tsx`를 실제 업로드 흐름으로 교체**

```tsx
"use client";

import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import { MAX_FILE_SIZE_BYTES, NOT_PDF_MESSAGE, SIZE_LIMIT_MESSAGE } from "@/lib/constants";
import styles from "./page.module.css";

type Status = "idle" | "processing" | "result" | "error";

interface SummaryData {
  summary: string;
  points: string[];
}

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setStatus("error");
      setError(NOT_PDF_MESSAGE);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStatus("error");
      setError(SIZE_LIMIT_MESSAGE);
      return;
    }

    setStatus("processing");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/summarize", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(json.error ?? "요약 생성에 실패했습니다. 잠시 후 다시 시도해주세요");
        return;
      }
      setData(json);
      setStatus("result");
    } catch {
      setStatus("error");
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요");
    }
  }

  function reset() {
    setStatus("idle");
    setData(null);
    setError(null);
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>PDF 요약</h1>

      {status === "idle" && <UploadDropzone onFileSelected={handleFile} />}

      {status === "processing" && <p className={styles.loading}>요약 생성 중...</p>}

      {status === "result" && data && (
        <div>
          <p>{data.summary}</p>
          <ul>
            {data.points.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
          <button onClick={reset}>다른 PDF 요약하기</button>
        </div>
      )}

      {status === "error" && (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <button onClick={reset}>다시 시도</button>
        </div>
      )}
    </main>
  );
}
```

(결과 표시는 Task 7에서 전용 `SummaryResult` 컴포넌트로 다듬는다 — 지금은 흐름이 끝까지 동작하는 것만 확인한다.)

- [ ] **Step 5: 브라우저에서 직접 확인**

```bash
npm run dev
```

`http://localhost:3000`을 브라우저로 열어:
1. `/tmp/pdf-smoke-test.pdf`를 드래그앤드롭으로 업로드 → "요약 생성 중..." 표시 → 결과(요약 문장 + 포인트 목록) 표시 확인
2. 클릭으로 파일 선택해도 동일하게 동작하는지 확인
3. `/tmp/pdf-smoke-test.txt`(PDF 아님)를 업로드해 "PDF 파일만 업로드할 수 있습니다" 에러가 뜨는지 확인
4. 확인 후 `Ctrl+C`로 서버 종료

- [ ] **Step 6: 타입체크·빌드**

Run: `npx tsc --noEmit` → 에러 없음.
Run: `npm run build` → 성공.

- [ ] **Step 7: 커밋**

```bash
git add components/UploadDropzone.tsx components/UploadDropzone.module.css \
  app/page.module.css app/page.tsx
git commit -m "feat: 드래그앤드롭 업로드 UI와 페이지 상태 관리 연결"
```

---

## Task 7: 결과 표시 컴포넌트 + 반응형/접근성 다듬기

**agent:** `frontend-developer`

**Files:**
- Create: `components/SummaryResult.tsx`, `components/SummaryResult.module.css`
- Modify: `app/page.tsx` (Task 6의 인라인 결과 렌더링을 `SummaryResult` 컴포넌트로 교체)
- Modify: `app/page.module.css`, `app/globals.css` (반응형 미세 조정 필요 시)

**Interfaces:**
- Consumes: Task 6의 `Status`/`SummaryData` 상태, `reset` 콜백
- Produces: `SummaryResult` 컴포넌트 — `{ summary: string; points: string[]; onReset: () => void }` props

- [ ] **Step 1: `components/SummaryResult.tsx` 작성**

```tsx
import styles from "./SummaryResult.module.css";

interface Props {
  summary: string;
  points: string[];
  onReset: () => void;
}

export default function SummaryResult({ summary, points, onReset }: Props) {
  return (
    <section className={styles.result} aria-label="요약 결과">
      <p className={styles.summary}>{summary}</p>
      <ul className={styles.points}>
        {points.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
      <button className={styles.resetButton} onClick={onReset}>
        다른 PDF 요약하기
      </button>
    </section>
  );
}
```

- [ ] **Step 2: `components/SummaryResult.module.css` 작성**

```css
.result {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.5;
}

.points {
  list-style: disc;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--text-soft);
}

.resetButton {
  align-self: flex-start;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  border-radius: 8px;
  padding: 10px 18px;
  font-weight: 600;
}

.resetButton:hover {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

@media (max-width: 480px) {
  .result {
    padding: 16px;
  }
  .summary {
    font-size: 1rem;
  }
}
```

- [ ] **Step 3: `app/page.tsx`에서 인라인 결과 렌더링을 컴포넌트로 교체**

`app/page.tsx`의 `{status === "result" && data && ( ... )}` 블록을 아래로 교체한다:

```tsx
import SummaryResult from "@/components/SummaryResult";
```

(상단 import에 위 줄 추가)

```tsx
{status === "result" && data && (
  <SummaryResult summary={data.summary} points={data.points} onReset={reset} />
)}
```

- [ ] **Step 4: 반응형·접근성 확인 (브라우저)**

```bash
npm run dev
```

`http://localhost:3000`에서:
1. 브라우저 창을 모바일 폭(375px 정도)으로 줄여 업로드 영역·결과 영역이 잘리거나 가로 스크롤이 생기지 않는지 확인
2. `Tab` 키만으로 업로드 영역(드롭존)에 포커스가 가고 `Enter`/`Space`로 파일 선택 다이얼로그가 열리는지 확인
3. 결과 화면에서 "다른 PDF 요약하기" 버튼이 키보드 포커스·클릭 모두 동작하는지 확인
4. 확인 후 `Ctrl+C`로 서버 종료

- [ ] **Step 5: 타입체크·빌드**

Run: `npx tsc --noEmit` → 에러 없음.
Run: `npm run build` → 성공.

- [ ] **Step 6: 커밋**

```bash
git add components/SummaryResult.tsx components/SummaryResult.module.css app/page.tsx
git commit -m "feat: 요약 결과 컴포넌트 분리 및 반응형/접근성 다듬기"
```

---

## Task 8: QA — 엣지케이스 검증 및 수정

**agent:** `qa-engineer`

**Files:**
- Modify: 문제 발견 시 관련 파일(`app/api/summarize/route.ts`, `lib/pdf/extract.ts`, `lib/ai/summarize.ts`, `app/page.tsx`, `components/*`)을 직접 수정
- Create: `docs/qa-report-pdf-summary.md` (검증 결과 요약)

**Interfaces:**
- Consumes: Task 1~7에서 만든 전체 앱

각 시나리오를 실행하고, 기대 결과와 다르면 **원인을 찾아 관련 파일을 직접 수정한 뒤 재검증**한다(재검증까지 통과해야 다음 시나리오로 넘어간다). 심각도(Critical/Major/Minor)를 매겨 `docs/qa-report-pdf-summary.md`에 기록한다.

- [ ] **Step 1: 테스트용 파일 준비**

(테스트 PDF는 `cupsfilter`로 생성한다 — `textutil`은 이 macOS에서 pdf 출력을 지원하지 않는다. 영어 텍스트 사용: Global Constraints의 로컬 검증 정책 참고, 한글은 이 Node 버전의 `fetch() file://` 제약으로 로컬에서 깨진다.)

```bash
# 정상 PDF (1페이지, 텍스트 있음) — Task 3에서 이미 생성했다면 재사용
echo "This is a PDF extraction smoke test document for the summary app." > /tmp/pdf-smoke-test.txt
cupsfilter /tmp/pdf-smoke-test.txt > /tmp/pdf-smoke-test.pdf

# 빈 PDF (텍스트 없음)
: > /tmp/pdf-empty.txt
cupsfilter /tmp/pdf-empty.txt > /tmp/pdf-empty.pdf

# 초단문 PDF (한 문장)
echo "Short." > /tmp/pdf-tiny.txt
cupsfilter /tmp/pdf-tiny.txt > /tmp/pdf-tiny.pdf

# PDF가 아닌 파일
echo "not a pdf" > /tmp/not-a-pdf.jpg

# 21페이지 이상 PDF (페이지 제한 초과) — 반복 줄로 다페이지 생성 (python 등 추가 도구 불필요)
for i in $(seq 1 800); do echo "Repeated body text for page-limit testing purposes."; done > /tmp/pdf-long-full.txt
cupsfilter /tmp/pdf-long-full.txt > /tmp/pdf-long.pdf
```

Run: `npm run dev > /tmp/pdf-app-dev.log 2>&1 &` 후 `sleep 3`

- [ ] **Step 2: 시나리오 1 — 정상 경로**

```bash
curl -sS -i -X POST http://localhost:3000/api/summarize -F "file=@/tmp/pdf-smoke-test.pdf"
```
기대: `200`, `summary`(비어있지 않은 문자열)와 `points`(1~5개 배열) 포함.

- [ ] **Step 3: 시나리오 2 — 빈 PDF**

```bash
curl -sS -i -X POST http://localhost:3000/api/summarize -F "file=@/tmp/pdf-empty.pdf"
```
기대: `400`, `{"error":"이 PDF에서 텍스트를 추출할 수 없습니다"}`.

- [ ] **Step 4: 시나리오 3 — PDF가 아닌 파일**

```bash
curl -sS -i -X POST http://localhost:3000/api/summarize -F "file=@/tmp/not-a-pdf.jpg"
```
기대: `400`, `{"error":"PDF 파일만 업로드할 수 있습니다"}`.

- [ ] **Step 5: 시나리오 4 — 초단문 PDF**

```bash
curl -sS -i -X POST http://localhost:3000/api/summarize -F "file=@/tmp/pdf-tiny.pdf"
```
기대: `200`, 짧은 입력에도 에러 없이 `summary`/`points` 반환.

- [ ] **Step 6: 시나리오 5 — 페이지 수 초과**

```bash
curl -sS -i -X POST http://localhost:3000/api/summarize -F "file=@/tmp/pdf-long.pdf"
```
기대: `400`, `{"error":"문서가 너무 큽니다(최대 10MB, 20페이지)"}`. (생성된 PDF가 실제로 20페이지를 넘는지 먼저 확인 — `cupsfilter`는 텍스트량에 따라 페이지를 나눈다. 20페이지가 안 됐다면 반복 횟수를 늘려 다시 생성한다.)

- [ ] **Step 7: 시나리오 6 — 용량 초과**

```bash
head -c 11000000 /dev/urandom | base64 > /tmp/pdf-huge.txt
cupsfilter /tmp/pdf-huge.txt > /tmp/pdf-huge.pdf 2>/dev/null || true
ls -la /tmp/pdf-huge.pdf
curl -sS -i -X POST http://localhost:3000/api/summarize -F "file=@/tmp/pdf-huge.pdf"
```
기대: 생성된 PDF가 10MB를 넘으면 `400`(`SIZE_LIMIT_MESSAGE`). `cupsfilter` 변환 결과가 10MB에 못 미치면, 파일 크기만 검증하는 별도 확인으로 대체: 실제 10MB 초과 더미 파일을 만들어 업로드했을 때 `413` 대신 애플리케이션 레벨 `400`이 오는지 확인한다.

- [ ] **Step 8: 시나리오 7 — 무료 모델 폴백 확인 (로그 기반)**

```bash
grep -i "폴백\|모델 실패" /tmp/pdf-app-dev.log || echo "폴백 로그 없음(1순위 모델이 매번 성공한 것일 수 있음 — AI_DEBUG=1로 재기동해 확인)"
```
1순위 모델이 계속 성공해 폴백 로그가 없다면 Critical로 취급하지 않는다(정상). 다만 전체 무료 모델이 실패하는 상황(예: `OPENROUTER_API_KEY` 오설정)을 흉내내려면 `.env`의 키를 일시적으로 빈 문자열로 바꿔 `500`/`502` 대신 명확한 에러 메시지가 오는지 확인한 뒤 **반드시 원래 키로 되돌린다**.

- [ ] **Step 9: 시나리오 8 — 브라우저 UI 전체 흐름**

`http://localhost:3000`을 열어 위 파일들(`/tmp/pdf-smoke-test.pdf`, `/tmp/not-a-pdf.jpg`, `/tmp/pdf-long.pdf`)을 실제로 드래그앤드롭/클릭 업로드해보며, 각 에러 메시지가 화면에 올바르게 표시되는지, 로딩 상태가 보이는지, "다시 시도"/"다른 PDF 요약하기" 버튼으로 idle 상태로 정상 복귀하는지 확인한다.

- [ ] **Step 10: 발견된 문제 수정 및 재검증**

시나리오 2~9 중 기대와 다른 결과가 나오면:
1. 재현 조건을 정확히 기록
2. 관련 파일(위 Files 목록)에서 원인을 찾아 최소 수정
3. 해당 시나리오를 다시 실행해 통과 확인
4. 통과할 때까지 반복

- [ ] **Step 11: 개발 서버 종료 및 임시 파일 정리**

```bash
kill $DEV_PID
rm -f /tmp/pdf-*.txt /tmp/pdf-*.pdf /tmp/not-a-pdf.jpg /tmp/pdf-app-dev.log
```

- [ ] **Step 12: `docs/qa-report-pdf-summary.md` 작성**

형식: **요약 → 발견한 이슈(심각도순, 수정 여부 포함) → 검증 범위(무엇을 확인했고 무엇은 못했는지)**.

- [ ] **Step 13: 최종 빌드 확인 및 커밋**

Run: `npm run build` → 성공.

```bash
git add -A
git commit -m "test: PDF 요약 앱 엣지케이스 QA 및 수정"
```

---

## 완료 기준

- [ ] Task 1~8 모두 커밋 완료
- [ ] `npm run build`, `npx tsc --noEmit`가 최종 상태에서 에러 없이 통과
- [ ] Task 8의 QA 시나리오 8개가 모두 기대대로 동작(수정 포함)
- [ ] `.env`가 어떤 커밋에도 포함되지 않았음을 `git log --all --full-history -- .env`로 확인(출력 없어야 함)
