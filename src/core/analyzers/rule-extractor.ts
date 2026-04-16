import type { ExtractedRule, RuleCategory, RuleZone } from '@/types/rules'
import { RULE_PATTERNS, CATEGORY_KEYWORDS } from './rule-patterns'

/**
 * Lines that look like headings, code fences, or pure whitespace are skipped.
 */
const SKIP_LINE_RE = /^\s*(#{1,6}\s|```|~~~|>\s*$|$)/u

/**
 * Refines a matched category by scanning the line text for domain keywords.
 * @param text - The rule line text
 * @param initial - Category derived from the matched pattern
 * @returns Refined category, or the initial value if no keyword match
 */
function refineCategory(text: string, initial: RuleCategory): RuleCategory {
  const lower = text.toLowerCase()
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return category
  }
  return initial
}

/**
 * Maps a 1-based line number to one of five equal-sized zones.
 * @param lineNumber - 1-based line number
 * @param totalLines - Total number of lines in the document
 * @returns Zone number 1–5
 */
function toZone(lineNumber: number, totalLines: number): RuleZone {
  if (totalLines <= 0) return 1
  const fraction = (lineNumber - 1) / totalLines
  const raw = Math.floor(fraction * 5) + 1
  // Clamp to [1, 5] — the last line maps exactly to 5
  const clamped = Math.min(5, Math.max(1, raw)) as RuleZone
  return clamped
}

/**
 * Extracts imperative rules from a CLAUDE.md string.
 *
 * Scans every line for patterns that indicate a directive
 * (Never, Always, YASAK, etc.) and returns a structured list
 * with zone assignment and category classification.
 *
 * @param markdown - Full text of the CLAUDE.md file
 * @returns Array of extracted rules, in document order
 */
export function extractRules(markdown: string): ExtractedRule[] {
  if (!markdown.trim()) return []

  const lines = markdown.split('\n')
  const totalLines = lines.length
  const rules: ExtractedRule[] = []
  let ruleIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const lineNumber = i + 1

    if (SKIP_LINE_RE.test(line)) continue

    for (const pattern of RULE_PATTERNS) {
      if (pattern.regex.test(line)) {
        ruleIndex++
        const id = `rule-${String(ruleIndex).padStart(3, '0')}`
        const text = line.trim()
        const zone = toZone(lineNumber, totalLines)
        const category = refineCategory(text, pattern.category)

        rules.push({
          id,
          text,
          lineNumber,
          zone,
          category,
          matchedPattern: pattern.label,
        })
        break // first matching pattern wins
      }
    }
  }

  return rules
}
