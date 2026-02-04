# HAITASK — İstifadə təlimatı

Bu sənəd HAITASK-ı real layihələrdə (o cümlədən Laravel) necə işlətməyi izah edir.

---

## 1. Nə edir?

- **Git** — son commit mesajını və branch-i oxuyur
- **AI** — commit əsasında Jira task başlığı, təsvir və label-lar yaradır
- **Jira** — həmin task-ı Jira-da avtomatik yaradır

**Tipik axın:** Commit edirsin → `haitask run` işlədirsən → Jira-da task görünür.

---

## 2. Quraşdırma (bir dəfə)

### 2.1 HAITASK-ı yerləşdirmək

**Variant A — global (bütün layihələrdə işlətmək üçün):**

```bash
cd /path/to/haitask
npm install
npm link
```

Sonra istənilən qovluqda `haitask` əmri işləyəcək.

**Variant B — hər dəfə layihə qovluğundan:**

```bash
cd /path/to/haitask
npm install
# haitask əvəzinə: node /path/to/haitask/src/index.js
```

**Variant C — npx ilə (haitask npm-ə publish olunanda):**

```bash
npx haitask init
npx haitask run
```

### 2.2 Konfiqurasiya

```bash
cd /path/to/haitask
cp .env.example .env
# .env-i redaktə et: GROQ_API_KEY (və ya DEEPSEEK/OPENAI), JIRA_* dəyişənləri
haitask init   # .haitaskrc yaradır
```

`.haitaskrc`-ı layihəyə uyğun düzəlt (Jira project key, branch-lər, commit prefix-lər).

---

## 3. Laravel (və ya istənilən) layihəsində istifadə

Fərq yoxdur — HAITASK Git commit və Jira ilə işləyir, Laravel koduna toxunmur. Addımlar eynidir.

### 3.1 Bir dəfə hazırlıq

1. **Laravel layihə qovluğuna keç:**

   ```bash
   cd /path/to/my-laravel-project
   ```

2. **HAITASK konfiqini bu layihə üçün yarat:**

   - Əgər `haitask` global quraşdırılıbsa: `haitask init`
   - Əks halda: `node /path/to/haitask/src/index.js init`

   Bu, **cari qovluqda** `.haitaskrc` yaradır (artıq varsa üstünə yazmır).

3. **`.haitaskrc` və `.env`:**

   - `.haitaskrc` bu layihədə olmalıdır (və ya haitaskın işlədiyi qovluqda).
   - `.env` isə **haitaskın öz qovluğunda** olur (API açarları orada).  
   **Alternativ:** Laravel layihə qovluğunda da `.env` yaratıb orada `JIRA_*`, `GROQ_API_KEY` və s. saxlaya bilərsən; sonra `haitask run`-ı həmin qovluqdan işlədəndə dotenv cari qovluqdan oxuyacaq.

   Praktikada ən sadə yol: **haitaskı bir qovluqda saxla, .env orada olsun;** Laravel (və ya başqa) layihədə yalnız `.haitaskrc` olsun və `haitask run`-ı həmin layihə qovluğundan işlətsən (aşağıda izah).

### 3.2 Hər commit-dən sonra

1. Dəyişiklikləri commit et (conventional commit istəyə görə):

   ```bash
   git add .
   git commit -m "feat: add user profile endpoint"
   ```

2. Jira task yaratmaq üçün:

   ```bash
   haitask run
   ```

   Əgər haitask global deyilsə:

   ```bash
   node /path/to/haitask/src/index.js run
   ```

   Bu əmr:

   - Cari Git branch və son commit mesajını oxuyur
   - `.haitaskrc`-dakı qaydalara görə yoxlayır (branch, prefix)
   - AI ilə task mətni yaradır
   - Jira-da issue yaradır

**Dry run (Jira-da task yaratmadan sınaq):**

```bash
haitask run --dry
```

---

## 4. Laravel ilə tam nümunə axını

Tutaq ki, Laravel layihən `~/projects/my-app`-dadır, haitask isə `~/projects/haitask`-dadır.

```bash
# 1) Bir dəfə: haitaskda .env və init
cd ~/projects/haitask
cp .env.example .env
# .env-i doldur (GROQ_API_KEY, JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)
node src/index.js init

# 2) Laravel layihəyə keç, .haitaskrc yarat (haitaskın cwd-si Laravel qovluğu olsun)
cd ~/projects/my-app
node ~/projects/haitask/src/index.js init
# Bu, my-app içində .haitaskrc yaradır

# 3) .haitaskrc-ı Laravel/Jira üçün düzəlt (jira.projectKey, rules və s.)

# 4) İş gördükcə commit et, sonra task yarat
git add .
git commit -m "feat: add orders export"
node ~/projects/haitask/src/index.js run
```

İstəsən `package.json`-da script qoyarsan:

```json
"scripts": {
  "jira": "node ../haitask/src/index.js run",
  "jira:dry": "node ../haitask/src/index.js run --dry"
}
```

Sonra Laravel qovluğundan: `npm run jira` və ya `npm run jira:dry`.

---

## 5. Qaydalar (.haitaskrc)

- **allowedBranches** — yalnız bu branch-lərdə `haitask run` işləsin (məs. `main`, `develop`, `master`).
- **commitPrefixes** — yalnız bu prefix-lərlə başlayan commit-lər üçün task yaradılsın (məs. `feat`, `fix`, `chore`).

Commit `feat: add login` kimi olanda prefix `feat` olduğu üçün qaydaya uyğundur; `WIP stuff` uyğun deyil.

---

## 6. Git hook ilə avtomatik işlətmək (isteğə bağlı)

Hər commit-dən sonra avtomatik Jira task yaratmaq istəyirsinə:

```bash
cd /path/to/my-laravel-project
echo 'node /path/to/haitask/src/index.js run' >> .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

Diqqət: post-commit hook hər commit-də işləyər; bəzən yalnız bəzi branch/prefix-lərdə işləmək üçün hook içində `haitask run` əvəzinə kiçik skript yazıb branch/commit yoxlaya bilərsən. Və ya manual `haitask run` saxlamaq daha təhlükəsiz ola bilər.

---

## 7. Xülasə

| Addım | Harada | Əmr |
|-------|--------|-----|
| Bir dəfə quraşdırma | haitask qovluğu | `npm install`, `cp .env.example .env`, `.env` doldur |
| Bir dəfə init | Laravel (və ya istənilən) layihə qovluğu | `haitask init` (və ya `node .../haitask/src/index.js init`) |
| Konfiq | Həmin layihə | `.haitaskrc` redaktə (Jira project, branch, prefix) |
| Commit | Həmin layihə | `git commit -m "feat: ..."` |
| Jira task | Həmin layihə | `haitask run` (və ya `npm run jira`) |

Laravel xüsusi bir konfiq tələb etmir — HAITASK yalnız Git və Jira ilə işləyir, kod dilindən asılı deyil.
