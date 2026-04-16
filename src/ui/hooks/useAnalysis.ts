import { useState, useCallback } from 'react'
import type { ParsedSession } from '@/types/session'
import type { AnalysisResult } from '@/types/analysis'
import type { SQIResult } from '@/types/scoring'
import type { ExtractedRule } from '@/types/rules'
import { checkCompliance } from '@/core/analyzers/compliance-checker'
import { detectRetryLoops } from '@/core/analyzers/retry-detector'
import { mapDeadZones } from '@/core/analyzers/deadzone-mapper'
import { calculateReReadCost } from '@/core/analyzers/reread-calculator'
import { classifyWaste } from '@/core/analyzers/waste-classifier'
import { calculateSQI } from '@/core/scoring/sqi-calculator'
import { tagAnomalies } from '@/core/scoring/anomaly-tagger'
import { generateRecommendations } from '@/core/scoring/recommendation-engine'
import { extractRules } from '@/core/analyzers/rule-extractor'

export type AnalysisStep =
  | 'idle'
  | 'compliance'
  | 'retry'
  | 'deadzone'
  | 'reread'
  | 'waste'
  | 'scoring'
  | 'done'
  | 'error'

export interface AnalysisState {
  step: AnalysisStep
  rules: ExtractedRule[]
  results: AnalysisResult[]
  sqi: SQIResult | undefined
  error: string | undefined
}

const INITIAL_STATE: AnalysisState = {
  step: 'idle',
  rules: [],
  results: [],
  sqi: undefined,
  error: undefined,
}

/**
 * Runs all 5 analysis engines on the parsed session and computes the SQI.
 * Each engine step sets a status flag so the UI can show live progress.
 *
 * @returns `state` — current analysis state, `run` — trigger function
 */
export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>(INITIAL_STATE)

  const run = useCallback((session: ParsedSession, claudeMdContent: string | undefined) => {
    // Reject empty or completely corrupt files before running any engine
    if (session.rawLines.length === 0 && session.parseErrors.length > 0) {
      setState({
        step: 'error',
        rules: [],
        results: [],
        sqi: undefined,
        error: `File could not be parsed: ${session.parseErrors[0]?.error ?? 'all lines failed'}`,
      })
      return
    }

    // All engines run synchronously but we yield between steps via
    // queueMicrotask so React can flush UI updates.
    const rules = claudeMdContent ? extractRules(claudeMdContent) : []
    setState({ step: 'compliance', rules, results: [], sqi: undefined, error: undefined })

    queueMicrotask(() => {
      try {
        const compliance = checkCompliance(session, rules)
        setState((s) => ({ ...s, step: 'retry', results: [compliance] }))

        queueMicrotask(() => {
          try {
            const retry = detectRetryLoops(session)
            setState((s) => ({ ...s, step: 'deadzone', results: [...s.results, retry] }))

            queueMicrotask(() => {
              try {
                const deadzone = mapDeadZones(rules, compliance)
                setState((s) => ({ ...s, step: 'reread', results: [...s.results, deadzone] }))

                queueMicrotask(() => {
                  try {
                    const reread = calculateReReadCost(session)
                    setState((s) => ({ ...s, step: 'waste', results: [...s.results, reread] }))

                    queueMicrotask(() => {
                      try {
                        const waste = classifyWaste(session, retry, reread)
                        setState((s) => ({ ...s, step: 'scoring', results: [...s.results, waste] }))

                        queueMicrotask(() => {
                          try {
                            const allResults = [compliance, retry, deadzone, reread, waste]
                            const sqi = calculateSQI(allResults)
                            const anomalies = tagAnomalies(sqi, allResults)
                            const recs = generateRecommendations(sqi, anomalies, allResults)
                            const finalSqi: SQIResult = { ...sqi, anomalies, recommendations: recs }
                            setState({ step: 'done', rules, results: allResults, sqi: finalSqi, error: undefined })
                          } catch (err) {
                            setState((s) => ({ ...s, step: 'error', error: String(err) }))
                          }
                        })
                      } catch (err) {
                        setState((s) => ({ ...s, step: 'error', error: String(err) }))
                      }
                    })
                  } catch (err) {
                    setState((s) => ({ ...s, step: 'error', error: String(err) }))
                  }
                })
              } catch (err) {
                setState((s) => ({ ...s, step: 'error', error: String(err) }))
              }
            })
          } catch (err) {
            setState((s) => ({ ...s, step: 'error', error: String(err) }))
          }
        })
      } catch (err) {
        setState((s) => ({ ...s, step: 'error', error: String(err) }))
      }
    })
  }, [])

  return { state, run }
}
