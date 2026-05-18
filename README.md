# FITMATCH

OOTD 한 장으로 너랑 가장 패션 취향이 닮은 K-pop 아이돌을 찾아주는 모바일-퍼스트 웹앱.

데이터 파이프라인(아이돌별 15스타일 분포 DB)은 별도 프로젝트에서 미리 빌드해서 `data/`로 들어와 있고, 이 레포는 그 데이터 위에서 동작하는 프론트 + API.

## 흐름

```
사용자 → 업로드 화면 → 분석 로딩 → 결과 화면 → 공유 모달
                    │
                    ├── POST /api/analyze   (Claude Vision → 15스타일 분포)
                    └── POST /api/match     (분포 → 코사인 유사도 → 매칭 1+2+3위)
                                          │
                                          └── POST /api/results → 공유 가능한 /result/[id] 발급
```

## 기술 스택

- Next.js 14 (App Router) · React 18 · TypeScript
- Anthropic Claude Vision (`claude-sonnet-4-5`) — 서버사이드 호출만
- 데이터: 정적 JSON (`data/idol_style_ranking.json`, `data/items_with_style.json`)
- 공유 카드: `html2canvas` + Web Share API
- 클라이언트 이미지 압축: `browser-image-compression`
- 배포: Vercel

## 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.local.example .env.local
# .env.local 열어서 ANTHROPIC_API_KEY 채우기
```

| 변수 | 필수 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Vision 분석. [console.anthropic.com](https://console.anthropic.com)에서 발급. |

> **셸이 빈 `ANTHROPIC_API_KEY=`를 export 해둔 경우**, Next.js의 `.env.local` 로드가 무시됨. 한 번 `unset ANTHROPIC_API_KEY` 후 `npm run dev`.

### 3. 개발 서버

```bash
npm run dev
# http://localhost:3000
```

### 4. 프로덕션 빌드 확인

```bash
npm run build
npm run start
```

## 데이터

이 레포에는 분석에 필요한 데이터가 그대로 들어 있어 추가 시드/마이그레이션 없이 동작한다.

| 파일 | 내용 |
|---|---|
| `data/idol_style_ranking.json` | 아이돌별 15스타일 분포 + primary/secondary (116명) |
| `data/items_with_style.json` | 아이템별 raw 데이터 + 이미지 URL (439건) |
| `data/musinsa_styles.yaml` | 15스타일 사전 (참조용) |

매칭에서 의미 있는 후보는 `total_items ≥ 5`인 **31명** (나머지는 데이터 부족으로 제외). `/api/match` 요청에 `minItems`로 조정 가능.

## API

### `POST /api/analyze`

이미지 → 15스타일 분포.

```
multipart/form-data: image=<file>
또는
application/json:    { "imageBase64": "...", "mediaType": "image/jpeg" }

응답: { "distribution": {...}, "dominant_style": "...", "confidence": 0.0~1.0, "brief_analysis": "..." }

레이트 리밋: 5 / 분 / IP
이미지 cap:  8 MB
```

### `POST /api/match`

분포 → 매칭 결과.

```
{ "distribution": { "스타일": 0.x, ... }, "topK"?: 3, "minItems"?: 5 }

응답: { "user_distribution": {...}, "matches": [...], "considered": <number> }

레이트 리밋: 30 / 분 / IP
```

### `POST /api/results`

결과 저장 → 공유 가능한 id 발급. (24시간 TTL · 인메모리)

### `GET /api/results/:id`

저장된 결과 조회.

## 보안 & 프라이버시

- API 키는 서버사이드(`vision.ts`)에서만 사용. 클라이언트 번들에 포함되지 않음.
- 업로드 사진은 분석 후 즉시 폐기 (디스크 저장 없음).
- 레이트 리밋 IP별 적용.
- 보안 헤더: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, `Referrer-Policy`.

## Vercel 배포

### 1. GitHub 레포 생성

```bash
# 이 레포 루트에서
gh repo create idol-fashion-web --public --source=. --remote=origin --push
```

`gh` CLI가 없으면 [github.com/new](https://github.com/new)에서 만들고 원격 추가:

```bash
git remote add origin https://github.com/<유저명>/idol-fashion-web.git
git push -u origin main
```

### 2. Vercel 프로젝트 import

1. [vercel.com/new](https://vercel.com/new) 접속
2. 방금 만든 GitHub 레포 import
3. Framework Preset: **Next.js** 자동 감지
4. Build settings 그대로

### 3. 환경 변수 등록

Project Settings → Environment Variables:

| Name | Value | Environments |
|---|---|---|
| `ANTHROPIC_API_KEY` | (Anthropic 콘솔에서 발급한 키) | Production, Preview, Development |

### 4. 배포

import 직후 자동 배포. 이후엔 `main` push 시 자동 재배포.

배포 URL: `https://<프로젝트명>-<유저>.vercel.app`

## 운영 시 알아둘 점

- **인메모리 캐시의 한계**: `/api/results`의 결과 저장은 Vercel 인스턴스가 잠들면 (보통 5–15분 무트래픽 시) 리셋. 친구 공유 수준엔 충분, 영구 공유가 필요하면 [Vercel KV](https://vercel.com/docs/storage/vercel-kv)로 `src/lib/result-store.ts` 교체. 인터페이스는 동일.
- **레이트 리밋도 인메모리**: Vercel이 인스턴스를 여러 개로 늘리면 인스턴스마다 별도 카운터. 트래픽이 늘면 Upstash Redis 같은 외부 store로 옮기는 게 정석.
- **Vision 비용**: 호출당 약 $0.01 (1600px JPEG, 보통 출력). 분당 5회 × IP 제한으로 보호.

## 구조

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/         POST → Vision
│   │   ├── match/           POST → cosine matching
│   │   └── results/         POST 저장 + [id]/GET 조회
│   ├── result/[id]/page.tsx 공유된 결과 페이지 (SSR)
│   ├── layout.tsx           메타 + 글로벌 폰트
│   ├── globals.css          디자인 토큰 + 키프레임
│   └── page.tsx             FitMatchApp 진입
├── components/fitmatch/
│   ├── FitMatchApp.jsx      화면 state machine + API 연결
│   ├── SharedResultView.jsx 읽기 전용 공유 결과 뷰
│   ├── screen-upload.jsx
│   ├── screen-analyzing.jsx
│   ├── screen-result.jsx
│   ├── screen-share.jsx
│   └── ui.jsx               COLORS · 공통 컴포넌트
└── lib/
    ├── vision.ts            Claude SDK 래퍼
    ├── matching.ts          코사인 + DB 로딩
    ├── styles.ts            15스타일 타입
    ├── result-store.ts      인메모리 결과 캐시
    └── rate-limit.ts        IP 기반 카운터

data/
├── idol_style_ranking.json
├── items_with_style.json
└── musinsa_styles.yaml
```

## 라이선스

내부 프로젝트.
