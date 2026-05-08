# Starlight Time Machine — Claude Code 컨텍스트

> 이 파일은 새 세션이나 다른 머신에서 Claude Code를 열었을 때 자동으로 읽힙니다.
> 자세한 구현 히스토리는 `DEVLOG.md`를 참조하세요.

## 프로젝트 개요

별빛이 지구에 도달하는 시간을 3D로 시각화하는 인터랙티브 우주 탐험 웹사이트.
핵심 컨셉: "이 별빛이 출발했을 때 지구에서는 어떤 일이 있었나"

## 기술 스택

- **백엔드**: Python + FastAPI + uvicorn
- **프론트엔드**: Vanilla JS + Three.js 0.165 (ES module, CDN import map)
- **배포**: Railway (GitHub push → 자동 배포)
- **자동화**: GitHub Actions (매일 UTC 01:05 APOD 갱신)
- **폰트**: Space Grotesk, DM Mono (Google Fonts)

## 구현 완료 상태 (2026-05-08 기준)

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 지구 클릭 → 3D 지구본 + 국가/도시 선택 | ✅ 완료 |
| 2 | 위치/시간 기반 실시간 하늘 렌더링 (AltAz 계산) | ✅ 완료 |
| 3 | 별 클릭 시 DSS2 실제 망원경 이미지 표시 | ✅ 완료 |
| 4 | GitHub Actions APOD 자동화 | ✅ 완료 |
| 5 | 별 2,866개 카탈로그 + 별자리 선 + 행성 실시간 위치 | ✅ 완료 |
| 6 | 모바일 반응형 — Bottom Sheet + 터치 컨트롤 | ✅ 완료 |
| 9 | Messier 110 딥 스카이 오브젝트 — 심볼/패널/NASA 이미지 | ✅ 완료 |

## 주요 파일 구조

```
app.py                  FastAPI 백엔드 (모든 /api/* 엔드포인트)
data/
  stars.json            명명된 별 ~38개 (RA, Dec, 분광형, 거리, 역사 데이터)
  planets.json          태양계 행성 상세 정보
  bright_stars.json     HYG v4.1 별 2,866개 (mag ≤ 5.5)
  constellations.json   IAU 별자리 선 150개
  messier.json          Messier 110개 딥 스카이 오브젝트
  apod.json             GitHub Actions가 매일 갱신하는 NASA APOD
static/
  index.html            단일 페이지 HTML
  css/style.css         전체 스타일 (다크 테마, CSS 변수 기반)
  js/main.js            Three.js 3D 씬 + 모든 인터랙션 로직
  js/skyview.js         천문 계산 모듈 (GMST→LST→AltAz) + 2D Canvas 렌더링
scripts/
  update_apod.py        GitHub Actions용 APOD 갱신 스크립트
  generate_messier.py   Messier 카탈로그 생성 스크립트
.github/workflows/
  update-apod.yml       매일 자동 실행 워크플로우 (GitHub 수동 업로드 필요)
DEVLOG.md               날짜별 기획 및 구현 상세 기록
```

## 수익화 체크리스트 현황

- ✅ 별 200개 이상 (2,866개 + Messier 110개)
- ✅ 행성 실시간 위치
- ✅ 별자리 선
- ✅ 모바일 반응형
- ⬜ 월 방문자 500명 이상

## 다음 우선순위 작업 (미구현)

### 콘텐츠 확장 (방문자 유입)
1. **시간 여행 모드** — 날짜/시간 슬라이더로 과거·미래 하늘 시뮬레이션 (브랜드 핵심)
2. **천문 이벤트 캘린더** — 유성우·월식·행성 합 예고, GitHub Actions로 자동 갱신
3. **오늘의 관측 가이드** — 위치 기반 "지금 이 시각 가장 잘 보이는 10개 오브젝트"

### 바이럴·재방문 유도
4. **스카이 스냅샷 공유** — 내 위치 하늘 이미지를 SNS에 공유
5. **관측 일지** — 본 오브젝트 체크리스트 (localStorage, 백엔드 불필요)

### 인프라
6. **Google Analytics** — 방문자 수 측정 (수익화 조건 확인용)
7. **NGC 밝은 오브젝트** — Messier 이후 다음 딥 스카이 확장

## 수익화 조건 (달성 시 사용자에게 알림)

아래 조건을 **모두** 만족하면 수익화 시도 적기:
- [ ] 별 200개 이상 (명칭 있는 별 기준)
- [ ] 행성 실시간 위치 작동
- [ ] 별자리 선 표시
- [ ] 모바일에서 정상 동작
- [ ] 월 방문자 500명 이상 (Google Analytics 등 확인)

## 개발 규칙

- 새 기능 기획/완료 시 `DEVLOG.md`에 날짜 섹션 추가 후 커밋
- 커밋 메시지: `feat:` / `fix:` / `chore:` / `docs:` 접두어 사용
- 수익화 조건 체크리스트는 이 파일에서 관리

## 로컬 개발 실행

```bash
pip install fastapi uvicorn
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
# http://localhost:8000
```
