import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { popupAnalyzerPlugin } from './server/popupAnalyzer.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env 의 키들은 VITE_ 접두사가 없으므로 브라우저 번들에 들어가지 않는다.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // GitHub Pages 처럼 하위 주소(/저장소이름/)에 배포할 때는 BASE_PATH 로 지정한다. 평소에는 '/'.
    base: process.env.BASE_PATH || '/',
    plugins: [
      react(),
      tailwindcss(),
      popupAnalyzerPlugin({
        anthropicKey: env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
        openrouterKey: env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY,
        geminiKey: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
      }),
    ],
  }
})
