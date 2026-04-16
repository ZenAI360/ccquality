# CLAUDE.md — CCQuality

## Ne Bu?
Claude Code session JSONL dosyalarını tarayıcıda analiz eden kalite aracı.
JSONL + CLAUDE.md yükle → 5 analiz motoru çalışır → Session Quality Index (SQI) skoru üretir.
Sıfır backend, tamamen browser-side, GitHub Pages'de host edilecek.

## Tech Stack
- React 18 + TypeScript (strict mode) + Vite
- Tailwind CSS 4 (design token'lar src/styles/tokens.css'de)
- Recharts (grafikler), Vitest (testler)
- Büyük dosya parse: Web Workers (src/workers/)

## Dizin Yapısı
```
src/
  core/           # Parser + analiz motorları (UI bağımsız, pure logic)
    parser/       # JSONL parser, message extractor, token counter
    analyzers/    # 5 motor: compliance, retry, deadzone, reread, waste
    scoring/      # SQI hesaplayıcı, anomaly tagger, recommendations
  ui/             # React bileşenleri
    components/   # Tekrar kullanılabilir: Gauge, Heatmap, Timeline
    pages/        # Upload, Dashboard, Details
  workers/        # Web Worker dosyaları
  types/          # Tüm interface/type tanımları (tek kaynak)
  utils/          # Yardımcı fonksiyonlar
  test/           # __tests__ değil, ayrı test dizini
```
## Kritik Kurallar

### Kod Kalitesi
- Tek dosya 300 satırı ASLA aşmasın. Aşıyorsa böl.
- Fonksiyon max 40 satır. Daha uzunsa helper'lara ayır.
- Her public fonksiyona JSDoc yaz. Parametreler ve dönüş tipi zorunlu.
- `any` tipi YASAK. Bilinmeyen tipler için `unknown` + type guard kullan.
- console.log ile debug YASAK. Gerekiyorsa src/utils/logger.ts kullan.
-**Güncelleme kaydı:**Her PR sonunda `guncellemeler.md` dosyası güncellenir (ne eklendi, ne değişti, bilinen kısıtlar).

### Bağımlılık
- Yeni npm paketi eklemeden ÖNCE sor. Stdlib veya mevcut paketlerle çözülebilecek şeylere bağımlılık ekleme.
- devDependencies hariç toplam runtime bağımlılık 5'i geçmesin.

### Test
- Her yeni modül için aynı PR'da test yaz. Testsiz PR YASAK.
- Test dosyası: src/test/<modül-adı>.test.ts
- Minimum: 3 test case (happy path, edge case, error case).
- Gerçek JSONL snippet'leri fixtures/ dizininde, mock veri test içinde.

### Git
- Commit mesajları conventional commits: feat:, fix:, test:, refactor:, docs:
- Her PR tek bir concern'e odaklansın. Birden fazla özellik aynı PR'da YASAK.
- PR açmadan önce: lint + test + build hepsi geçmeli.

### Performans
- JSONL parse işlemleri ANA THREAD'de YASAK. Daima Web Worker kullan.
- 50MB dosya 5 saniyede parse edilmeli. Benchmark: src/test/perf.bench.ts

### UI
- Dark theme varsayılan, renk paleti: var(--bg) #06060a, var(--amber) #f0a830, var(--cyan) #4ac6d2
- Tüm chart bileşenleri responsive. Mobile-first değil ama 768px'de kırılmasın.
- Erişilebilirlik: tüm interaktif öğelere aria-label, renk kontrastı WCAG AA.

## JSONL Kaynak Yol
~/.claude/projects/<proje-adı>/session-<id>.jsonl

## PR Planı
Detaylı PR listesi: docs/PR-PLAN.md dosyasında. Claude Code bu dosyayı takip eder.

## Hatırlatmalar
- Zen AI R&D ürünü: Kodda İngilizce yorum, UI metinleri Türkçe.
- Export JSON formatı: docs/report-schema.json (Faz 3'te yazılacak)
