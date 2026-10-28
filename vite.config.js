import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: https://<계정>.github.io/<저장소명>/ 형태로 배포되므로
// base를 반드시 '/<저장소명>/' 으로 맞춰야 JS/CSS 경로가 깨지지 않습니다.
// 저장소 이름이 <계정>.github.io 라면 base: '/' 로 두세요.
export default defineConfig({
  plugins: [react()],
  base: '/relay-draw/',
})

