import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: './client', // 👈 This line is the key
  plugins: [react()],
})
;
