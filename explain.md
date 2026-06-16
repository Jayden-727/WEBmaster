# AttractiveWebAI (WEBmaster) 프로젝트 분석 보고서

이 문서는 **AttractiveWebAI** 프로젝트의 현재 구성과 핵심 기능, 그리고 데이터베이스 및 내부 워크플로우 아키텍처를 점검하여, 향후 신규 기능 추가 및 업데이트 작업을 원활하게 진행할 수 있도록 정리한 분석 보고서입니다.

---

## 1. 프로젝트 개요 (Overview)

AttractiveWebAI는 하나의 URL을 입력받아 해당 웹페이지의 **메타데이터, 기술 스택(Framework/CMS/Analytics/CDN 등), UI 구조(컴포넌트), 링크 및 이미지 정보, Lighthouse 성능 점수**를 종합적으로 분석하고 시각화해 주는 웹 인텔리전스 대시보드 도구입니다.

또한 단일 페이지 분석을 넘어 특정 도메인 전체를 재귀적으로 탐색하는 **DeepAnalyzer(다중 페이지 크롤러 및 분석)** 기능을 제공하여 전체 사이트 인벤토리 구축과 구조화된 Markdown/JSON 데이터 추출이 가능합니다.

---

## 2. 프로젝트 디렉토리 구조 (Project Structure)

