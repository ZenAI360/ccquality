## CCQuality — Kurulum ve Kullanım Rehberi

---

### CCQuality Nedir?

CCQuality, Claude Code ile yaptığın konuşmaların kalitesini ölçen bir tarayıcı aracıdır. Sana şunu söyler:

- Claude token'larını verimli kullandı mı, yoksa döngüye mi girdi?
- Aynı dosyaları defalarca okuyarak gereksiz token mu harcadı?
- CLAUDE.md'deki kurallara uydu mu?
- Genel oturum kalite skoru (SQI: Session Quality Index) kaç?

**Kurulum yok.** Tarayıcıda çalışır. Hiçbir şey sunucuya gitmez — tüm analiz senin cihazında yapılır.

---

### Adım 1 — CCQuality'yi Aç

İki seçeneğin var:

**A) GitHub Pages (önerilen — sıfır kurulum):**
Repo yayına girdikten sonra `https://<kullanıcıadın>.github.io/ccquality/` adresine gidiyorsun. Bitti.

**B) Lokal çalıştır (geliştirici modu):**
```bash
git clone https://github.com/<kullanıcıadın>/ccquality.git
cd ccquality
npm install
npm run dev
# → http://localhost:5173 adresinde açılır
```

---

### Adım 2 — Claude Code Oturum Dosyasını Bul

Claude Code her konuşmayı otomatik olarak kaydeder. Dosyalar şurada:

**Windows:**
```
C:\Users\<adın>\.claude\projects\<proje-klasörü>\session-<id>.jsonl
```

**Mac/Linux:**
```
~/.claude/projects/<proje-klasörü>/session-<id>.jsonl
```

Örnek yol:
```
C:\Users\Ali\.claude\projects\C--AI-benim-projem\session-abc123def.jsonl
```

> **İpucu:** Klasör adındaki eğik çizgiler tireye dönüşür. `C:\AI\benim-projem` klasörü → `D--YATIRIM-benim-projem` olur.

En son oturum için dosya boyutuna veya tarihine göre sırala — en büyük/yeni olan aktif oturumundur.

---

### Adım 3 — CLAUDE.md Dosyası Oluştur

CLAUDE.md, Claude'un projenizde nasıl davranması gerektiğini tanımlayan kuralar dosyasıdır. CCQuality bu dosyayı okuyarak Claude'un kurallara uyup uymadığını analiz eder.

**Projenin kök dizinine** `CLAUDE.md` adında bir dosya oluştur:

```markdown
# CLAUDE.md — Benim Projem

## Örnek-Genel Kurallar
- Türkçe kullanıcı arayüzü, İngilizce kod ve yorumlar
- Her yeni özellik için test yaz
- console.log kullanma, logger.ts kullan
- TypeScript'te `any` tipi yasak

## Dosya Kuralları
- Tek dosya 300 satırı geçmemesin
- Fonksiyon max 40 satır

## Git
- Conventional commits: feat:, fix:, docs:, test:
- PR açmadan önce lint + test geçmeli
```

Ne kadar detaylı olursa CCQuality o kadar doğru analiz yapar. Başlangıç için 10-15 kural yeterli.

---

### Adım 4 — Analizi Çalıştır

1. CCQuality'yi aç (`localhost:5173` veya GitHub Pages)
2. **"Yükle"** sayfasına gel
3. `.jsonl` dosyasını sürükle-bırak veya tıklayarak seç
4. **"CLAUDE.md ekle"** butonuyla kural dosyasını da yükle
5. Analiz otomatik başlar (1-5 saniye)

---

### Adım 5 — Sonuçları Oku

**Panel sayfasında 7 bölüm göreceksin:**

**SQI Gauge (Ortadaki Büyük Gösterge)**
```
0-49  → Kritik  (kırmızı)
50-79 → Orta    (turuncu)
80+   → İyi     (cyan)
```
Alt çubuklar: Uyum / Okuma / Retry / Dikkat / Token verimini ayrı ayrı gösterir.

**Özet Kartlar (4 küçük kutu)**
Her kutunun sağ üstündeki `?` ikonuna gel — ne anlama geldiği açıklanır.

**Token Dağılımı**
"Retry" ve "Tekrar Okuma" toplamı %30'u geçiyorsa oturum verimsizdir.

**Token Zaman Çizelgesi**
Kırmızı dikey çizgi gördüysen → o turda Claude döngüye girmiş demektir.

**Kural Dikkat Haritası**
Kırmızı kareler = ihlal edilen kurallar. Kırmızı kenarlı bölge = Claude o bölgeyi görmezden gelmiş ("ölü bölge").

**Bulgular ve Öneriler**
"Öneriler" bölümündeki **Kopyala** butonu, düzeltme önerisini panoya alır — doğrudan CLAUDE.md'ye yapıştırabilirsin.

---

### Pratik Kullanım Akışı

```
Yeni bir özellik geliştiriyorsun
         ↓
Claude Code ile konuşmayı bitiriyorsun
         ↓
CCQuality'ye oturum JSONL + CLAUDE.md yüklüyorsun
         ↓
SQI < 70 → Bulgulara bak, CLAUDE.md'yi güncelle
SQI ≥ 80 → Oturum verimli, devam et
         ↓
Sonraki oturumda tekrar kontrol et
```
---

### Sık Karşılaşılan Bulgular ve Ne Anlama Gelir

| Bulgu | Sebep | Çözüm |
|---|---|---|
| **Retry döngüsü** | Claude aynı hatada takıldı | CLAUDE.md'ye o konuda kural ekle |
| **Tekrar okuma yüksek** | Context kaybolmuş, dosyayı unutmuş | Daha kısa oturumlar yap |
| **Kural uyumu düşük** | CLAUDE.md zayıf veya çok genel | Kuralları daha spesifik yaz |
| **Token verimliliği < 40%** | Çok retry + reread | İkisini birlikte düzelt |

---

### Dosya Boyutu Limitleri

| Durum | Limit |
|---|---|
| Max JSONL boyutu | 200 MB |
| Önerilen oturum | < 50 MB (< 5 sn analiz) |
| CLAUDE.md | Sınır yok |

---

### Kısaca Özet

1. `~/.claude/projects/` altındaki `.jsonl` dosyasını bul
2. Projenin kök dizininde `CLAUDE.md` oluştur (opsiyonel)
3. CCQuality'ye her ikisini yükle
4. SQI skoruna ve bulgulara bak
5. Önerileri CLAUDE.md'ye yansıt
6. Bir sonraki oturumda tekrar ölç

**Hedef:** Her oturumda SQI'yi biraz daha yukarı çekmek. %80+ → Claude'un seni anladığı, kuralları izlediği ve verimli çalıştığı anlamına gelir.