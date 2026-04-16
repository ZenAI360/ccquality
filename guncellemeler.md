# Güncellemeler

## PR-01 — Project Scaffold
- Vite 6 + React 18 + TypeScript strict mode kurulumu
- Tailwind CSS 4 (@tailwindcss/vite) + design token'lar (src/styles/tokens.css)
- ESLint flat config (strictTypeChecked, no-console)
- Vitest 3 (jsdom, 80% coverage eşiği)
- Tüm src/ dizin yapısı oluşturuldu, barrel export'lar eklendi

## PR-02 — TypeScript Type Definitions
- src/types/jsonl.ts: JSONLLine, ContentBlock union tipleri
- src/types/session.ts: ParsedSession, ExtractedMessage, ToolCall, TokenTimeline
- src/types/analysis.ts: AnalysisResult, Finding, Recommendation
- src/types/rules.ts: ExtractedRule, RuleCategory, RuleZone
- src/types/scoring.ts: SQIResult, SQIBreakdown, Anomaly
- src/test/types.test.ts: 10 test

## PR-03 — JSONL Parser Core
- src/core/parser/jsonl-parser.ts: parseJSONLString()
- src/core/parser/message-extractor.ts: extractMessages()
- src/core/parser/token-counter.ts: aggregateTokens()
- src/core/parser/tool-indexer.ts: indexToolCalls(), dosya zinciri bağlama
- src/core/parser/session-detector.ts: detectSessions(), compaction tespiti
- fixtures/sample-session.jsonl: 20 satırlık gerçekçi test verisi
- src/test/parser.test.ts: 23 test

## PR-04 — Web Worker Wrapper
- src/workers/parse-worker.ts: JSONL parsing off-thread, progress events
- src/core/parser/worker-bridge.ts: parseInWorker(), 30s timeout, FileReader
- src/test/worker.test.ts: 7 test (vi.stubGlobal pattern ile jsdom uyumlu)

## PR-05 — CLAUDE.md Rule Extractor
- src/core/analyzers/rule-patterns.ts: 17 regex pattern, kategori anahtar kelimeleri
- src/core/analyzers/rule-extractor.ts: extractRules(), zone ataması (1-5), kategori sınıflama
- fixtures/sample-claude-md.md: 50+ satırlık örnek CLAUDE.md
- src/test/rule-extractor.test.ts: 18 test

## PR-06 — Rule Compliance Checker
- src/core/analyzers/compliance-checker.ts: checkCompliance()
- Heuristikler: console.log tespiti, .js dosya oluşturma, test dosyası eksikliği
- Doğrulanamaz kurallar puan etkilemeden sayılıyor
- src/test/compliance.test.ts: 6 test

## PR-07 — Retry Loop Detector
- src/core/analyzers/retry-detector.ts: detectRetryLoops()
- 3 dedektör: ardışık araç tekrarı, tekrarlayan hata mesajı, metin sinyalleri
- retry_waste metriği ve döngü ceza puanı
- fixtures/retry-session.jsonl: 12 satır sentetik retry verisi
- src/test/retry-detector.test.ts: 7 test

## PR-08 — Attention Dead Zone Mapper
- src/core/analyzers/deadzone-mapper.ts: mapDeadZones()
- 5 bölge compliance analizi, "lost in the middle" tespiti
- src/test/deadzone.test.ts: 6 test

## PR-09 — Re-Read Cost Calculator
- src/core/analyzers/reread-calculator.ts: calculateReReadCost()
- Dosya başına redundant token tahmini (800 token/okuma)
- CLAUDE.md enjeksiyon maliyeti (compaction boundary × 1200 token)
- Top-5 en fazla tekrar okunan dosya findings'e ekleniyor
- src/test/reread.test.ts: 6 test

## PR-10 — Waste Classifier
- src/core/analyzers/waste-classifier.ts: classifyWaste()
- 6 kategori: Productive, ReRead, Retry, System, Compaction, CacheMiss
- Pareto analizi: en büyük waste kategorisi ve top-3
- src/test/waste-classifier.test.ts: 5 test

## PR-11 — Scoring Engine
- src/core/scoring/sqi-calculator.ts: calculateSQI() — ağırlıklı bileşik skor
- src/core/scoring/anomaly-tagger.ts: tagAnomalies() — eşik tabanlı severity
- src/core/scoring/recommendation-engine.ts: generateRecommendations()
- src/core/scoring/report-exporter.ts: exportJSON() — docs/report-schema.json formatı
- docs/report-schema.json: JSON Schema v7 rapor şeması
- src/test/scoring.test.ts: 12 test