```text
WEBmaster/
├── docs/                           # 기존 설계 및 아키텍처 문서
│   ├── architecture.md             # 시스템 아키텍처 명세
│   └── implementation-plan.md      # MVP 구현 단계 계획
├── supabase/                       # Supabase 설정 및 스키마 마이그레이션
│   └── migrations/
│       ├── 20260325190000_init_pageintel.sql      # 단일 페이지 분석 테이블 구성
│       ├── 20260326180000_deep_analysis_tables.sql # Deep Job 및 Deep Page 테이블 구성
│       └── 20260327120000_add_crawl_strategy.sql   # 크롤링 전략 속성 추가
├── src/
│   ├── app/                        # Next.js App Router (페이지 및 API 엔드포인트)
│   │   ├── (marketing)/            # 랜딩 페이지 및 기본 소개 레이아웃
│   │   ├── login/                  # 로그인을 위한 엔드포인트
│   │   ├── dashboard/              # 메인 대시보드 (분석 요청 폼 및 최근 이력)
│   │   ├── analysis/[id]/          # 단일 페이지 상세 분석 대시보드
│   │   ├── deep-analysis/[jobId]/  # 다중 페이지 분석 대시보드 (실시간 상태 폴링 및 인벤토리 뷰어)
│   │   ├── history/                # 분석 히스토리 조회 페이지
│   │   ├── api/
│   │   │   ├── analyze/            # 단일 페이지 분석 API (POST)
│   │   │   ├── analyses/           # 단일 분석 목록 조회 및 이력 삭제/수정 (GET/DELETE)
│   │   │   ├── deep-analyze/       # 실시간 NDJSON 스트리밍 사이트 크롤링 API (POST)
│   │   │   └── deep-analyzer/
│   │   │       └── jobs/
│   │   │           ├── route.ts    # Deep Job 생성 및 목록 조회 (POST/GET)
│   │   │           └── [id]/
│   │   │               ├── route.ts # Deep Job 개별 상태 조회 (GET)
│   │   │               └── run-batch/route.ts # 서버리스 타임아웃 방지용 분할 크롤링 실행 API (POST)
│   │   ├── globals.css             # 글로벌 스타일 및 Tailwind CSS 설정
│   │   └── layout.tsx              # 전역 레이아웃
│   ├── components/                 # 공통 및 페이지별 UI 컴포넌트
│   │   ├── landing/                # 랜딩 페이지 전용 컴포넌트 (Hero, Nav 등)
│   │   ├── dashboard/              # 대시보드 폼 (AnalyzeForm, DeepAnalyzerForm, RecentAnalyses)
│   │   ├── analysis/               # 상세 분석 시각화 컴포넌트 (AnalysisDetail 등)
│   │   ├── ui/                     # 재사용 가능한 원자 단위 UI 컴포넌트
│   │   ├── language-switcher.tsx   # 다국어(영어/한국어) 스위처
│   │   └── providers.tsx           # Context Providers
│   ├── lib/                        # 비즈니스 로직 및 외부 유틸리티 서비스
│   │   ├── crawler/                # HTML 텍스트 다운로더 (fetch-html)
│   │   ├── deep-analyzer/          # Deep 크롤링 핵심 엔진
│   │   │   ├── batch-runner.ts     # 개별 배치 단위의 탐색/크롤러 루프
│   │   │   ├── content-checker.ts  # 페이지 콘텐츠 적절성 및 완성도 점수 채점
│   │   │   ├── export-service.ts   # 크롤링 결과 JSON/CSV/Markdown 내보내기 서비스
│   │   │   ├── job-service.ts      # Supabase DB 상의 Job/Page CRUD 추상화
│   │   │   ├── markdown-generator.ts # 크롤링한 원본 콘텐츠의 마크다운 빌더
│   │   │   ├── page-renderer.ts    # Playwright 기반 Headless 브라우저 렌더링 및 동적 오버레이 제거
│   │   │   ├── page-type-detector.ts # 메타데이터, 제목, 헤더 분석 기반 페이지 유형 분류 (Home, Product 등)
│   │   │   ├── raw-extractor.ts    # cheerio 활용 링크, 이미지, 텍스트, 메타데이터 정보 정규화 및 가공
│   │   │   ├── site-crawler.ts     # 순수 HTML 기반 재귀 비동기 크롤러 제너레이터
│   │   │   └── smart-fetcher.ts    # 크롤링 전략(fetch vs strong)에 맞춘 유연한 DOM Fetch 및 렌더링 폴백
│   │   ├── i18n/                   # 다국어 처리 패키지 (en/ko Locale 사전 파일)
│   │   ├── lighthouse/             # 로컬 Chrome 구동 방식 및 PageSpeed API 방식 결합 Lighthouse 분석기
│   │   ├── parser/                 # cheerio 기반 단일 페이지 메타데이터/텍스트/링크 추출기
│   │   ├── services/               # 단일 분석 파이프라인 관리 (analyze-page, persist-analysis)
│   │   ├── stack-detection/        # 정적 태그 분석 및 시그니처 매칭 기반 기술 스택 식별 엔진
│   │   ├── structure-detection/    # HTML 시맨틱 태그 및 셀렉터 분석을 통한 UI 레이아웃 분석기
│   │   ├── supabase/               # Supabase 서버 사이드용 클라이언트 이니셜라이저
│   │   └── utils/                  # 공통 유틸 함수 (URL 검증, 타임아웃 등)
│   └── types/                      # TypeScript 인터페이스 모음
│       ├── analysis.ts             # 단일 페이지 분석 응답 타입
│       ├── database.ts             # Supabase 데이터베이스 매핑 타입
│       └── deep-analysis.ts        # Deep Analyzer Job 및 Page 관련 타입
```

---

## 3. 핵심 기능 설명 (Core Features)

### 3.1 단일 페이지 분석 파이프라인 (`src/lib/services/analyze-page.ts`)
1. **HTML Fetch**: 타겟 URL의 HTML 데이터를 다운로드합니다.
2. **Metadata Extraction**: `<title>`, `<meta name="description">`, Open Graph 태그 (`og:image` 등), Canonical URL, Robots 설정, `application/ld+json` 구조화 데이터를 파싱합니다.
3. **Content Extraction**: `script`, `style`, `noscript` 등의 비텍스트 요소를 배제한 후 본문 텍스트를 추출하고, Turndown 라이브러리를 사용해 마크다운 포맷으로 가공합니다.
4. **Links & Images Catalog**: 페이지 내 존재하는 모든 하이퍼링크(내부/외부 여부 판단)와 이미지 경로(대체 텍스트 설정 여부, lazy-loading 설정 여부)를 매핑합니다.
5. **Stack Heuristics (기술 스택 식별)**: 약 120개 이상의 패턴 매칭 시그니처(`src/lib/stack-detection/detect-stack.ts`)를 돌려 Next.js, React, Shopify, HubSpot, Google Analytics 등의 탑재 기술과 신뢰도 점수를 측정합니다.
6. **Structure Heuristics (구조 분석)**: header, footer, hero, CTA 버튼, FAQ, tabs, product_gallery, reviews, newsletter 등의 UI 구조 컴포넌트 사용 빈도를 파싱합니다.
7. **Lighthouse Score Audit**: 로컬 Headless Chrome 구동을 1차 시도하고, 인프라 제한(예: Vercel Serverless 등)으로 실패할 경우 Google PageSpeed Insights API를 Fallback으로 삼아 Core Web Vitals 및 카테고리별 성능 점수(Performance, SEO, Accessibility, Best Practices)를 수집합니다.
8. **DB Persistence**: 수집한 상세 분석 모델을 Supabase DB의 개별 테이블에 저장합니다.

