import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { extractRules } from '@/core/analyzers/rule-extractor'

/** Load fixtures/sample-claude-md.md from the project root */
function loadSampleClaude(): string {
  return readFileSync(join(__dirname, '../../fixtures/sample-claude-md.md'), 'utf-8')
}

// ── Basic extraction ────────────────────────────────────────────────────────

describe('extractRules — basic', () => {
  it('returns empty array for empty string', () => {
    expect(extractRules('')).toEqual([])
  })

  it('returns empty array for whitespace-only input', () => {
    expect(extractRules('   \n\n\t  ')).toEqual([])
  })

  it('returns empty array when only headings and fences present', () => {
    const md = '# Heading\n## Sub\n```ts\nconst x = 1\n```\n'
    expect(extractRules(md)).toEqual([])
  })

  it('extracts a single "Always" rule', () => {
    const md = 'Always write tests before shipping code.'
    const rules = extractRules(md)
    expect(rules).toHaveLength(1)
    expect(rules[0]?.matchedPattern).toBe('Always')
    expect(rules[0]?.lineNumber).toBe(1)
  })

  it('extracts a single "Never" rule', () => {
    const md = 'Never use console.log in production code.'
    const rules = extractRules(md)
    expect(rules).toHaveLength(1)
    expect(rules[0]?.matchedPattern).toBe('Never')
  })
})

// ── Turkish imperatives ────────────────────────────────────────────────────

describe('extractRules — Turkish imperatives', () => {
  it('detects ASLA', () => {
    const md = '- Single file max 300 lines. ASLA aşma.'
    const rules = extractRules(md)
    expect(rules.some((r) => r.matchedPattern === 'ASLA')).toBe(true)
  })

  it('detects YASAK', () => {
    const md = '`any` tipi YASAK.'
    const rules = extractRules(md)
    expect(rules.some((r) => r.matchedPattern === 'YASAK')).toBe(true)
  })

  it('detects ZORUNLU', () => {
    const md = 'Her public fonksiyona JSDoc yaz; dönüş tipi ZORUNLU.'
    const rules = extractRules(md)
    expect(rules.some((r) => r.matchedPattern === 'ZORUNLU')).toBe(true)
  })
})

// ── Zone assignment ────────────────────────────────────────────────────────

describe('extractRules — zone assignment', () => {
  it('assigns zone 1 to rules in the first 20% of lines', () => {
    // 10 lines; line 1 = zone 1
    const lines = Array.from({ length: 10 }, (_, i) =>
      i === 0 ? 'Always start with zone one.' : `Line ${String(i + 1)} no rule.`,
    )
    const rules = extractRules(lines.join('\n'))
    expect(rules.at(0)?.zone).toBe(1)
  })

  it('assigns zone 5 to rules in the last 20% of lines', () => {
    // 10 lines; line 10 = zone 5
    const lines = Array.from({ length: 10 }, (_, i) =>
      i === 9 ? 'Never place rules only at the end.' : `Line ${String(i + 1)} no rule.`,
    )
    const rules = extractRules(lines.join('\n'))
    expect(rules.at(-1)?.zone).toBe(5)
  })
})

// ── Category classification ────────────────────────────────────────────────

describe('extractRules — category refinement', () => {
  it('classifies test-related rule as "testing"', () => {
    const md = 'Always write test coverage before shipping.'
    const rules = extractRules(md)
    expect(rules[0]?.category).toBe('testing')
  })

  it('classifies lint/build rule as "tooling"', () => {
    const md = 'Always run eslint before committing.'
    const rules = extractRules(md)
    expect(rules[0]?.category).toBe('tooling')
  })

  it('classifies naming rule as "naming"', () => {
    const md = 'Use camelCase for all variable names.'
    const rules = extractRules(md)
    expect(rules[0]?.category).toBe('naming')
  })

  it('classifies module/import rule as "architecture"', () => {
    const md = 'Never import from a sibling module directory.'
    const rules = extractRules(md)
    expect(rules[0]?.category).toBe('architecture')
  })
})

// ── Sample CLAUDE.md ───────────────────────────────────────────────────────

describe('extractRules — sample-claude-md.md fixture', () => {
  it('extracts at least 10 rules from the sample file', () => {
    const rules = extractRules(loadSampleClaude())
    expect(rules.length).toBeGreaterThanOrEqual(10)
  })

  it('assigns sequential IDs starting from rule-001', () => {
    const rules = extractRules(loadSampleClaude())
    expect(rules[0]?.id).toBe('rule-001')
    expect(rules[1]?.id).toBe('rule-002')
  })

  it('every rule has a non-empty text and valid zone', () => {
    const rules = extractRules(loadSampleClaude())
    for (const rule of rules) {
      expect(rule.text.length).toBeGreaterThan(0)
      expect([1, 2, 3, 4, 5]).toContain(rule.zone)
    }
  })

  it('lineNumbers are in ascending order', () => {
    const rules = extractRules(loadSampleClaude())
    for (let i = 1; i < rules.length; i++) {
      expect(rules[i]?.lineNumber).toBeGreaterThanOrEqual(rules[i - 1]?.lineNumber ?? 0)
    }
  })
})
