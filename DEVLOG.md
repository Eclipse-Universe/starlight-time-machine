# Starlight Time Machine — 개발 로그

> Claude Code와의 협업 기록입니다.  
> 서버 재시작이나 세션이 끊겨도 이 파일을 읽으면 프로젝트 방향을 바로 복기할 수 있습니다.

---

## 2026-04-30 — 프로젝트 초기 구축

**작업자**: Eclipse-Universe  
**커밋**: `5cadbf9`

### 완성된 것
- FastAPI 백엔드 (`app.py`): `/api/stars`, `/api/planets` 두 엔드포인트
- Three.js 기반 3D 인터랙티브 우주 씬
  - 배경 별 8,000개 (ShaderMaterial로 렌더링)
  - 명명된 별 (stars.json 기반, RA/Dec → 3D 좌표 변환, log scale)
  - 태양계 8행성 + 달 + 궤도링 + 토성 고리
  - 별/행성 클릭 시 정보 패널 (fly-to 카메라 애니메이션 포함)
- 별 클릭 패널 내용:
  - 별빛이 출발한 연도 계산 (`CURRENT_YEAR - distance_ly`)
  - 동서양 역사 컨텍스트 텍스트 (연도 구간별 하드코딩)
  - 별의 현재 상태, 운명, 흥미로운 사실
  - 이미 죽었을 가능성 경고 (`possibly_dead` 플래그)
- 행성 클릭 패널: 개요, 주요 통계, 특이한 특징, 탐사 미션
- Railway 배포 (`Procfile`, `railway.toml`)

### 기술 스택
- 백엔드: Python + FastAPI + uvicorn
- 프론트엔드: Vanilla JS + Three.js 0.165.0 (CDN import map)
- 폰트: Space Grotesk, DM Mono (Google Fonts)
- 배포: Railway

---

## 2026-05-01 — 스타일 및 배포 안정화

**커밋**: `0f501a4`

- CSS, JS 소폭 수정 및 배포 환경 안정화

---

## 2026-05-07 — 다음 단계 기획 (Claude Code와 협의)

**상태**: 기획 확정, 미구현

### 추가 기능 방향 (합의된 내용)

#### 기능 1: 지구 클릭 → 인터랙티브 지구본
- 현재 3D 씬에서 Earth 행성을 클릭하면 지구본 뷰로 전환
- Three.js SphereGeometry + 실제 Earth 텍스처
- `topojson` + `d3-geo`로 국가 경계 오버레이 및 클릭 감지
- 도시 검색 또는 지도 핀 드롭으로 관측 위치 선택

#### 기능 2: 위치 기반 실시간 하늘 렌더링
- 선택된 위도/경도 + 현재 UTC 시각 기준
- 각 별의 RA/Dec → Altitude/Azimuth 변환
- 지평선 위 (Alt > 0°) 별만 필터링하여 표시
- 스테레오그래픽 투영 (천정 중심 원형 하늘 지도) 렌더링
- **핵심 라이브러리**: `astronomy-engine` (MIT, JS/Python 모두 지원, 행성 위치 계산 포함)

#### 기능 3: 천체 이미지 자동화 업데이트
- 별/행성 클릭 시 실제 천문 사진 표시
- 이미지 소스 (모두 무료):
  - NASA APOD API (매일 천문 사진)
  - NASA Image Library (별, 성운, 은하)
  - ESA/Hubble ESAC API
  - Aladin Sky Atlas (실제 관측 이미지 임베드)
  - SIMBAD (천체 메타데이터)
- 스케줄러가 API에서 최신 이미지 URL을 가져와 stars.json과 매핑

#### 기능 4: 인프라 자동화
- GitHub Actions (무료, 월 2,000분): 매일 00:00 UTC 실행 → NASA/ESA API 호출 → 데이터 갱신
- Cloudflare R2 (무료 10GB, 무료 egress): 이미지 및 JSON 캐시 저장
- Railway 유지: FastAPI 백엔드 서빙

### 구현 Phase 계획
| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | 지구 클릭 → 3D 지구본 + 국가/도시 선택 UI | **완료** (2026-05-07) |
| Phase 2 | 위치/시간 기반 하늘 계산 + 스테레오그래픽 렌더링 | 미시작 |
| Phase 3 | NASA/ESA 이미지 연동 + 별 클릭 시 실제 사진 표시 | 미시작 |
| Phase 4 | GitHub Actions 자동화 + Cloudflare R2 연동 | 미시작 |

### Phase 1 구현 상세 (2026-05-07)

**변경 파일**: `static/index.html`, `static/css/style.css`, `static/js/main.js`

**동작 방식**:
1. 3D 씬에서 Earth 행성 클릭 → `enterGlobeMode()` 호출
2. 기존 씬 전체 숨김 (`scene.traverse` + `_wasVisible` 스냅샷)
3. NASA 텍스처 로드 (`earth_atmos_2048.jpg` via jsdelivr CDN)
4. Three.js SphereGeometry 위에 텍스처 + 국가 경계선 그리기
   - 국가 경계 데이터: `world-atlas@2/countries-110m.json` (TopoJSON, CDN)
   - TopoJSON arc delta-decoding 직접 구현 (외부 라이브러리 없이)
   - 경계선은 globeEarth의 child로 추가 → 카메라 orbit 시 자동 따라감
5. 지구본 클릭 → `globeEarth.worldToLocal()` → `vec3ToGeo()` → lat/lon 추출
6. Nominatim (OpenStreetMap) reverse geocoding API로 국가/도시명 표시
7. 핀 마커 (빨간 구체 + glow sprite) globeEarth child로 추가
8. "← 태양계로" 버튼 → `exitGlobeMode()` → 씬 복원 + 카메라 플라이백
9. "이 위치에서 하늘 보기" 버튼 → Phase 2 stub (안내 메시지 표시)

**좌표계**:
- `geoToVec3(lon, lat, r)`: Three.js SphereGeometry UV와 일치하는 공식 사용
- `vec3ToGeo(point)`: worldToLocal 후 적용 → rotation.y 자동 보정됨
- globeEarth.rotation.y = Math.PI/2 → 초기 뷰에 유럽/아프리카 정면

**추가된 UI 요소**:
- `#globe-panel`: 왼쪽 슬라이드 패널 (위치 선택, 관측 버튼)
- `#globe-hint-overlay`: 하단 조작 안내 텍스트

### 비용 분석 (월 기준)
| 항목 | 비용 |
|------|------|
| Railway (기존) | ~$5/mo |
| Cloudflare R2 | $0 (10GB 무료) |
| GitHub Actions | $0 (무료 2,000분/월) |
| NASA/ESA API | $0 |
| **합계** | **~$5/mo** |

> AWS Lambda + S3 + EventBridge 조합과 비교 시: Free Tier 1년 후 $8-12/mo로 오히려 불리. 이 규모에서는 GitHub Actions + Cloudflare가 압도적으로 유리함.

---

## 작업 규칙 (Claude Code와 합의)

- 새로운 기능을 기획하거나 구현 방향이 결정되면 이 파일에 날짜별로 기록
- Phase가 완료되면 해당 항목 상태를 `완료`로 업데이트 후 커밋
- 서버 재시작 또는 새 세션 시작 시 이 파일을 먼저 읽어 컨텍스트 복구
