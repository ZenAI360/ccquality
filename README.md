# CC Quality — Claude Code Session Quality Analyzer

> Claude Code oturumlarını analiz ederek sessizce yanan tokenları, retry döngülerini ve kural ihlallerini tespit eden tarayıcı tabanlı bir araçtır.

![CC Quality Dashboard](docs/assets/screenshot.png)

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)](https://vite.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Ne Yapar?

Claude Code her konuşmayı/seansı (session) `.jsonl` dosyasına kaydeder. CC Quality seçtiğiniz bu dosyayı tarayıcıda okur, 5 analiz motorundan geçirir ve **Session Quality Index (SQI)** skoru üretir:

| Motor | Ölçtüğü |
|---|---|
| Rule Compliance | CLAUDE.md kurallarına uyum oranı |
| Retry Loop Detector | Döngüye giren araç çağrıları ve tekrarlanan hata mesajları |
| Attention Dead Zone Mapper | CLAUDE.md'nin görmezden gelinen bölgeleri |
| Re-Read Cost Calculator | Aynı dosyaların gereksiz yere tekrar okunması |
| Waste Classifier | Token israfının 6 kategoriye dağılımı |

**Proje "sıfır backend" ile çalışır.** Tüm analiz tarayıcıda, cihazında yapılır. Hiçbir veri dışarı çıkmaz.

---

## Kullanım

1. `~/.claude/projects/<proje>/session-<id>.jsonl` dosyasını bul
2. Projenin kök dizinindeki `CLAUDE.md` dosyasını hazırla
3. CC Quality'yi aç → dosyaları sürükle-bırak → analizi bekle (1–5 sn)
4. SQI skorunu ve bulguları oku, önerileri CLAUDE.md'ye yansıt

Detaylı rehber: [docs/CCQuality — Kurulum ve Kullanım Rehberi.md](docs/CCQuality%20—%20Kurulum%20ve%20Kullanım%20Rehberi.md)

---

## GitHub Pages Deploy

`vite.config.ts`'e base path ekle, yoksa asset yolları kırılır:
```ts
base: '/ccquality/'
```

```bash
npm run build
# dist/ → gh-pages branch'ına push
```

Repo → **Settings → Pages → Source: gh-pages branch**.

---

## Proje Yapısı

```
src/
  core/
    parser/       # JSONL ayrıştırıcı, token sayacı
    analyzers/    # 5 analiz motoru
    scoring/      # SQI hesaplayıcı, anomali etiketleyici, öneri motoru
  ui/
    components/   # SQIGauge, TokenTimeline, AttentionHeatmap, WasteDonut…
    pages/        # UploadPage, DashboardPage
    context/      # Dil (TR/EN) context
  workers/        # Web Worker (büyük dosya parse)
  types/          # Tüm TypeScript interface'leri
  i18n/           # TR/EN çeviriler
docs/
    CCQuality — Kurulum ve Kullanım Rehberi.md
```

---

## Tech Stack

| | |
|---|---|
| **UI** | React 18 + TypeScript (strict) |
| **Build** | Vite 6 |
| **Grafikler** | Recharts |
| **Stil** | Tailwind CSS 4 (design token'lar) |
| **Test** | Vitest + jsdom |
| **Parse** | Web Workers (ana thread bloklanmaz, max 200 MB) |

---

## Katkıda Bulunmak

1. Repo'yu fork'la
2. Feature branch aç: `git checkout -b feat/özellik-adı`
3. Değişikliklerini yap (`npm run lint && npm run test` geçmeli)
4. PR aç — tek bir konuya odaklansın

Kod kuralları: [CLAUDE.md](CLAUDE.md)

---

## Lisans

MIT © Zen AI 360
