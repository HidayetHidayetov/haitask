# HAITASK — PM roadmap & ideas

Product-minded təkliflər: nə edə bilərik, nəni genişlədə bilərik.

---

## 1. Tez qələbələr (aşağı səy, böyük təsir)

| Təklif | Səbəb |
|--------|--------|
| **`haitask check` / `haitask validate`** | Konfiq və env-i yoxlayır, pipeline işə salmır. CI-da "config OK" və ya xəta verir. Fail fast. |
| **`haitask run --dry --json`** | Dry run çıxışı JSON (məs. `{"wouldCreate": true, "title": "...", "key": null}`). CI/skriptlər üçün parse etmək asan. |
| **Init preset** | `haitask init --preset jira` və ya `--preset trello-groq` — sual vermədən default-larla `.haitaskrc` yaradır. Sonra istifadəçi yalnız `.env` doldurur. |
| **README: GitHub Action nümunəsi** | Bir blok: "Run haitask after push" — workflow snippet. Komandalar avtomatik işləyəndə adoption artır. |

---

## 2. Məhsul genişləndirmə (yeni funksionallıq)

| Təklif | Təsvir |
|--------|--------|
| **Daha çox target** | **GitHub Issues**, **Asana**, **Notion** — eyni adapter modeli (`createTask`, `addComment`). Hər biri ayrı client + backend-də branch. |
| **Eyni commit → bir neçə target** | `.haitaskrc`-də `targets: ['jira', 'linear']` — bir `haitask run` hər ikisində task açar. Cross-team senkron. |
| **Prioritet mapping** | AI-dan gələn `priority` (High/Medium/Low) → Jira/Linear prioritet sahəsinə map. Konfiqda `priorityMap` (opsional). |
| **Label/tag-dan istifadə** | AI artıq `labels` qaytarır; Jira-da label/component, Linear-da label kimi yazmaq (API dəstəyində). Daha yaxşı filtrlənmə. |
| **Custom AI prompt** | `.haitaskrc`-də `ai.systemPrompt` / `ai.userPromptOverride` — şirkət üçün öz təlimatı. Enterprise. |
| **Changelog / release notes** | `haitask changelog --commits 10` — son N commit-dən markdown changelog (task yaratmır). Release doc üçün. |

---

## 3. Etibarlılıq və təcrübə ✅

| Təklif | Təsvir | Status |
|--------|--------|--------|
| **Retry** | Task yaradarkən şəbəkə xətası olsa 1–2 dəfə retry (exponential backoff). Uçucu xətaları azaldır. | ✅ `withRetry` in backend; adapters throw with `.status`; 5xx/429/network retried. |
| **Idempotency** | Eyni commit hash üçün artıq task açılıbsa, yenidən açma (və ya "already created" mesajı). Duplikat taskların qarşısı. | ✅ `.git/haitask-state.json`; skip create if same `commitHash`; "Already created for this commit: KEY". |
| **Daha aydın xəta mesajları** | API 401/403/404 üçün konkret təklif: "Check JIRA_API_TOKEN", "Check project key", və s. | ✅ `utils/http-hints.js`; Jira/Trello/Linear 401/403/404 hints in error message. |

---

## 4. Vizibilite və komanda

| Təklif | Təsvir |
|--------|--------|
| **Slack/Discord webhook** | Task yaradılandan sonra (opsional) webhook URL-ə qısa mesaj: "Task PROJ-123 created from commit …". Komandaya görünürlük. |
| **Opt-in telemetry** | Anonim: target (jira/trello/linear), AI provider. Roadmap prioritizasiyası üçün; default off, `HAITASK_TELEMETRY=1` ilə açılır. |

---

## 5. Developer experience

| Təklif | Təsvir |
|--------|--------|
| **.haitaskrc formatı** | JSON əlavə YAML dəstəyi (bəziləri YAML üçün daha rahat). Alternativ: JSON-da qalıb, README-də YAML nümunəsi. |
| **Env template seçimi** | `haitask init` zamanı "Which target?"-dan sonra bir neçə target üçün `.env` nümunəsi (jira+trello) — çox layihəli istifadəçi üçün. |
| **Docs site** | Sadə: GitHub Pages və ya bir "Documentation" bölməsi README-də / docs/ — Install, Config, Troubleshooting, FAQ. Axtarış və onboarding üçün. |

---

## Prioritet təklifi (PM baxışından)

1. **İlk növbədə:** `haitask check`, README-də GitHub Action nümunəsi, init preset (məs. `--preset jira`). Az kod, böyük UX qazancı.
2. **Sonra:** GitHub Issues adapter, prioritet mapping, retry. Məhsulu gücləndirir.
3. **Daha sonra:** Changelog əmri, multi-target, Slack webhook. Genişləndirmə və "team" use-case.

Bu faylı istədiyin kimi dəyişə və roadmap kimi istifadə edə bilərsən.
