export type Lang = 'tr' | 'en'

const tr = {
  nav: {
    upload: 'Yükle',
    panel: 'Panel',
    homeLabel: 'CCQuality — Ana Sayfa',
    navLabel: 'Sayfa navigasyonu',
  },
  upload: {
    title: 'Oturum Analizi',
    subtitle: 'Claude Code oturum dosyanızı (.jsonl) yükleyin. İsteğe bağlı olarak CLAUDE.md de ekleyebilirsiniz.',
    dropzoneLabel: 'JSONL dosyası yüklemek için tıklayın veya sürükleyin',
    dropzoneText: '.jsonl dosyasını buraya sürükleyin',
    dropzoneHint: 'veya seçmek için tıklayın — maks. 200 MB',
    addClaudeMd: 'CLAUDE.md ekle',
    demoButton: 'Demo verisiyle dene',
    errorNotJsonl: 'Lütfen .jsonl uzantılı bir dosya seçin.',
    errorTooBig: (mb: string) =>
      `Dosya çok büyük. Maksimum boyut: 200 MB (seçilen: ${mb} MB)`,
    errorNoJsonl: 'Sürüklenen dosyalar arasında .jsonl bulunamadı.',
    errorDemo: 'Demo verisi yüklenemedi.',
  },
  dashboard: {
    sessionTitle: (id: string) => `Oturum Analizi — ${id}`,
    noSession: 'Henüz bir oturum yüklenmedi.',
    analysisError: (msg: string) => `Analiz hatası: ${msg}`,
    processing: 'Oturum analiz ediliyor...',
    parseError: 'Parse hatası',
    step: {
      idle: 'Bekleniyor',
      compliance: 'Uyum analizi...',
      retry: 'Retry döngüleri taranıyor...',
      deadzone: 'Dikkat ölü bölgeleri...',
      reread: 'Tekrar okuma maliyeti...',
      waste: 'Token israfı sınıflandırılıyor...',
      scoring: 'SQI hesaplanıyor...',
      done: 'Analiz tamamlandı',
      error: 'Hata',
      default: 'İşleniyor...',
    },
  },
  gauge: {
    good: 'İyi',
    average: 'Orta',
    critical: 'Kritik',
    scoreLabel: (score: number, rating: string) => `SQI skoru: ${String(score)} — ${rating}`,
    subCompliance: 'Uyum',
    subRead: 'Okuma',
    subRetry: 'Tekrar',
    subAttention: 'Dikkat',
    subToken: 'Token',
  },
  summaryCards: {
    efficiency: {
      label: 'Token Verimliliği',
      description: 'Üretken token oranı',
      tooltip:
        "Gerçek iş için harcanan token'ların toplam token'lara oranı. " +
        '≥70% iyi, 40-70% orta, <40% kritik. ' +
        "Düşük değer retry döngüleri veya aşırı tekrar okuma işaretçisidir.",
    },
    reread: {
      label: 'Tekrar Okuma',
      description: 'Fazladan okuma maliyeti',
      tooltip:
        'Aynı dosyaların birden fazla kez okunmasından kaynaklanan ek token maliyetinin toplam tokenlara oranı. ' +
        "≤50% kabul edilebilir, >200% kritik. Yüksek değer, Claude'un bağlamı kaybettiğinin işareti olabilir.",
    },
    retry: {
      label: 'Retry Döngüleri',
      unit: 'adet',
      description: 'Tekrarlayan eylem döngüsü',
      tooltip:
        'Aynı aracın veya eylemin art arda başarısız olup tekrarlandığı döngü sayısı. ' +
        '0 ideal, 1-2 kabul edilebilir, >2 kritik. Her döngü gereksiz token harcar ve kalite düşürür.',
    },
    compliance: {
      label: 'Kural Uyumu',
      description: 'CLAUDE.md kuralları',
      tooltip:
        "CLAUDE.md dosyasındaki kurallara oturum boyunca ne ölçüde uyulduğunu gösterir (0-100). " +
        "≥80 iyi, 50-79 orta, <50 kritik. CLAUDE.md yüklenmemişse değerlendirilemez.",
    },
  },
  timeline: {
    title: 'Token Tüketimi — Tur Bazlı',
    cacheRead: 'Cache Okuma',
    input: 'Girdi',
    output: 'Çıktı',
    turn: 'Tur',
    totalTokens: 'Toplam token',
    normal: 'Normal tur',
    retry: 'Retry döngüsü',
    noData: 'Token verisi bulunamadı.',
    tooltip:
      'Her konuşma turunda tüketilen toplam token (girdi + çıktı + önbellek). ' +
      'Kırmızı çubuklar retry döngüsü kapsamındaki turları gösterir.',
  },
  heatmap: {
    title: 'Kural Dikkat Haritası',
    zone: 'Bölge',
    noData: 'CLAUDE.md yüklenmedi — kural haritası gösterilemiyor.',
    deadZoneSuffix: ' - ölü bölge',
    lineLabel: (line: number) => `Satır ${String(line)}:`,
    legendCompliant: 'Uyumlu',
    legendViolation: 'İhlal',
    legendNoData: 'Kural değil',
    legendDeadZone: 'Ölü bölge',
    deadZoneInfo: (zone: number) => `Bölge ${String(zone)} ölü bölge — kurallar burada daha az dikkate alınıyor.`,
    tooltip:
      "Her hücre CLAUDE.md'nin bir satırını temsil eder. Yeşil = kural takip ediliyor, kırmızı = ihlal, " +
      "koyu = kural olmayan satır (yorum, başlık). Kırmızı tonlu hücreler 'ölü bölge' bandında.",
  },
  wasteDonut: {
    title: 'Token Dağılımı',
    total: (tokens: string, cost: string) => `Toplam: ${tokens} token ~ $${cost}`,
    noData: 'Token verisi yok.',
    categories: {
      Productive: 'Üretken',
      ReRead: 'Tekrar Okuma',
      Retry: 'Retry',
      System: 'Sistem',
      Compaction: 'Compaction',
      CacheMiss: 'Cache Miss',
    } as Record<string, string>,
    donutLabel: 'Token dağılımı pasta grafiği',
    tooltip:
      'Oturumdaki tokenların harcama kategorisine göre dağılımı. Üretken: gerçek iş. ' +
      'Tekrar Okuma: aynı dosyayı birden fazla okuma. Retry: başarısız deneme döngüleri. ' +
      'Sistem: Claude altyapı mesajları. Compaction: bağlam özet maliyeti. Cache Miss: önbellekten yararlanılamayan okumalar.',
  },
  rereadTable: {
    title: 'Tekrar Okunan Dosyalar',
    colFile: 'Dosya',
    colTokens: 'Gereksiz Token',
    noData: 'Tekrar okunan dosya yok.',
    tableLabel: 'Tekrar okunan dosyalar tablosu',
    tooltip:
      'Oturum boyunca birden fazla kez okunan dosyalar ve tahmini gereksiz token maliyeti. ' +
      'Her okuma ~800 token harcar. Sarı ile işaretlenen ilk 5 dosya en yüksek maliyete sahip. ' +
      'Sütun başlığına tıklayarak sıralayabilirsiniz.',
  },
  findings: {
    title: (count: number) => `Bulgular (${String(count)})`,
    noData: 'Sorun bulunamadı.',
    turnsLabel: (from: number, to: number) => `Turlar: ${String(from)}–${String(to)}`,
    page: (current: number, total: number) => `Sayfa ${String(current)} / ${String(total)}`,
    prevPage: 'Önceki',
    nextPage: 'Sonraki',
    severity: {
      critical: 'Kritik',
      warn: 'Uyarı',
      info: 'Bilgi',
    } as Record<string, string>,
    tooltip:
      'Analiz motorlarının tespit ettiği sorunlar; KRİTİK → UYARI → BİLGİ sırasıyla listelenir. ' +
      'Her satıra tıklayarak ayrıntı ve kanıt görebilirsiniz. Tur aralığı, hangi konuşma turlarında sorunun yaşandığını belirtir.',
  },
  recommendations: {
    title: (count: number) => `Öneriler (${String(count)})`,
    noData: 'Öneri yok.',
    copyButton: 'Kopyala',
    copyLabel: (action: string) => `"${action}" önerisi panoya kopyala`,
    priority: {
      critical: 'Kritik',
      high: 'Yüksek',
      medium: 'Orta',
      low: 'Düşük',
    } as Record<string, string>,
    tooltip:
      "Bulgulara dayalı önceliklendirilmiş iyileştirme önerileri. KRİTİK/YÜKSEK öneri varsa önce bunları ele alın. " +
      "'Kopyala' butonu öneriyi panoya alır; doğrudan CLAUDE.md veya commit mesajı olarak kullanılabilir.",
  },
  recTexts: {
    retry_waste: {
      action: 'Retry döngülerini ortadan kaldırın',
      detail: 'Model aynı başarısız eylemde döngüye girmesin diye açık hata yönetimi ekleyin. Başlangıçta daha net talimatlar verin.',
    },
    reread_overhead: {
      action: 'İlk okumadan sonra dosya içeriğini önbelleğe alın',
      detail: 'İlk okumadan sonra dosya içeriğini bir değişken veya bellek notuna kaydedin. Aynı dosyayı birden fazla kez okumaktan kaçının.',
    },
    low_compliance: {
      action: 'CLAUDE.md kural ihlallerini inceleyin',
      detail: 'Bu oturumda CLAUDE.md kurallarının bir kısmı çiğnendi. Bir sonraki oturuma geçmeden önce uyum sorunlarını giderin.',
    },
    cache_miss: {
      action: 'Prompt önbellek kullanımını iyileştirin',
      detail: 'Girdi tokenlarının büyük bölümü önbellekten beslenemiyor. Turlar arasında tutarlı ön-ekler kullanarak promptları yeniden yapılandırın.',
    },
    attention_dead_zone: {
      action: 'Görmezden gelinen kuralları CLAUDE.md başına taşıyın',
      detail: "CLAUDE.md'nin ortasına gömülü kurallar genellikle göz ardı edilir. En kritik kuralları dosyanın ilk %20'sine yerleştirin.",
    },
    token_spike: {
      action: 'Büyük token artışlarını araştırın',
      detail: 'Bir veya birden fazla tur ortalamadan çok daha fazla token tüketti. Runaway bağlam veya büyük araç sonuçları için o turları inceleyin.',
    },
    low_score: {
      action: 'Oturum kalitesini kapsamlı gözden geçirin',
      detail: 'Genel SQI düşük. Kaliteyi düşüren örüntüler için oturumun tamamını inceleyin.',
    },
    consecutive_tool_loop: {
      action: 'Her araç çağrısından sonra sonucu doğrulayın',
      detail: 'Ardışık özdeş araç çağrısı döngüsü tespit edildi. Her Read/Edit/Bash çağrısından sonra sonucu kontrol edin ve tekrar çağırmadan önce doğrulama yapın. Dosya içeriklerini bağlam değişkenlerinde saklayarak aynı dosyayı defalarca okumaktan kaçının.',
    },
    error_repeat_loop: {
      action: 'Aynı hata tekrarlandığında strateji değiştirin',
      detail: 'Aynı hata mesajının birden fazla kez oluştuğu tespit edildi. Aynı hata yeniden görüldüğünde aynı başarısız eylemi tekrarlamak yerine farklı bir yaklaşım deneyin. Hata sınıflandırma kurallarını CLAUDE.md dosyasına ekleyin.',
    },
  } as Record<string, { action: string; detail: string }>,
}

