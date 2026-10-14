import type { Config } from 'tailwindcss'
export default { content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'], theme: { extend: { colors: { belca: { navy: '#0b1e38', orange: '#F39C1F' } } } }, plugins: [] } satisfies Config
