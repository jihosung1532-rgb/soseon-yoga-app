=========================================
소선요가 강사 앱 - STUDIO 아이콘 적용 가이드
=========================================

이 zip 안에:
- index.html → GitHub root에 덮어쓰기
- public/ 폴더 6개 파일 → public 폴더에 업로드

=========================================
업로드 순서 (soseon-yoga-app 저장소)
=========================================

[Step 1] public 폴더 확인
- 이미 있으면 그냥 그 안에 파일만 업로드
- 없으면 "Add file → Create new file" → "public/.gitkeep"

[Step 2] public 폴더에 6개 업로드
- icon-192.png
- icon-512.png
- icon-96.png
- apple-touch-icon.png
- favicon.png
- manifest.json
→ "Add file → Upload files" → 끌어다 놓기 → Commit

[Step 3] index.html 덮어쓰기
- 저장소 root → index.html → ✏️ Edit
- 전체 삭제 → 새 내용 복붙 → Commit

[Step 4] Vercel 자동 재배포 (1~2분)

[Step 5] 폰에서 테스트
- 기존 홈 화면 바로가기 삭제
- soseon-yoga.vercel.app 새로고침
- 홈 화면에 추가
- "소선 STUDIO" 아이콘 확인 ✓

================================
※ 회원 앱이랑 헷갈리지 마세요!
- 강사 앱 = soseon-yoga-app (이 패키지 ← 차콜)
- 회원 앱 = soseon-yoga-member (다른 zip ← 아이보리)
================================