## PR-12 — UI File Upload & App Shell
- src/ui/components/AppShell.tsx: header + navigasyon, React Router bağlantıları
- src/ui/pages/UploadPage.tsx: drag & drop zone, dosya validasyonu, demo butonu
- src/ui/pages/DashboardPage.tsx: başlangıç stub'ı (PR-18'de dolduruldu)
- src/App.tsx: BrowserRouter + Routes (/ ve /dashboard)
- fixtures/demo-session.jsonl: bilinen sorunları olan 19 satırlık demo verisi
- react-router-dom eklendi (4. runtime bağımlılık, limit 5)
- src/test/upload.test.ts: 3 test

## PR-13 — SQI Gauge & Summary Cards
- src/ui/components/SQIGauge.tsx: SVG dairesel gauge, 5 alt skor bar
- src/ui/components/SummaryCards.tsx: 4 kart grid (verimlilik, overhead, döngü, uyum)

## PR-14 — Token Timeline Chart
- src/ui/components/TokenTimeline.tsx: Recharts AreaChart, stacked input/output/cache
- Retry loop dönemleri kırmızı ReferenceLine ile gösteriliyor
- Brush komponenti 20+ tur için otomatik etkinleşiyor

## PR-15 — Attention Heatmap
- src/ui/components/AttentionHeatmap.tsx: zone bazlı kural compliance ısı haritası
- Hover tooltip, dead zone vurgulama, renk efsanesi

## PR-16 — Waste Donut & ReRead Table
- src/ui/components/WasteDonut.tsx: Recharts PieChart, 6 kategori, maliyet tahmini
- src/ui/components/ReReadTable.tsx: sıralanabilir tablo, top-5 vurgulama

## PR-17 — Findings & Recommendations Panel
- src/ui/components/FindingsPanel.tsx: severity'ye göre sıralı accordion listesi
- src/ui/components/RecommendationCards.tsx: öncelik badge + kopyala butonu

## PR-18 — Dashboard Integration
- src/ui/hooks/useAnalysis.ts: 5 motor + SQI pipeline, queueMicrotask adım geçişleri
- src/ui/pages/DashboardPage.tsx: tüm bileşenler entegre, hata boundary, loading state

## PR-19 — Test Suite & Calibration
- src/test/integration.test.ts: 7 uçtan uca test (demo-session + retry-session)
- src/test/perf.bench.ts: 1/10/50 MB benchmark
- 50 MB parse: ~455 ms ortalama (hedef < 5000 ms) ✓
- Toplam test sayısı: 110

