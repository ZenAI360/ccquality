# CLAUDE.md — CCQuality

## About
This file configures Claude Code for the CCQuality project.
Browser-side JSONL analyzer with Session Quality Index scoring.

## General Guidelines

Always write clean, readable code that a new team member can understand.
Never use `console.log` directly; use the logger utility instead.
Do not add features that were not explicitly requested by the user.
Prefer composition over inheritance when designing components.
Use TypeScript strict mode for all source files.

## Code Style

- Single file max 300 lines. ASLA aşma.
- Fonksiyon max 40 satır. Daha uzunsa helper'lara böl.
- `any` tipi YASAK. Bilinmeyen tipler için `unknown` + type guard kullan.
- console.log ile debug YASAK.
- Her public fonksiyona JSDoc yaz; parametreler ve dönüş tipi ZORUNLU.

## Testing Rules

Always write tests in the same PR as the code.
Never skip tests for a feature because "it's simple".
Test files must go in src/test/. Do not mix tests with source files.
Ensure minimum 3 test cases: happy path, edge case, error case.
Use real JSONL fixtures, not fabricated mock data, for parser tests.
Vitest is the test runner — NEVER switch to jest without team approval.

## Architecture Decisions

Use Web Workers for all parse operations. Never block the main thread.
Avoid adding npm packages without asking first.
Do not duplicate types — src/types/ is the single source of truth.
Must keep runtime dependencies under 5.
Always prefer stdlib or existing packages over new dependencies.

## Naming Conventions

Use camelCase for variables and functions.
Use PascalCase for React components and TypeScript interfaces.
Never use single-letter variable names outside of loop counters.
Prefix boolean variables with `is`, `has`, or `should`.

## Git & PR Rules

Commit messages must follow Conventional Commits: feat:, fix:, test:.
Never commit without passing lint + test + build.
Do not mix multiple features in one PR.
Always run `npm run lint` before pushing.

## Türkçe Kurallar

Kodlarda İngilizce yorum yaz; UI metinleri Türkçe olsun.
Her PR sonunda `guncellemeler.md` dosyasını güncelle — bu ZORUNLU.
Yeni bağımlılık eklemeden önce MUTLAKA takıma sor.

## Performance

JSONL parse işlemleri ANA THREAD'de YASAK.
50MB dosya 5 saniyede parse edilmeli — bunu her zaman doğrula.
Always profile before optimizing; do not guess at bottlenecks.
