import { describe, it, expect } from 'vitest'
import type {
  JSONLLine,
  TokenUsage,
  TextBlock,
  ToolUseBlock,
  ToolResultBlock,
  ThinkingBlock,
  ContentBlock,
  RawMessage,
  ExtractedMessage,
  ToolCall,
  TokenTimelineEntry,
  TokenTimeline,
  Finding,
  Recommendation,
  AnalysisResult,
  ExtractedRule,
  SQIBreakdown,
  SQIResult,
  Anomaly,
} from '@/types'

/**
 * PR-02 type tests — TypeScript compilation ensures structural correctness.
 * These tests verify that example objects satisfy the type contracts at runtime.
 */

describe('JSONL types', () => {
  it('constructs a valid TokenUsage', () => {
    const usage: TokenUsage = {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 200,
      cache_creation_input_tokens: 50,
    }
    expect(usage.input_tokens).toBe(1000)
    expect(usage.cache_read_input_tokens).toBe(200)
  })

  it('constructs all ContentBlock variants', () => {
    const text: TextBlock = { type: 'text', text: 'Hello' }
    const toolUse: ToolUseBlock = {
      type: 'tool_use',
      id: 'tu_001',
      name: 'Read',
      input: { file_path: '/foo.ts' },
    }
    const toolResult: ToolResultBlock = {
      type: 'tool_result',
      tool_use_id: 'tu_001',
      content: 'file content here',
    }
    const thinking: ThinkingBlock = { type: 'thinking', thinking: 'reasoning...' }

    const blocks: ContentBlock[] = [text, toolUse, toolResult, thinking]
    expect(blocks).toHaveLength(4)
    expect(blocks[0].type).toBe('text')
    expect(blocks[1].type).toBe('tool_use')
  })

  it('constructs a full JSONLLine', () => {
    const line: JSONLLine = {
      type: 'message',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'response' }],
      } satisfies RawMessage,
      usage: {
        input_tokens: 500,
        output_tokens: 100,
        cache_read_input_tokens: 400,
        cache_creation_input_tokens: 0,
      },
      timestamp: '2026-01-01T00:00:00Z',
      sessionId: 'sess_abc',
    }
    expect(line.type).toBe('message')
    expect(line.sessionId).toBe('sess_abc')
  })
})

describe('Session types', () => {
  it('constructs a valid ExtractedMessage', () => {
    const msg: ExtractedMessage = {
      role: 'user',
      contentBlocks: [{ type: 'text', text: 'question' }],
      textContent: 'question',
      turnIndex: 0,
      timestamp: undefined,
      sessionId: 'sess_001',
      usage: undefined,
    }
    expect(msg.role).toBe('user')
    expect(msg.turnIndex).toBe(0)
  })

  it('constructs a valid ToolCall', () => {
    const call: ToolCall = {
      name: 'Read',
      input: { file_path: '/src/app.ts' },
      id: 'tu_123',
      turnIndex: 3,
      filePath: '/src/app.ts',
      sequenceIndex: 0,
      prevCallIndex: undefined,
      nextCallIndex: 2,
    }
    expect(call.filePath).toBe('/src/app.ts')
    expect(call.nextCallIndex).toBe(2)
  })

  it('constructs a valid TokenTimeline', () => {
    const entry: TokenTimelineEntry = {
      turn: 1,
      inputTokens: 1000,
      outputTokens: 200,
      cacheRead: 800,
      cacheCreation: 100,
      cumulativeInput: 1000,
      cumulativeOutput: 200,
    }
    const timeline: TokenTimeline = {
      entries: [entry],
      totalInput: 1000,
      totalOutput: 200,
      totalCacheRead: 800,
      totalCacheCreation: 100,
      cacheHitRatio: 0.8,
    }
    expect(timeline.cacheHitRatio).toBe(0.8)
    expect(timeline.entries[0].turn).toBe(1)
  })
})

describe('Analysis types', () => {
  it('constructs a valid Finding', () => {
    const finding: Finding = {
      id: 'f-001',
      severity: 'critical',
      title: 'Retry loop detected',
      description: 'Same Read tool called 5 times in succession',
      turnRange: [10, 15],
      tokenImpact: 5000,
      evidence: 'Read /src/app.ts called at turns 10,11,12,13,14',
    }
    expect(finding.severity).toBe('critical')
    expect(finding.tokenImpact).toBe(5000)
  })

  it('constructs a valid AnalysisResult', () => {
    const rec: Recommendation = {
      id: 'r-001',
      priority: 'high',
      action: 'Cache file reads',
      detail: 'Reading the same file repeatedly wastes tokens',
      relatedFindings: ['f-001'],
    }
    const result: AnalysisResult = {
      engineName: 'retryDetector',
      score: 60,
      findings: [],
      metrics: { retry_waste: 15.5, loop_count: 3 },
      recommendations: [rec],
    }
    expect(result.engineName).toBe('retryDetector')
    expect(result.metrics['retry_waste']).toBe(15.5)
  })
})

describe('Rules types', () => {
  it('constructs a valid ExtractedRule', () => {
    const rule: ExtractedRule = {
      id: 'rule-001',
      text: 'Never use console.log directly',
      lineNumber: 42,
      zone: 2,
      category: 'code-style',
      matchedPattern: 'Never',
    }
    expect(rule.zone).toBe(2)
    expect(rule.category).toBe('code-style')
  })
})

describe('Scoring types', () => {
  it('constructs a valid SQIResult', () => {
    const anomaly: Anomaly = {
      id: 'a-001',
      type: 'retry_waste',
      severity: 'critical',
      description: 'Retry waste 25% > threshold 15%',
      turnRange: [5, 20],
      tokenCost: 8000,
    }
    const breakdown: SQIBreakdown = {
      compliance: 70,
      readEfficiency: 85,
      retryEfficiency: 40,
      attentionDistribution: 75,
      tokenUtilisation: 65,
    }
    const result: SQIResult = {
      overall: 68,
      breakdown,
      anomalies: [anomaly],
      recommendations: [],
      rating: 'average',
    }
    expect(result.overall).toBe(68)
    expect(result.rating).toBe('average')
    expect(result.anomalies[0].type).toBe('retry_waste')
  })
})