### 3.2 DeepAnalyzer (다중 페이지 사이트 크롤러)
- **NDJSON Stream API (`/api/deep-analyze`)**: 실시간 크롤링 이벤트를 브라우저로 끊김 없이 스트리밍 전송합니다.
- **배치형 분 분할 크롤링 루프 (`/api/deep-analyzer/jobs/[id]/run-batch`)**: 
  - Vercel 등 클라우드 서버리스 환경의 60초 타임아웃 제한을 해결하기 위한 구조입니다.
  - 브라우저는 3초 간격으로 `run-batch` 엔드포인트를 호출하여 대기열(`queue_json`)에서 페이지를 배치 단위로 꺼내 크롤링을 수행합니다.
  - 실행 후 남은 대기열과 방문 기록(`visited_json`)은 Supabase DB에 적재되고, 작업 상태가 `paused` 혹은 `completed`로 갱신됩니다.
- **Smart Fetcher (`src/lib/deep-analyzer/smart-fetcher.ts`)**:
  - `fetch` 전략: 빠른 성능을 위해 순수 HTTP fetch만 수행하여 가공합니다.
  - `strong` 전략: HTTP fetch 후 콘텐츠 점수(`content_score`)를 평가해, SPA(Single Page Application) 쉘만 존재한다고 판단되면 Playwright 브라우저를 통해 풀 렌더링(Cookie Banner 동적 해제 및 Fixed 오버레이 배너 강제 제거 포함)을 실행하는 하이브리드 전략을 취합니다.
- **Page Type Detector (`src/lib/deep-analyzer/page-type-detector.ts`)**: 수집된 텍스트와 제목, URI 패턴을 보고 해당 페이지가 `homepage`, `category`, `product`, `article`, `contact`, `login` 인지 분류합니다.

### 3.3 다국어 지원 (i18n)
- `src/lib/i18n` 디렉토리 하위의 `en.json`, `ko.json` 사전 파일에 기반하여 작동합니다.
- 클라이언트 단의 `I18nProvider`를 통해 브라우저 로컬 저장소와 동기화되며, `useT()`, `useI18n()` 훅을 사용하여 전체 UI의 동적 한/영 변환을 지원합니다.

---

## 4. 데이터베이스 설계 (Database Schema)

Supabase PostgreSQL 스키마 및 마이그레이션 이력은 아래와 같이 정규화되어 설계되었습니다.

### 4.1 단일 페이지 분석 연관 테이블 (`supabase/migrations/20260325190000_init_pageintel.sql`)
- `analyses`: 마스터 분석 레코드 (URL, 상태, 생성시간 등)
- `analysis_metadata`: 메타데이터 (Title, Description, Canonical, OG 태그, robots, JSON-LD 등)
- `analysis_content`: 페이지 콘텐츠 (raw HTML, rendered HTML, cleanText, markdownText)
- `analysis_stack`: 감지된 프레임워크/플랫폼 정보 및 신뢰도
- `analysis_structure`: 레이아웃 섹션 및 UI 컴포넌트 정보
- `analysis_links`: 수집된 내부/외부 하이퍼링크 매핑 목록
- `analysis_images`: 이미지 소스 경로, Alt 설명문 유무, Lazy-loading 플래그
- `analysis_lighthouse`: 웹 성능 코어 매트릭 (FCP, LCP, CLS, TBT, INP) 및 원본 JSON 데이터

