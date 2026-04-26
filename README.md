# 소선요가 · 素禪 · So-Seon

요가 강사용 회원 관리 웹앱. React + Vite + Tailwind.

---

## 📱 Vercel 배포 순서 (가장 쉬운 방법)

### 1단계. Anthropic API 키 발급 (5분)

1. https://console.anthropic.com 접속 → 가입
2. 결제 수단 등록 → 소액 충전 (예: $5)
3. 좌측 "API Keys" → "Create Key" → 나온 긴 문자열을 **메모장에 저장**
4. ⚠️ 이 키는 절대 남에게 공유하지 않기

### 2단계. Vercel 계정 만들기 (3분)

1. https://vercel.com 접속 → Sign Up (이메일 or GitHub)
2. 카드 등록 없이 무료 가입 가능

### 3단계. 이 폴더를 Vercel에 드래그 앤 드롭 업로드

1. Vercel 대시보드에서 **"Add New..." → "Project"**
2. **"Browse All Templates"** 무시하고, 페이지 아래로 스크롤
3. **"Import Third-Party Git Repository?"** 근처에 있는 **"..."** 또는 **"Deploy"** 버튼 클릭
4. 이 **soseon-yoga-deploy 폴더 전체**를 압축(.zip)하지 말고, 
   Vercel CLI를 쓰거나, GitHub에 올리는 게 더 쉬워요.

### 🟢 더 쉬운 방법: Vercel CLI 사용

1. 노트북에 Node.js 설치: https://nodejs.org (LTS 버전)
2. 터미널(cmd) 열고:
   ```
   npm install -g vercel
   cd 이폴더경로
   vercel
   ```
3. 물어보는 대로 Enter Enter (기본값 Yes)
4. 배포 완료되면 URL 나옴 (예: `soseon-yoga-abc.vercel.app`)

### 4단계. 환경 변수 등록 (중요!)

배포 후 Vercel 대시보드에서:
1. 배포된 프로젝트 클릭 → **Settings** → **Environment Variables**
2. 아래 추가:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: 1단계에서 받은 API 키 붙여넣기
   - **Environment**: Production, Preview, Development 모두 체크
3. **Save**
4. **Deployments** 탭 → 최신 배포 **재배포** (Redeploy)

### 5단계. 폰 홈화면에 추가

1. 폰 사파리/크롬으로 배포된 URL 열기 (예: `soseon-yoga-xxx.vercel.app`)
2. 공유 버튼 → **"홈 화면에 추가"**
3. 아이콘 생김 ✓ 이제 앱처럼 열림

---

## 🔧 로컬에서 개발/테스트

```bash
npm install
npm run dev
```

http://localhost:5173 에서 열림.

AI 분석 기능을 로컬에서 테스트하려면 `.env.local` 파일 만들기:
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 💡 주의사항

1. **데이터는 브라우저에 저장됨** — 캐시 지우면 날아감. 설정(톱니바퀴) → "내보내기"로 주 1회 백업 추천
2. **AI 분석 비용** — 회원 한 명 분석당 약 50~200원. 한 달 5천원 넘을 일 거의 없음
3. **API 키 유출 금지** — 환경변수에만 저장, 코드에 박지 말기

---

## 📂 폴더 구조

```
soseon-yoga-deploy/
├── src/
│   ├── App.jsx          ← 메인 앱 (약 4,700줄)
│   ├── main.jsx
│   └── index.css
├── api/
│   └── claude.js        ← Vercel Serverless Function (API 프록시)
├── public/
│   ├── manifest.json    ← PWA 매니페스트 (폰 아이콘)
│   ├── icon-192.png
│   └── icon-512.png
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

---

🌿 소선요가 · 素禪 · So-Seon
