import type { RuleCategory } from '@/types/rules'

/**
 * A compiled rule-detection pattern with its category label.
 */
export interface RulePattern {
  /** Regex to match a line that contains an imperative rule. */
  regex: RegExp
  /** Which category this pattern indicates. */
  category: RuleCategory
  /** Human-readable label used for matchedPattern. */
  label: string
}

/**
 * Ordered list of patterns checked against each CLAUDE.md line.
 * First match wins — order matters for overlapping patterns.
 */
export const RULE_PATTERNS: readonly RulePattern[] = [
  // Turkish imperatives
  { regex: /\bASLA\b/u, category: 'code-style', label: 'ASLA' },
  { regex: /\bYASAK\b/u, category: 'code-style', label: 'YASAK' },
  { regex: /\bDAİMA\b/i, category: 'code-style', label: 'DAIMA' },
  { regex: /\bHER ZAMAN\b/i, category: 'code-style', label: 'HER ZAMAN' },
  { regex: /\bZORUNLU\b/i, category: 'code-style', label: 'ZORUNLU' },

  // English imperatives — start of sentence / list item
  { regex: /(?:^|\s)Always\s/u, category: 'code-style', label: 'Always' },
  { regex: /(?:^|\s)Never\s/u, category: 'code-style', label: 'Never' },
  { regex: /(?:^|\s)Do not\s/iu, category: 'code-style', label: 'Do not' },
  { regex: /(?:^|\s)Don['']t\s/iu, category: 'code-style', label: "Don't" },
  { regex: /(?:^|\s)Must\s/iu, category: 'code-style', label: 'Must' },
  { regex: /(?:^|\s)Avoid\s/iu, category: 'code-style', label: 'Avoid' },
  { regex: /(?:^|\s)Prefer\s/iu, category: 'code-style', label: 'Prefer' },
  { regex: /(?:^|\s)Use\s/u, category: 'tooling', label: 'Use' },
  { regex: /(?:^|\s)Ensure\s/iu, category: 'code-style', label: 'Ensure' },
  { regex: /(?:^|\s)Require\b/iu, category: 'code-style', label: 'Require' },
  { regex: /(?:^|\s)Forbidden\b/iu, category: 'code-style', label: 'Forbidden' },

  // ALL-CAPS emphasis — 4+ uppercase letters not part of a code identifier
  { regex: /\b[A-Z]{4,}\b/u, category: 'other', label: 'ALL-CAPS' },
]

/**
 * Per-keyword category overrides for classifyCategory refinement.
 * Applied after the initial pattern match.
 */
export const CATEGORY_KEYWORDS: ReadonlyArray<{ keywords: readonly string[]; category: RuleCategory }> = [
  {
    keywords: ['test', 'spec', 'coverage', 'vitest', 'jest', 'fixture', 'mock'],
    category: 'testing',
  },
  {
    keywords: ['import', 'export', 'module', 'package', 'dependency', 'npm', 'bağımlılık'],
    category: 'architecture',
  },
  {
    keywords: ['eslint', 'prettier', 'lint', 'format', 'tsconfig', 'vite', 'build', 'tool'],
    category: 'tooling',
  },
  {
    keywords: ['name', 'naming', 'prefix', 'suffix', 'camelCase', 'PascalCase', 'snake_case'],
    category: 'naming',
  },
]