### 4.2 DeepAnalyzer 연관 테이블 (`supabase/migrations/20260326180000_deep_analysis_tables.sql` & `20260327120000_add_crawl_strategy.sql`)
- `deep_jobs`: 다중 페이지 탐색 작업을 추적하기 위한 마스터 잡 테이블
  - `queue_json` / `visited_json`을 보관하여 배치 단위 재시작 지원
  - `crawl_strategy` (`fetch` 또는 `strong`) 탑재
- `deep_pages`: 개별 탐색된 서브페이지들의 분석 요약 정보 테이블
  - 감지된 기술 스택(`detected_tech`), 헤더 계층 구조(`raw_headings`), 텍스트 프리뷰, 콘텐츠 품질 점수(`content_score`) 보관
  - Row Level Security(RLS) 및 anon 대상의 Select/Insert/Update 정책이 정책 선언을 통해 구현되어 있습니다.

---

## 5. 핵심 서비스의 요청 흐름 (Workflow)

```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자 브라우저
    participant API as Next.js API (/api/analyze)
    participant Service as analyze-page Service
    participant Crawler as fetch-html / Playwright
    participant Parser as Parsing Heuristics
    participant LH as Lighthouse Module (Local/PageSpeed)
    database DB as Supabase DB

    User->>API: URL 및 분석 모드 전달 (POST)
    API->>Service: 파라미터 전달 및 프로세스 오케스트레이션 위임
    Service->>Crawler: 원본 HTML 다운로드 요청
    Crawler-->>Service: raw HTML 데이터 반환
    opt HTML 파싱 진행 (성공 시)
        Service->>Parser: Metadata, Content, Links, Stack, Structure 파싱 수행
        Parser-->>Service: 정규화된 정보 구조화 세트 반환
    end
    Service->>LH: Lighthouse 성능 진단 실행
    LH-->>Service: 성능 지표 & 개선 아이템 리스트 반환
    Service->>DB: DB Persistence 트랜잭션 전송 및 영속화
    DB-->>Service: 저장 상태 확인
    Service-->>API: 종합 분석 ID 반환
    API-->>User: 결과 페이지로 리디렉션 응답 (/analysis/[id])
```

---

## 6. 추가 기능 개발 전 점검 및 고려사항 (Developer Checklist)

1. **Supabase API 키 설정 및 환경 변수**:
   - 로컬 작업 및 히스토리 영속화를 활성화하려면 `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL` 및 `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 제대로 등록해야 합니다. (이 키들이 누락되면 에러가 표시되거나 폴백 상태로만 메모리 작동합니다.)
2. **Playwright 의존성 및 Lighthouse Chrome 브라우저 설치**:
   - `strong` 크롤링 전략(페이지 렌더링)과 로컬 Lighthouse 분석을 구동하려면 로컬 개발 머신 혹은 빌드 머신에 Chrome/Chromium 바이너리가 제공되어야 합니다. 배포 환경(예: Vercel Serverless)에서는 Playwright 구동이 불가능할 수 있으므로, 반드시 PageSpeed API fallback이 매끄럽게 동작하는지 테스트해야 합니다.
3. **i18n 신규 라벨 바인딩 규칙**:
   - 대시보드나 상세 분석 페이지 등에 새로운 라벨, 컴포넌트 텍스트를 추가할 때는 하드코딩하지 말고 `src/lib/i18n/locales` 하위의 `en.json`과 `ko.json`에 동시에 번역 키를 기입한 다음 `useT()`를 통해 로드해야 번역 깨짐 문제를 방지할 수 있습니다.
4. **서버리스 60초 타임아웃 우회 설계 엄수**:
   - 크롤링 등 시간이 많이 걸릴 수 있는 새로운 백엔드 API를 개발할 때는 하나의 요청에서 한 번에 완료하려 하지 말고, 기존의 `run-batch` 엔드포인트와 같이 클라이언트가 상태를 받아 루프를 도는 다단계 요청 구조를 지향해야 안전하게 배포할 수 있습니다.
