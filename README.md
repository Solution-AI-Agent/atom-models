# Atom Models

LLM 모델 비교 및 최적화 플랫폼. 55개 이상의 LLM 모델을 비교하고, 산업별 최적 모델을 추천받고, 비용과 인프라 요구사항을 한눈에 파악할 수 있다.

## 주요 기능

- **모델 탐색** - 55개 LLM 모델을 프로바이더, 티어, 가격별로 필터링/정렬
- **모델 비교** - 최대 4개 모델을 나란히 비교 (스펙, 벤치마크, 가격)
- **산업별 추천** - 12개 프리셋으로 산업/용도에 맞는 모델 추천
- **인프라 조회** - GPU 레퍼런스 및 셀프호스팅 요구사항 확인
- **모델 상세** - 벤치마크 차트, 다국어 점수, 인프라 스펙

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router, Server Components) |
| 데이터베이스 | MongoDB + Mongoose |
| UI | shadcn/ui (New York 스타일, Zinc 테마) |
| 차트 | Recharts |
| 스타일 | Tailwind CSS v4 |
| 테스트 | Jest + React Testing Library + Playwright |
| 배포 | Docker (멀티스테이지 빌드) |

## 시작하기

### 사전 요구사항

- Node.js 20+
- MongoDB (로컬 또는 원격)

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local에 MONGODB_URI 설정
# 예: MONGODB_URI=mongodb://user:pass@localhost:27017/atom-models?authSource=admin

# 시드 데이터 삽입
npm run seed

# 개발 서버 실행
npm run dev
```

http://localhost:3000 에서 확인 가능.

### Docker 배포

```bash
# docker-compose로 실행
MONGODB_URI="mongodb://user:pass@host:27017/atom-models?authSource=admin" \
  docker compose up -d
```

Dockge에서 사용 시 `docker-compose.yml`의 `environment`에 `MONGODB_URI`를 설정하면 된다.

포트 매핑: `3100:3000` (호스트:컨테이너)

## 프로젝트 구조

```
src/
  app/                    # Next.js App Router 페이지
    explore/              # 모델 탐색 (목록 + 상세)
    compare/              # 모델 비교
    recommendations/      # 산업별 추천
    infra/                # GPU/인프라 조회
    api/                  # API 라우트
  components/             # React 컴포넌트
    ui/                   # shadcn/ui 공통 컴포넌트
    home/                 # 홈페이지 섹션
    explore/              # 탐색 관련
    compare/              # 비교 관련
    recommendations/      # 추천 관련
    infra/                # 인프라 관련
    layout/               # 사이드바 레이아웃
  lib/
    db/                   # MongoDB 연결 및 Mongoose 모델
    services/             # 서비스 레이어 (비즈니스 로직)
    types/                # TypeScript 타입 정의
    utils/                # 유틸리티 함수
    constants/            # 상수
    context/              # React Context (CompareContext)
data/                     # 시드 데이터 (JSON)
scripts/                  # 시드 스크립트
docs/                     # 설계 문서, 회고록
```

## 사용 가능한 스크립트

```bash
npm run dev           # 개발 서버
npm run build         # 프로덕션 빌드
npm run start         # 프로덕션 서버
npm run seed          # 시드 데이터 삽입 (upsert)
npm run seed:force    # 시드 데이터 강제 초기화
npm run test          # 단위/통합 테스트
npm run test:coverage # 커버리지 리포트
npm run test:e2e      # Playwright E2E 테스트
```

## 모델 데이터

55개 모델, 13개 프로바이더:

| 프로바이더 | 모델 수 | 대표 모델 |
|-----------|---------|----------|
| OpenAI | 12 | GPT-5.4, GPT-4.1, o4-mini |
| Google | 8 | Gemini 3.1 Pro, Gemini 3 Flash |
| Anthropic | 6 | Claude Opus 4.6, Sonnet 4.6 |
| Meta | 5 | Llama 4 Behemoth, Maverick |
| Alibaba | 5 | Qwen 3.5 72B, Qwen 3 235B |
| Mistral | 4 | Mistral Large 3 |
| xAI | 4 | Grok 4.1 |
| DeepSeek | 3 | DeepSeek V3.2, R1 |
| 기타 | 8 | Cohere, Amazon, Microsoft 등 |

데이터 갱신: `data/models.json` 수정 후 `npm run seed` 실행.

## 라이선스

MIT
