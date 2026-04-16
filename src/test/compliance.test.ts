import { describe, it, expect } from 'vitest'
import { checkCompliance } from '@/core/analyzers/compliance-checker'
import type { ParsedSession, SessionMeta, TokenTimeline } from '@/types/session'
import type { ExtractedRule } from '@/types/rules'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseMeta: SessionMeta = {
  sessionId: 'sess_test',
  projectName: undefined,
  branch: undefined,
  startTime: undefined,
  endTime: undefined,
  totalTurns: 2,
  compactionBoundaries: [],
  isMultiSession: false,
}

const baseTimeline: TokenTimeline = {
  entries: [],
  totalInput: 0,
  totalOutput: 0,
  totalCacheRead: 0,
  totalCacheCreation: 0,
  cacheHitRatio: 0,
}

function makeSession(overrides?: Partial<ParsedSession>): ParsedSession {
  return {
    meta: baseMeta,
    messages: [],
    toolCalls: [],
    tokenTimeline: baseTimeline,
    toolCallsByFile: new Map(),
    parseErrors: [],
    rawLines: [],
    ...overrides,
  }
}

function makeRule(
  text: string,
  lineNumber = 1,
  zone: ExtractedRule['zone'] = 1,
): ExtractedRule {
  return {
    id: `rule-${String(lineNumber).padStart(3, '0')}`,
    text,
    lineNumber,
    zone,
    category: 'code-style',
    matchedPattern: 'Never',
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('checkCompliance', () => {
  it('returns score 100 with no findings when rules list is empty', () => {
    const result = checkCompliance(makeSession(), [])
    expect(result.score).toBe(100)
    expect(result.findings).toHaveLength(0)
    expect(result.metrics['total_rules']).toBe(0)
  })

  it('returns score 100 when all verifiable rules pass', () => {
    // Rule about TypeScript — session creates no .js files
    const rules: ExtractedRule[] = [makeRule('Use TypeScript for all new files.')]
    const session = makeSession({
      toolCalls: [
        {
          name: 'Write',
          input: { file_path: '/src/app.ts' },
          id: 'tc1',
          turnIndex: 0,
          filePath: '/src/app.ts',
          sequenceIndex: 0,
          prevCallIndex: undefined,
          nextCallIndex: undefined,
        },
      ],
    })
    const result = checkCompliance(session, rules)
    expect(result.score).toBe(100)
    expect(result.findings).toHaveLength(0)
  })

  it('produces a finding when console.log rule is violated', () => {
    const rules: ExtractedRule[] = [makeRule('Never use console.log in production.')]
    const session = makeSession({
      messages: [
        {
          role: 'assistant',
          contentBlocks: [{ type: 'text', text: 'I added console.log("debug") here.' }],
          textContent: 'I added console.log("debug") here.',
          turnIndex: 0,
          timestamp: undefined,
          sessionId: 'sess_test',
          usage: undefined,
        },
      ],
    })
    const result = checkCompliance(session, rules)
    expect(result.findings.length).toBeGreaterThanOrEqual(1)
    expect(result.score).toBeLessThan(100)
  })

  it('counts unverifiable rules without penalising score', () => {
    const rules: ExtractedRule[] = [
      makeRule('Always use appropriate naming as needed.', 1),
      makeRule('Use judgment when choosing an approach.', 2),
    ]
    const result = checkCompliance(makeSession(), rules)
    // Both rules are unverifiable — score stays 100
    expect(result.score).toBe(100)
    expect(result.metrics['unverifiable']).toBe(2)
    expect(result.findings).toHaveLength(0)
  })

  it('detects missing test file as violation for test rule', () => {
    const rule: ExtractedRule = {
      ...makeRule('Always write tests in the same PR.', 5),
      category: 'testing',
    }
    // Session has tool calls but no test file
    const session = makeSession({
      meta: { ...baseMeta, totalTurns: 3 },
      toolCalls: [
        {
          name: 'Write',
          input: { file_path: '/src/app.ts' },
          id: 'tc1',
          turnIndex: 0,
          filePath: '/src/app.ts',
          sequenceIndex: 0,
          prevCallIndex: undefined,
          nextCallIndex: undefined,
        },
      ],
    })
    const result = checkCompliance(session, [rule])
    expect(result.findings.length).toBeGreaterThanOrEqual(1)
    expect(result.findings.at(0)?.severity).toBe('critical')
  })

  it('engineName is "compliance"', () => {
    const result = checkCompliance(makeSession(), [])
    expect(result.engineName).toBe('compliance')
  })
})