const en: typeof tr = {
  nav: {
    upload: 'Upload',
    panel: 'Panel',
    homeLabel: 'CCQuality — Home',
    navLabel: 'Page navigation',
  },
  upload: {
    title: 'Session Analysis',
    subtitle:
      'Upload your Claude Code session file (.jsonl). Optionally add a CLAUDE.md for rule compliance analysis.',
    dropzoneLabel: 'Click or drag a JSONL file to upload',
    dropzoneText: 'Drop your .jsonl file here',
    dropzoneHint: 'or click to browse — max 200 MB',
    addClaudeMd: 'Add CLAUDE.md',
    demoButton: 'Try with demo data',
    errorNotJsonl: 'Please select a file with .jsonl extension.',
    errorTooBig: (mb: string) =>
      `File too large. Maximum size: 200 MB (selected: ${mb} MB)`,
    errorNoJsonl: 'No .jsonl file found among the dragged files.',
    errorDemo: 'Failed to load demo data.',
  },
  dashboard: {
    sessionTitle: (id: string) => `Session Analysis — ${id}`,
    noSession: 'No session uploaded yet.',
    analysisError: (msg: string) => `Analysis error: ${msg}`,
    processing: 'Analysing session...',
    parseError: 'Parse error',
    step: {
      idle: 'Waiting',
      compliance: 'Compliance analysis...',
      retry: 'Scanning retry loops...',
      deadzone: 'Attention dead zones...',
      reread: 'Re-read cost...',
      waste: 'Classifying token waste...',
      scoring: 'Computing SQI...',
      done: 'Analysis complete',
      error: 'Error',
      default: 'Processing...',
    },
  },
  gauge: {
    good: 'Good',
    average: 'Average',
    critical: 'Critical',
    scoreLabel: (score: number, rating: string) => `SQI score: ${String(score)} — ${rating}`,
    subCompliance: 'Comply',
    subRead: 'Read',
    subRetry: 'Retry',
    subAttention: 'Attn',
    subToken: 'Token',
  },
  summaryCards: {
    efficiency: {
      label: 'Token Efficiency',
      description: 'Productive token ratio',
      tooltip:
        "Ratio of tokens spent on actual work to total tokens. " +
        "≥70% good, 40–70% average, <40% critical. Low values indicate retry loops or excessive re-reading.",
    },
    reread: {
      label: 'Re-Read',
      description: 'Extra read cost',
      tooltip:
        'Extra token cost from reading the same files multiple times, as a fraction of total tokens. ' +
        "≤50% acceptable, >200% critical. High values may indicate Claude losing context.",
    },
    retry: {
      label: 'Retry Loops',
      unit: 'loops',
      description: 'Repeated action loops',
      tooltip:
        'Number of loops where the same tool or action failed and was retried. ' +
        '0 is ideal, 1–2 acceptable, >2 critical. Each loop wastes tokens and degrades quality.',
    },
    compliance: {
      label: 'Rule Compliance',
      description: 'CLAUDE.md rules',
      tooltip:
        "How well the session followed the rules in CLAUDE.md (0–100). " +
        "≥80 good, 50–79 average, <50 critical. Not evaluated if no CLAUDE.md was uploaded.",
    },
  },
  timeline: {
    title: 'Token Usage — Per Turn',
    cacheRead: 'Cache Read',
    input: 'Input',
    output: 'Output',
    turn: 'Turn',
    totalTokens: 'Total tokens',
    normal: 'Normal turn',
    retry: 'Retry loop',
    noData: 'No token data found.',
    tooltip:
      'Total tokens consumed per conversation turn (input + output + cache). ' +
      'Red bars indicate turns within a detected retry loop.',
  },
  heatmap: {
    title: 'Rule Attention Heatmap',
    zone: 'Zone',
    noData: 'CLAUDE.md not loaded — heatmap unavailable.',
    deadZoneSuffix: ' - dead zone',
    lineLabel: (line: number) => `Line ${String(line)}:`,
    legendCompliant: 'Compliant',
    legendViolation: 'Violation',
    legendNoData: 'Non-rule line',
    legendDeadZone: 'Dead zone',
    deadZoneInfo: (zone: number) => `Zone ${String(zone)} is a dead zone — rules here receive less attention.`,
    tooltip:
      "Each cell represents one line of CLAUDE.md. Green = rule followed, red = violation, " +
      "dark = non-rule line (comment, heading). Red-tinted cells fall inside the dead zone band.",
  },
  wasteDonut: {
    title: 'Token Distribution',
    total: (tokens: string, cost: string) => `Total: ${tokens} tokens ~ $${cost}`,
    noData: 'No token data.',
    categories: {
      Productive: 'Productive',
      ReRead: 'Re-Read',
      Retry: 'Retry',
      System: 'System',
      Compaction: 'Compaction',
      CacheMiss: 'Cache Miss',
    },
    donutLabel: 'Token distribution pie chart',
    tooltip:
      'Token spend breakdown by category. Productive: real work. Re-Read: reading the same file multiple times. ' +
      'Retry: failed-attempt loops. System: Claude infrastructure messages. ' +
      'Compaction: context summary cost. Cache Miss: reads that bypassed the cache.',
  },
  rereadTable: {
    title: 'Re-Read Files',
    colFile: 'File',
    colTokens: 'Wasted Tokens',
    noData: 'No re-read files.',
    tableLabel: 'Re-read files table',
    tooltip:
      'Files read more than once and their estimated wasted token cost. ' +
      'Each read costs ~800 tokens. The top-5 highest-cost files are highlighted in amber. ' +
      'Click column headers to sort.',
  },
  findings: {
    title: (count: number) => `Findings (${String(count)})`,
    noData: 'No issues found.',
    turnsLabel: (from: number, to: number) => `Turns: ${String(from)}–${String(to)}`,
    page: (current: number, total: number) => `Page ${String(current)} / ${String(total)}`,
    prevPage: 'Previous',
    nextPage: 'Next',
    severity: {
      critical: 'Critical',
      warn: 'Warning',
      info: 'Info',
    },
    tooltip:
      'Issues detected by the analysis engines, listed CRITICAL → WARNING → INFO. ' +
      'Click a row to see details and evidence. Turn range shows which conversation turns contained the issue.',
  },
  recommendations: {
    title: (count: number) => `Recommendations (${String(count)})`,
    noData: 'No recommendations.',
    copyButton: 'Copy',
    copyLabel: (action: string) => `Copy "${action}" recommendation to clipboard`,
    priority: {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    },
    tooltip:
      "Prioritised improvement recommendations based on findings. Address CRITICAL/HIGH items first. " +
      "The 'Copy' button copies the recommendation to the clipboard for direct use in CLAUDE.md or commit messages.",
  },
  recTexts: {
    retry_waste: {
      action: 'Eliminate retry loops',
      detail: 'Add explicit error-handling so the model does not loop on the same failed action. Provide clearer instructions upfront.',
    },
    reread_overhead: {
      action: 'Cache file contents after first read',
      detail: 'Store the file content in a variable or memory note after the first Read. Avoid re-reading the same file multiple times.',
    },
    low_compliance: {
      action: 'Review CLAUDE.md rule violations',
      detail: 'Several rules in CLAUDE.md were broken during this session. Address compliance issues before the next session.',
    },
    cache_miss: {
      action: 'Improve prompt cache utilisation',
      detail: 'Most input tokens are not being served from cache. Structure prompts to reuse consistent prefixes across turns.',
    },
    attention_dead_zone: {
      action: 'Move ignored rules to the top of CLAUDE.md',
      detail: 'Rules buried in the middle of CLAUDE.md tend to be ignored. Place the most important rules in the first 20% of the file.',
    },
    token_spike: {
      action: 'Investigate large token spikes',
      detail: 'One or more turns consumed significantly more tokens than average. Inspect those turns for runaway context or large tool results.',
    },
    low_score: {
      action: 'Conduct a session quality review',
      detail: 'Overall SQI is low. Review the full session for patterns that reduce quality.',
    },
    consecutive_tool_loop: {
      action: 'Verify result after each tool call',
      detail: 'Consecutive identical tool-call loops detected. After each Read/Edit/Bash invocation, check the result before calling again. Store file contents in context variables to avoid re-reading the same file on subsequent turns.',
    },
    error_repeat_loop: {
      action: 'Change strategy when the same error recurs',
      detail: 'The same error message appeared multiple times. When the same error appears again, try a different approach instead of repeating the same failed action. Add error-classification rules to CLAUDE.md.',
    },
  } as Record<string, { action: string; detail: string }>,
}

export const translations: Record<Lang, typeof tr> = { tr, en }
export type Translations = typeof tr