## PR-20 — Deploy & Launch
- vite.config.ts: base path /ccquality/ (VITE_BASE_PATH env override'ı)
- index.html: OG meta tags (og:title, og:description, og:image, twitter:card)
- .github/workflows/deploy.yml: lint → test → build → GitHub Pages deploy
- guncellemeler.md oluşturuldu

## Sonraki Güncellemeler (PR sonrası iyileştirmeler)

### Algoritma Düzeltmeleri
- **Retry dedektörü yeniden yazıldı:**
  - Metin sinyali dedektörü (Dedektör 3) tamamen kaldırıldı — gerçek session'larda tüm tokenleri waste olarak işaretliyordu
  - Olay bazlı token maliyeti: tek tur olaylar yalnızca o turun tokenlerini sayar; çok turlu yayılımlar `(count-1)/count × aralıktaki toplam` kullanır
  - Hata tekrarları: her tekrarlayan oluşum ayrı bir olay (span değil) — aynı hata 5. ve 580. turda da olsa ikisi arasındaki tokenler waste sayılmaz
- **SQI çarpımlı ceza:** `loop_count > 10` veya `retry_waste > 20%` koşulunda ×0.85 faktörü uygulanıyor
- **Öneri motoru ayrıştırması:** `retry_waste` anomalisi artık iki hedefli öneri üretiyor:
  - `consecutive_tool_loop`: ardışık araç döngüleri → "Her araç çağrısından sonra sonucu doğrulayın"
  - `error_repeat_loop`: tekrarlayan hata mesajları → "Aynı hata tekrarlandığında strateji değiştirin"

### UI Düzeltmeleri
- **Token Zaman Çizgisi opacity düzeltmesi:** cacheRead (#6b7db3, %75) ve input (#4a90d9, %85) gradyanları koyu arka planda neredeyse görünmezdi; tüm üç katmanın opaklığı ve kontur kalınlığı artırıldı
- **CLAUDE.md Attention Heatmap satır bazlı ızgaraya geçildi:**
  - `AttentionHeatmap.tsx` tamamen yeniden yazıldı: bölge sütunları → 20 sütunlu CSS ızgara (her hücre = bir kaynak satırı)
  - Yeni prop: `totalLines: number` (CLAUDE.md kaynak satır sayısı)
  - Yeni yardımcı fonksiyonlar: `lineZone()`, `buildViolatedSet()`, `buildRuleIndex()`
  - Yeni alt bileşenler: `RuleCell` (yeşil/kırmızı kural hücreleri, hover), `BlankCell` (koyu kural-dışı hücreler)
  - İhlal tespiti: `complianceResult.findings` açıklamalarından `line (\d+)` regex ile satır numarası çıkarımı
  - Ölü bölge görselleştirmesi: ilgili bant hücrelerine kırmızı ton (kural-dışı) veya kırmızı outline (kural)
  - `DashboardPage.tsx`: `totalLines = claudeMdContent.split('\n').length` hesaplanıp `AttentionHeatmap`'e iletiliyor
  - i18n: `translations.ts`'e `legendNoData` ve `deadZoneInfo(zone)` anahtarları eklendi (TR + EN)

### i18n
- **Öneri slug'ları TR/EN'e eklendi:** `retry_waste`, `reread_overhead`, `low_compliance`, `cache_miss`, `attention_dead_zone`, `token_spike`, `low_score`, `consecutive_tool_loop`, `error_repeat_loop`
- `RecommendationCards.tsx`: `t.recTexts[rec.slug]` ile dil duyarlı metin çözümleme, `rec.action/detail`'e geri döner
- **Tip eklendi:** `Recommendation.slug?: string` (`src/types/analysis.ts`)

### Kod Kalitesi İyileştirmeleri (Backend Review)
**Modül düzeyinde değişken durumu kaldırıldı:**
- `anomaly-tagger.ts`: `let anomalyCounter` → `templates.map((t,i) => ...)` ile yerinde ID atama
- `recommendation-engine.ts`: `let recCounter` + `nextId()` → `RecTemplate` pattern (ID'siz), `generateRecommendations` sonunda ID atama

**İsimlendirilen sabitler:**
- `sqi-calculator.ts`: `SEVERE_LOOP_COUNT_THRESHOLD=10`, `SEVERE_WASTE_PCT_THRESHOLD=20`, `SEVERE_RETRY_SQI_PENALTY=0.85`
- `retry-detector.ts`: `LOOP_PENALTY_PER_EVENT=20`, `MAX_LOOP_PENALTY=60`, `WASTE_PENALTY_MULTIPLIER=2`, `MAX_WASTE_PENALTY=40`
- `deadzone-mapper.ts`: `DEAD_ZONE_WARN_THRESHOLD=0.7`, `DEAD_ZONE_CRITICAL_THRESHOLD=0.4`, `DEAD_ZONE_MIDDLE_GAP=0.15`
- `waste-classifier.ts`: `MAX_SYSTEM_OVERHEAD_RATIO=0.15`, `MAX_COMPACTION_OVERHEAD_RATIO=0.10`
- `anomaly-tagger.ts`: `RETRY_WASTE_CRITICAL_PCT`, `RETRY_WASTE_WARN_PCT`, `REREAD_OVERHEAD_CRITICAL_PCT`, `REREAD_OVERHEAD_WARN_PCT`, `COMPLIANCE_CRITICAL_SCORE`, `COMPLIANCE_WARN_SCORE`, `CACHE_MISS_WARN_PCT`

**Fonksiyon uzunluğu (CLAUDE.md: maks. 40 satır):**
- `tagAnomalies` 101→15 satır: `tagRetryWaste`, `tagRereadOverhead`, `tagLowCompliance`, `tagCacheMiss` yardımcılarına ayrıldı
- `classifyWaste` 120→30 satır: `estimateSystemTokens`, `estimateCompactionTokens`, `buildParetoFindings`, `buildEfficiencyRecommendation` ayrıştırıldı
- `checkCompliance` 75→22 satır: `runRuleChecks` yardımcısına ayrıştırıldı
- `detectRetryLoops` 58→40 satır: `computeRetryScore` ayrıştırıldı

**Güvenlik / sağlamlık:**
- `jsonl-parser.ts`: 200 MB üzeri dosyalar parse başlamadan reddediliyor (`MAX_CONTENT_BYTES`)
- `worker-bridge.ts`: `type === 'error'` için açık dal + bilinmeyen mesaj tipleri için güvenli `else` (log+ignore)
- `parse-worker.ts`: `if (event.data.type !== 'parse') return` bekçisi
- `useAnalysis.ts`: `rawLines.length === 0 && parseErrors.length > 0` durumunda hata state'i üretiliyor
- `waste-classifier.ts`: `WasteBreakdown.CacheMiss` kümülatif olmayan (overlapping) olduğu JSDoc'a eklendi

Toplam test sayısı: **113** (tümü geçiyor)

## Bilinen Kısıtlar
- Chunk boyutu 650 kB (recharts büyük) — PR sonrası lazy import ile iyileştirilebilir
- Demo butonu /fixtures/demo-session.jsonl fetch eder; GitHub Pages'de public/ altına taşınmalı
- Gerçek CLAUDE.md enjeksiyonu fiyatlandırması tahminidir, gerçek token sayısı değildir
