# Ralph Agent Configuration

## Build Instructions

```bash
npm run build
```

## Test Instructions

```bash
npm run test -- --run
```

## Run Instructions

```bash
npm run dev
```

## Lint & Format

```bash
npm run lint
npm run format
```

## Type Check

```bash
npx tsc --noEmit
```

## Notes
- TypeScript + Three.js + Vite project
- Game design spec: `.ralph/PROMPT.md`
- Config files: `src/config/enemies.json`, `src/config/items.json`
- Entry point: `src/main.ts`
- All game systems should be config-driven — read from JSON, don't hardcode values
