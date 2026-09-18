# Merge `_news`/`_essays` into `_posts` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the `_news` and `_essays` Jekyll collections into `_posts`, keeping every existing URL, the three separate listings/archives, and both CMS configs' editor-facing structure unchanged.

**Architecture:** News and essay files physically relocate to `_posts/noticias/` and `_posts/textos/` (blog posts stay at `_posts/` root, untouched). A new `category` front-matter field (`Blog`/`Notícias`/`Textos`), injected by path-scoped `_config.yml` defaults, replaces Jekyll-collection identity as the discriminator that listings, sidebars, and archive pages filter on. Essays' existing subcategory field is renamed from `category` to `tags`, stored as a one-item YAML list (not a scalar — Jekyll's reserved-key normalization word-splits scalar `tags` values, corrupting multi-word ones), to free up `category` for that purpose; its two `/textos/:subcat/` archive pages move from buggy site-wide `autopages.categories` to two explicit paginated `_pages`.

**Tech Stack:** Jekyll 4.4, jekyll-paginate-v2, jekyll-redirect-from, Decap CMS (`admin/config.yml`), Pages CMS (`.pages.yml`).

**Spec:** `docs/superpowers/specs/2026-09-18-merge-news-essays-into-posts-design.md`

## Global Constraints

- No permalink changes anywhere — not on individual posts/news/essays, not on archive or autopages-generated pages.
- No automated test suite exists for this repo (per `CLAUDE.md`). "Test" steps in this plan mean: `bundle exec jekyll build` succeeds, plus `grep`/diff checks against the generated `_site/` output. There is no unit-test framework to invoke.
- No git steps (`git add`/`git commit`) are included in this plan's tasks — the user commits manually at their own pace. File relocation uses plain `mv`, not `git mv`; git will still detect renames by content when eventually staged.
- Every new/changed front-matter field name and value used in later tasks must exactly match what earlier tasks establish: `category` ∈ {`Blog`, `Notícias`, `Textos`}; essays' subcategory field is named `tags`, values `Textos sobre Cinema` / `Roteiros`, stored as a **one-item YAML list** (`tags:\n  - Roteiros`), not a scalar — see Task 1 Step 4's rationale (Jekyll word-splits scalar `tags` values).

---

## Baseline

A pre-migration production build has already been captured for diffing in Task 9:

```bash
JEKYLL_ENV=production bundle exec jekyll build --destination /tmp/_site_check
```

If `/tmp/_site_check` is no longer present when you reach Task 9, regenerate it from the commit before this plan's changes begin.

---

### Task 1: Config foundation + content relocation

**Files:**
- Modify: `_config.yml`
- Move: `_news/*.md` → `_posts/noticias/*.md` (plain `mv`, not `git mv`)
- Move: `_essays/*.md` → `_posts/textos/*.md` (plain `mv`)
- Modify: every file now under `_posts/textos/` (front-matter key rename)

**Interfaces:**
- Produces: front-matter field `category`, values `Blog` (posts), `Notícias` (news), `Textos` (essays) — injected automatically by path-scoped defaults for any file under `_posts/`, `_posts/noticias/`, `_posts/textos/` respectively. Produces: essays' subcategory now under front-matter key `tags` as a one-item YAML list (e.g. `tags:\n  - Roteiros`), replacing the old `category: Roteiros`.
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Edit `_config.yml` — collections, defaults, pagination, autopages**

Remove the `news` and `essays` entries from `collections:`:

```diff
 collections:
-  news:
-    output: true
-    sort_by: date
-    permalink: "/noticias/:name/"
-  essays:
-    output: true
-    sort_by: date
-    permalink: "/textos/:title/"
   banners:
     output: false
     sort_by: date
   projects:
     output: true
     sort_by: title
     permalink: "/filmes/:title/"
   people:
     output: false
```

Shrink the pagination collection list:

```diff
 pagination:
   enabled: true
   collection:
     - posts
-    - essays
-    - news
   per_page: 12
```

Disable the categories autopages feature (nothing will use it after this migration — its removal also stops the pre-existing leak of `_projects`/`_people` category values into `/textos/<cat>/`, confirmed via a baseline build):

```diff
 autopages:
   enabled: true
   categories:
-    enabled: true
+    enabled: false
     layouts:
       - archive.html
     title: ":cat"
     permalink: "/textos/:cat/"
     slugify:
       mode: default
       cased: true
```

Add three path-scoped defaults, placed after the existing `type: "posts"` / `type: "news"` / `type: "projects"` entries (order matters — general first, specific after, so the more specific scope wins):

```diff
   - scope:
       path: ""
       type: "projects"
     values:
       layout: "project"
+  - scope:
+      path: "_posts"
+    values:
+      category: Blog
+  - scope:
+      path: "_posts/noticias"
+    values:
+      category: Notícias
+      permalink: "/noticias/:name/"
+  - scope:
+      path: "_posts/textos"
+    values:
+      category: Textos
+      permalink: "/textos/:title/"
```

**Correction, found during implementation:** essays must keep `:title`, not `:name` — `:name` is `slugify(<filename>)` unconditionally, it never strips a date, for any collection. Essays' original permalink used `:title` (resolves via `data["slug"]`, which Jekyll date-strips for any document), which is why their URLs are date-free; `:name` is correct for `_posts/noticias` only because news's original permalink was already `:name` (its production URLs already carry a date prefix). Using `:name` for both, as an earlier draft of this task did, broke all 130 essay URLs — caught by the Task 1 implementer and independently confirmed by the controller against Jekyll 4.4.1 source and a baseline-diffed build before Task 1 was marked complete.

(The now-dead `type: "news"` default block above can stay — it's harmless once nothing is registered as a `news` collection, Jekyll simply never matches it — but delete it now if you'd rather keep the file tidy; either is correct.)

- [ ] **Step 2: Verify the build still succeeds with no content moved yet**

Run: `bundle exec jekyll build --destination /tmp/_build_task1`
Expected: build succeeds (exit 0). `/tmp/_build_task1/noticias/` and `/tmp/_build_task1/textos/` will be near-empty (their source files haven't moved yet — expected, not a bug) — ignore that for this step, it's fixed in Step 4.

- [ ] **Step 3: Move the content**

```bash
mkdir -p _posts/noticias _posts/textos
mv _news/*.md _posts/noticias/
mv _essays/*.md _posts/textos/
rmdir _news _essays
```

- [ ] **Step 4: Rename essays' `category` field to `tags`, as a one-item YAML list**

Every file in `_posts/textos/` has a front-matter line of the exact form `category: <value>` (value is either `Textos sobre Cinema` or `Roteiros`, no quotes, per the existing files). **Must produce a real YAML list, not a scalar** — `tags` is a Jekyll-reserved key; a scalar value gets whitespace-split by Jekyll's own normalization (`Utils.value_from_plural_key`), which shatters `"Textos sobre Cinema"` into three separate words. A real list element is never re-split. Rename the key in place with a list-producing transform:

```bash
find _posts/textos -name '*.md' -print0 | while IFS= read -r -d '' f; do
  awk '
    /^category: / { sub(/^category: /, ""); print "tags:"; print "  - " $0; next }
    { print }
  ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
```

- [ ] **Step 5: Verify the rename**

```bash
grep -rl '^category:' _posts/textos/                      # expect: no output (no leftover `category:` keys)
grep -rL '^tags:$'     _posts/textos/                      # expect: no output (every file has a `tags:` list header)
for f in _posts/textos/*.md; do
  awk '/^tags:$/{getline; if ($0 !~ /^  - /) print FILENAME}' "$f"
done   # expect: no output (every `tags:` header is immediately followed by exactly one `  - <value>` list item)
```

- [ ] **Step 6: Verify relocated content picks up the right category + permalink**

```bash
bundle exec jekyll build --destination /tmp/_build_task1
```

Note: `_config.yml` defaults are applied at *build time*, not written back into the source `.md` files — the files themselves still have no `category:` line, and that's correct (Step 1's defaults inject it). Nothing renders `category` in a template yet (that starts in Task 2), so the useful check here is structural — confirm every URL still resolves at its old path:

```bash
ls /tmp/_build_task1/noticias/ | head -3         # expect: migrated news slugs, one dir per article
ls /tmp/_build_task1/textos/ | head -3           # expect: migrated essay slugs, one dir per article
diff <(cd /tmp/_site_check/noticias && find . -maxdepth 1 -type d | sort) \
     <(cd /tmp/_build_task1/noticias && find . -maxdepth 1 -type d | sort)
# expect: no diff — every noticia URL from the baseline still exists
diff <(cd /tmp/_site_check/textos && find . -maxdepth 1 -type d | sort) \
     <(cd /tmp/_build_task1/textos && find . -maxdepth 1 -type d | sort) \
     | grep -v '^[<>] \./\(longas-metragens\|médias-metragens\|curtas-metragens\|coproduções\|séries\|origens\|distribuição\|coleções\|projetos\|episódios\|socios\|funcionarios\|equipes\|elencos\|passado\)$'
# expect: no diff once the known stray autopages.categories pages (now removed by Step 1) are filtered out
```

Known-acceptable state after this task: `/blog/` will temporarily show news and essay content mixed in (its pagination front matter still says `collection: posts` with no category filter — fixed in Task 4), and `/noticias/`, `/textos/` listing pages will be empty (still reference the now-unregistered `news`/`essays` collections in their own pagination config — fixed in Task 4). This is expected and resolved by the end of Task 4, not a Task 1 defect.

---

### Task 2: `archive/post.html` + `archive/sidebar.html`

**Files:**
- Modify: `_includes/archive/post.html`
- Modify: `_includes/archive/sidebar.html`

**Interfaces:**
- Consumes: `page.category` / `post.category` (`Blog`/`Notícias`/`Textos`, from Task 1). Consumes: `post.tags` (one-item Array, essays only, from Task 1 — Jekyll always casts `tags` to an Array regardless of how it's declared, so treat it as one from here on: use `contains` for membership, `[0]` for "the one value").
- Produces: nothing new consumed by later tasks — this is display logic.

**Correction, found during implementation:** the diffs below originally used `post.tags == "Roteiros"` and `group_by: "tags"`, matching the field name Task 1 established but not Jekyll's actual runtime type for that field. `post.tags` is always an Array once Jekyll processes it (even from a scalar front-matter value) — `==` against a bare string is never true, so the Roteiros special case was dead code, and grouping by the raw Array field renders its Ruby inspect form (`["Textos", "sobre", "Cinema"]`) as visible link text. Fixed below to use `contains` and `group_by_exp` accordingly; this is independent of the separate scalar-vs-list fix already applied to the data in Task 1 Step 4 — both were needed together.

- [ ] **Step 1: Update the Roteiros full-content special case in `archive/post.html`**

```diff
-  {% if post.category == "Roteiros" %}
+  {% if post.tags contains "Roteiros" %}
     <div class="post_content">
       {{ post.content | markdownify }}
     </div>
   {% endif %}
```

- [ ] **Step 2: Update `archive/sidebar.html`'s branching**

Replace the collection-based checks with `category`-based ones (covers both listing pages via `page.pagination.category` and individual post pages via `page.category`):

```diff
 <aside class="blog_sidebar">
-  {%- if page.pagination.collection == "news" or page.collection == "news" -%}
+  {%- if page.category == "Notícias" or page.pagination.category == "Notícias" -%}

     {%- assign years = site.news | group_by_exp: "item", "item.date | date: '%Y'" | reverse -%}
```

```diff
-  {%- elsif page.pagination.collection == "posts" or page.collection == "posts" or page.layout == "author" -%}
+  {%- elsif page.category == "Blog" or page.pagination.category == "Blog" or page.layout == "author" -%}
     {%- assign authors = site.posts | group_by: "author" -%}
```

```diff
   {%- else -%}
-    {%- assign categories = site.essays | group_by: "category" | reverse -%}
+    {%- assign essays = site.posts | where: "category", "Textos" -%}
+    {%- assign subcats = essays | group_by_exp: "item", "item.tags[0]" | reverse -%}

     <div class="sidebar_widget">
       <h4 class="widget_title">Categorias</h4>

       <div class="widget_content">
         <ul class="archive_list">
-          {%- for category in categories -%}
+          {%- for subcat in subcats -%}

             <li>
-              <a href="{{ category.name | slugify | prepend: "/textos/" | relative_url }}">{{ category.name }}</a>
+              <a href="{{ subcat.name | slugify | prepend: "/textos/" | relative_url }}">{{ subcat.name }}</a>
             </li>
           {%- endfor -%}
```

And its matching years block, and the news branch's `site.news`, both need to become `site.posts` filtered by `category` (Task 1 removed `site.news`/`site.essays` as real collections — they now evaluate to `nil`/empty, which would silently render empty widgets rather than error, but must be fixed to show real data):

```diff
-  {%- if page.category == "Notícias" or page.pagination.category == "Notícias" -%}
-
-    {%- assign years = site.news | group_by_exp: "item", "item.date | date: '%Y'" | reverse -%}
+  {%- if page.category == "Notícias" or page.pagination.category == "Notícias" -%}
+
+    {%- assign years = site.posts | where: "category", "Notícias" | group_by_exp: "item", "item.date | date: '%Y'" | reverse -%}
```

```diff
-    {%- assign years = site.essays | group_by_exp: "item", "item.date | date: '%Y'" | reverse -%}
+    {%- assign years = essays | group_by_exp: "item", "item.date | date: '%Y'" | reverse -%}
```

(This last one reuses the `essays` variable already assigned above in the same `else` branch — no need to re-filter `site.posts` a second time.)

- [ ] **Step 3: Verify**

```bash
bundle exec jekyll build --destination /tmp/_build_task2
```

Expected: build succeeds, no Liquid errors.

**Important:** `archive/post.html` (Step 1's Roteiros special case) is only included from `_layouts/blog.html` and `_layouts/archive.html` — i.e. listing pages. It is NOT included by `_layouts/post.html`, which individual post/news/essay permalink pages use. Task 4 is what points the `/textos/` listing at real Textos content; until then, no real page in the build exercises Step 1's change. Verify it directly instead, with a temporary throwaway test page (delete it before finishing, it is not part of this task's diff):

```yaml
# _pages/zz-task2-verify.md — TEMPORARY, delete after checking
---
layout: page
permalink: /zz-task2-verify/
---
{% assign post = site.posts | where: "tags", "Roteiros" | first %}
CONTAINS-CHECK: {% if post.tags contains "Roteiros" %}MATCH{% else %}NO-MATCH{% endif %}
```

```bash
bundle exec jekyll build --destination /tmp/_build_task2
grep 'CONTAINS-CHECK' /tmp/_build_task2/zz-task2-verify/index.html
# expect: CONTAINS-CHECK: MATCH
rm _pages/zz-task2-verify.md
```

`archive/sidebar.html` (Step 2), by contrast, IS included by `_layouts/post.html` — so it's already exercised for real on any individual essay's own page. Check one directly:

```bash
# A news article's sidebar should show the year-archive widget, not author/blog widgets
grep -A2 'widget_title' "/tmp/_build_task2/noticias/$(ls _posts/noticias | head -1 | sed -E 's/\.md$//')/index.html"

# An essay's sidebar "Categorias" widget should show clean subcategory text, not a raw Array
grep -A6 'Categorias' "/tmp/_build_task2/textos/$(ls _posts/textos | grep -i roteiro | head -1 | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//; s/\.md$//')/index.html"
# expect: link text reads "Textos sobre Cinema" / "Roteiros" — NOT ["Textos", "sobre", ...]-style array literals
```

(News permalinks keep their date prefix per Task 1's `:name`-based permalink — don't strip it when building the path above. Essay permalinks strip it, per Task 1's `:title`-based permalink.)

---

### Task 3: `lists/posts.html` + the three `arquivo` pages

**Files:**
- Modify: `_layouts/lists/posts.html`
- Modify: `_pages/arquivo.md`
- Modify: `_pages/arquivo-de-noticias.md`
- Modify: `_pages/arquivo-de-textos.md`

**Interfaces:**
- Consumes: `page.category` (front matter on the three `arquivo*.md` pages, new in this task) and `post.category` (from Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Update `_layouts/lists/posts.html`'s collection lookup**

```diff
-{%- if page.collection -%}
-  {% assign collection = site[page.collection] | reverse %}
-{% else %}
-  {% assign collection = site.posts | reverse %}
-{% endif %}
+{%- if page.category -%}
+  {% assign collection = site.posts | where: "category", page.category | reverse %}
+{% else %}
+  {% assign collection = site.posts | reverse %}
+{% endif %}
```

- [ ] **Step 2: Update `_pages/arquivo.md`**

```diff
 ---
 layout: lists/posts
 title: Arquivo do Blog
 permalink: "/blog/arquivo/"
+category: Blog
 ---

-O [Blog da Casa](/blog/) possui **{{ site.posts | size }} textos**. Aqui você encontra uma lista de todos eles.
+O [Blog da Casa](/blog/) possui **{{ site.posts | where: "category", "Blog" | size }} textos**. Aqui você encontra uma lista de todos eles.
```

- [ ] **Step 3: Update `_pages/arquivo-de-noticias.md`**

```diff
 ---
 layout: lists/posts
 title: Arquivo de Notícias
 permalink: "/noticias/arquivo/"
-collection: news
+category: Notícias
 ---

-Existem **{{ site.news | size }} notícias** nesse arquivo.
+Existem **{{ site.posts | where: "category", "Notícias" | size }} notícias** nesse arquivo.
```

- [ ] **Step 4: Update `_pages/arquivo-de-textos.md`**

```diff
 ---
 layout: lists/posts
 title: Arquivo de Textos
 permalink: "/textos/arquivo/"
-collection: essays
+category: Textos
 ---

-Existem **{{ site.essays | size }} textos** nesse arquivo.
+Existem **{{ site.posts | where: "category", "Textos" | size }} textos** nesse arquivo.
```

- [ ] **Step 5: Verify**

```bash
bundle exec jekyll build --destination /tmp/_build_task3
grep -c '<p class="post">' /tmp/_build_task3/blog/arquivo/index.html
grep -c '<p class="post">' /tmp/_build_task3/noticias/arquivo/index.html
grep -c '<p class="post">' /tmp/_build_task3/textos/arquivo/index.html
```

Expected: three non-zero counts, roughly matching the file counts in `_posts/` (root), `_posts/noticias/`, `_posts/textos/` respectively — cross-check with:

```bash
ls _posts/*.md | wc -l
ls _posts/noticias/*.md | wc -l
ls _posts/textos/*.md | wc -l
```

---

### Task 4: Listing pages' pagination front matter

**Files:**
- Modify: `_pages/blog.md`
- Modify: `_pages/noticias.md`
- Modify: `_pages/textos.md`

**Interfaces:**
- Consumes: `category` (from Task 1); this task is what makes Task 1's "known-acceptable temporary breakage" note resolve.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Update `_pages/blog.md`**

```diff
 pagination:
   enabled: true
   collection: posts
+  category: Blog
 show_content: "excerpt"
 show_tags: true
```

- [ ] **Step 2: Update `_pages/noticias.md`**

```diff
 pagination:
   enabled: true
-  collection: news
+  collection: posts
+  category: Notícias
 show_content: "excerpt"
```

- [ ] **Step 3: Update `_pages/textos.md`**

```diff
 pagination:
   enabled: true
-  collection: essays
+  collection: posts
+  category: Textos
 show_content: false
```

- [ ] **Step 4: Verify**

```bash
bundle exec jekyll build --destination /tmp/_build_task4
grep -c 'blog_post' /tmp/_build_task4/blog/index.html
grep -c 'blog_post' /tmp/_build_task4/noticias/index.html
grep -c 'blog_post' /tmp/_build_task4/textos/index.html
```

Expected: each is non-zero and ≤ 12 (per-page limit). Then confirm no cross-contamination — grab one known news title and one known essay title and check they do NOT appear on `/blog/`:

```bash
NEWS_TITLE=$(grep -m1 '^title:' _posts/noticias/2026-09-16-a-comedia-da-vida-privada-entra-no-catalogo-do-globo-play.md | sed 's/^title: //')
grep -F "$NEWS_TITLE" /tmp/_build_task4/blog/index.html
# expect: no output
```

---

### Task 5: New essay subcategory pages

**Files:**
- Create: `_pages/textos-sobre-cinema.md`
- Create: `_pages/roteiros.md`

**Interfaces:**
- Consumes: `tags` (one-item YAML list, from Task 1), the `blog` layout (unchanged, existing).
- Produces: pages at `/textos/textos-sobre-cinema/` and `/textos/roteiros/`, matching the URLs previously produced by `autopages.categories` (now disabled per Task 1).

- [ ] **Step 1: Create `_pages/textos-sobre-cinema.md`**

```markdown
---
layout: blog
title: Textos sobre Cinema
permalink: "/textos/textos-sobre-cinema/"
pagination:
  enabled: true
  collection: posts
  tag: "Textos sobre Cinema"
show_content: false
---
```

- [ ] **Step 2: Create `_pages/roteiros.md`**

```markdown
---
layout: blog
title: Roteiros
permalink: "/textos/roteiros/"
pagination:
  enabled: true
  collection: posts
  tag: "Roteiros"
show_content: false
---
```

- [ ] **Step 3: Verify**

```bash
bundle exec jekyll build --destination /tmp/_build_task5
diff <(cd /tmp/_site_check/textos/textos-sobre-cinema && find . -maxdepth 1 | sort) \
     <(cd /tmp/_build_task5/textos/textos-sobre-cinema && find . -maxdepth 1 | sort)
diff <(cd /tmp/_site_check/textos/roteiros && find . -maxdepth 1 | sort) \
     <(cd /tmp/_build_task5/textos/roteiros && find . -maxdepth 1 | sort)
```

Expected: no diff for either — both pages exist at the same paths as before, structurally.

```bash
grep -c 'blog_post' /tmp/_build_task5/textos/textos-sobre-cinema/index.html
grep -c 'blog_post' /tmp/_build_task5/textos/roteiros/index.html
```

Expected: both non-zero.

---

### Task 6: `_redirects`

**Files:**
- Modify: `_redirects`

**Interfaces:**
- Consumes: `site.posts` (now includes migrated news content, from Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Remove the now-redundant `site.news` loop**

```diff
 {%- for post in site.posts -%}
 {%- if post.redirect_from -%}

 {{ post.redirect_from }}       {{ post.url | relative_url }}       301

 {% endif -%}
 {%- endfor -%}

 {%- for project in site.projects -%}
 {%- if project.redirect_from -%}
 {{- project.redirect_from }}       {{ project.url | relative_url }}       301
 {% endif -%}
 {%- endfor -%}

-{%- for news in site.news -%}
-{%- if news.redirect_from -%}
-{{- news.redirect_from }}       {{ news.url | relative_url }}       301
-{% endif -%}
-{%- endfor -%}
-
 /o-blog/giba-assis-brasil.html    /blog/giba    301
```

- [ ] **Step 2: Verify**

```bash
bundle exec jekyll build --destination /tmp/_build_task6
diff /tmp/_site_check/_redirects /tmp/_build_task6/_redirects
```

Expected: no diff (the merged `site.posts` loop produces byte-identical output to the old split loops, since no post/news doc in this repo currently sets `redirect_from` — confirm that assumption first if the diff is non-empty: `grep -rl redirect_from _posts/noticias/` should return nothing).

---

### Task 6b: `archive/pagination.html` + homepage (`index.html`)

**Inserted after execution began** — found during Task 6's review, which grepped broadly for `site.news`/`site.essays`/`page.collection` and turned up two live files no task in the original plan covered. Both have the exact same collection-identity problem Task 2 already fixed in `archive/sidebar.html`, just never ported to these siblings when the plan was written.

**Files:**
- Modify: `_includes/archive/pagination.html`
- Modify: `index.html`

**Interfaces:**
- Consumes: `page.category` / `page.pagination.category` (from Task 1/4, same contract Task 2 already consumes).
- Produces: nothing consumed by later tasks — display logic, like Task 2.

**Bug 1 — `_includes/archive/pagination.html`.** Included by `_layouts/blog.html`, `_layouts/archive.html`, and `_layouts/author.html` (all live layouts — `blog.html` backs `/blog/`, `/noticias/`, `/textos/`; `author.html` backs the auto-generated author archive pages). It branches on `page.pagination.collection`/`page.collection` values `"news"`/`"essays"`/`"posts"` to pick which archive-link URL to show at the bottom of a paginated listing. Since Task 4 set every listing page's pagination `collection:` to the literal string `"posts"` (needed for the `category:` filter to work at all — see Task 4), this component's `"news"` and `"essays"` branches are now permanently unreachable, and its `"posts"` branch fires for all three listings — every paginated page, regardless of section, now shows "Visite o Arquivo do Blog" instead of its own correct archive link.

- [ ] **Step 1: Fix the branching, same pattern as Task 2's sidebar fix**

```diff
-{%- if page.pagination.collection == "news" or page.collection == "news" -%}
+{%- if page.category == "Notícias" or page.pagination.category == "Notícias" -%}
   <a class="nav_link archive_link" href="{{ site.news_archive_path | relative_url }}">
     Visite o <strong>Arquivo de Notícias</strong>
   </a>
-{%- elsif page.pagination.collection == "essays" or page.collection == "essays" or page.layout == "archive" -%}
+{%- elsif page.category == "Textos" or page.pagination.category == "Textos" or page.layout == "archive" -%}
   <a class="nav_link archive_link" href="{{ site.essays_archive_path | relative_url }}">
     Visite o <strong>Arquivo de Textos</strong>
   </a>
-{%- elsif page.pagination.collection == "posts" or page.collection == "posts" or page.layout == "author" -%}
+{%- elsif page.category == "Blog" or page.pagination.category == "Blog" or page.layout == "author" -%}
   <a class="nav_link archive_link" href="{{ site.archive_path | relative_url }}">
     Visite o <strong>Arquivo do Blog</strong>
   </a>
 {%- endif -%}
```

**Bug 2 — `index.html`** (the homepage). Two sections:

```liquid
<section class="contained posts_section">
  <h2 class="section_title">Notícias da Casa</h2>
  <div class="posts_list">
    {%- assign news = site.news | reverse -%}
    {%- for post in news limit: 4 -%}
      {%- include home/post.html -%}
    {%- endfor -%}
  </div>
  <a class="archive_link" href="/noticias/">Visite o arquivo de notícias</a>
</section>

<section class="contained posts_section">
  <h2 class="section_title">No blog</h2>
  <div class="posts_list">
    {%- for post in site.posts limit: 4 -%}
      {%- include home/post.html -%}
    {%- endfor -%}
  </div>
  <a class="archive_link" href="/blog/">Ver todos os posts no blog</a>
</section>
```

`site.news` no longer exists — Liquid doesn't error on a nil collection, it silently iterates zero times, so the "Notícias da Casa" section would go silently empty (no build error, no warning, just missing content on the homepage). Separately, `site.posts` in the "No blog" section is now unfiltered — it includes news and essays too, so the "No blog" section would show the 4 most recent items of ANY type, not necessarily blog posts.

- [ ] **Step 1: Fix the Notícias section**

```diff
-    {%- assign news = site.news | reverse -%}
+    {%- assign news = site.posts | where: "category", "Notícias" -%}

     {%- for post in news limit: 4 -%}
```

No `| reverse` needed here (unlike the original, which needed it because the old `_news` custom collection sorted oldest-first by default) — `site.posts` (the built-in posts collection) is already newest-first by Jekyll's own default, and `where` preserves relative order, so the first 4 matches are already the 4 most recent.

- [ ] **Step 2: Fix the blog section**

```diff
+    {%- assign blog_posts = site.posts | where: "category", "Blog" -%}
-    {%- for post in site.posts limit: 4 -%}
+    {%- for post in blog_posts limit: 4 -%}
```

**Note on `_includes/post/navigation.html`:** this file has the identical bug pattern (`page.collection == "posts"`, now true for every doc instead of just blog posts) but is **not included anywhere in the codebase** — confirmed dead code, predating this migration. No live behavior depends on it. Leave it alone; fixing genuinely dead code is out of scope and would just be unverifiable busywork.

- [ ] **Step 3: Verify**

```bash
bundle exec jekyll build --destination /tmp/_build_task6b
```

Expected: build succeeds. Then, for `archive/pagination.html`: check the bottom-of-listing archive link on each of `/blog/`, `/noticias/`, `/textos/` points to the right place:

```bash
grep -A1 'archive_link' /tmp/_build_task6b/blog/index.html | grep href       # expect: site.archive_path (blog arquivo)
grep -A1 'archive_link' /tmp/_build_task6b/noticias/index.html | grep href  # expect: site.news_archive_path
grep -A1 'archive_link' /tmp/_build_task6b/textos/index.html | grep href    # expect: site.essays_archive_path
```

For `index.html`: confirm both homepage sections show real, correctly-typed content:

```bash
grep -c 'post_item' /tmp/_build_task6b/index.html   # expect: 8 (4 news + 4 blog)
```

Then manually confirm (e.g. by title, or by checking each linked URL's path prefix) that the "Notícias da Casa" section's 4 items all link to `/noticias/...` and the "No blog" section's 4 items all link to `/blog/...` — no cross-contamination.

---

### Task 7: `admin/config.yml` (Decap CMS)

**Files:**
- Modify: `admin/config.yml`

**Interfaces:**
- Produces: CMS-authored files that satisfy Task 1's front-matter contract (`category` hidden field written per collection; essays' subcategory field renamed to `tags`).

- [ ] **Step 1: Add the hidden `category` field to the `post` collection**

```diff
     fields:
       - label: Layout
         name: layout
         widget: hidden
         default: "post"
       - label: Título
         name: title
         widget: string
+      - label: Categoria
+        name: category
+        widget: hidden
+        default: "Blog"
       - label: Conteúdo
         name: body
         widget: markdown
```

- [ ] **Step 2: Point the `news` collection at the new folder and add its hidden field**

```diff
   - name: news
     label: Notícias
     label_singular: Notícia
     description: >-
       As notícias são posts exibidos sem atribuição de autor na página de Notícias da Casa.
-    folder: _news
+    folder: _posts/noticias
     sort: "date:desc"
     create: true
     delete: true
     summary: >-
       {{title}} ({{day}}/{{month}}/{{year}})
     slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
     preview_path: "/noticias/{{year}}-{{month}}-{{day}}-{{slug}}/"
     view_groups:
       - label: Rascunhos
         field: draft
     fields:
       - label: Layout
         name: layout
         widget: hidden
         default: post
       - label: Título
         name: title
         widget: string
+      - label: Categoria
+        name: category
+        widget: hidden
+        default: "Notícias"
       - label: Conteúdo
         name: body
         widget: markdown
```

- [ ] **Step 3: Point the `essays` collection at the new folder, add its hidden field, rename the subcategory field**

```diff
   - name: essays
     label: Textos
     label_singular: Texto
-    folder: _essays
+    folder: _posts/textos
     sort: "date:desc"
     create: true
     delete: true
     summary: >-
       {{title}} ({{day}}/{{month}}/{{year}})
     slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
     preview_path: "/textos/{{year}}-{{month}}-{{day}}-{{slug}}/"
     description: >-
       Textos são posts exibidos na página de Textos, com sua própria listagem e organização.
     view_groups:
       - label: Rascunhos
         field: draft
     fields:
       - label: Layout
         name: layout
         widget: hidden
         default: post
       - label: Título
         name: title
         widget: string
+      - label: Categoria
+        name: category
+        widget: hidden
+        default: "Textos"
       - label: Conteúdo
         name: body
         widget: markdown
       - label: Autor
         name: author
         widget: hidden
         default: casa
       - label: Categoria
-        name: category
+        name: tags
         widget: select
+        multiple: true
+        min: 1
+        max: 1
         options:
           - label: Textos sobre Cinema
             value: Textos sobre Cinema
           - label: Roteiros
             value: Roteiros
```

**Note:** `multiple: true, min: 1, max: 1` is required, not optional — a plain single-choice `select` writes a scalar value, and `tags` is a Jekyll-reserved key that word-splits scalar values on save-time build (see Task 1 Step 4). This does change the widget's rendered UI from a single dropdown to a constrained multi-select — the one real editor-visible UI change in this whole migration. Confirm in Step 4's manual CMS check that saving still writes a proper one-item YAML list.

- [ ] **Step 4: Verify YAML validity**

```bash
ruby -ryaml -e "YAML.load_file('admin/config.yml')" && echo OK
```

Expected: `OK`, no exception. Then, manually: run the CMS locally (`local_backend: true` is already set) and confirm the `Posts`/`Notícias`/`Textos` collections each list only their own folder's files, with no cross-bleed from the other two subfolders — this can't be verified from the command line, note it as a manual follow-up if a local CMS server isn't run as part of this task.

---

### Task 8: `.pages.yml` (Pages CMS)

**Files:**
- Modify: `.pages.yml`

**Interfaces:**
- Same as Task 7, mirrored for the Pages CMS config format.

- [ ] **Step 1: Add the hidden `category` field to the `post` collection**

```diff
     fields:
       - name: layout
         label: Layout
         type: string
         hidden: true
         default: post
       - name: title
         label: Título
         type: string
+      - name: category
+        label: Categoria
+        type: string
+        hidden: true
+        default: "Blog"
       - name: body
         label: Conteúdo
         type: rich-text
```

- [ ] **Step 2: Point the `news` collection at the new path and add its hidden field**

```diff
   - name: news
     label: Notícias
     type: collection
-    path: _news
+    path: _posts/noticias
     format: yaml-frontmatter
     filename: "{year}-{month}-{day}-{primary}.md"
     description: >-
       As notícias são posts exibidos sem atribuição de autor na página de Notícias da Casa.
     view:
       primary: title
       default:
         sort: date
         order: desc
     fields:
       - name: layout
         label: Layout
         type: string
         hidden: true
         default: post
       - name: title
         label: Título
         type: string
+      - name: category
+        label: Categoria
+        type: string
+        hidden: true
+        default: "Notícias"
       - name: body
         label: Conteúdo
         type: rich-text
```

- [ ] **Step 3: Point the `essays` collection at the new path, add its hidden field, rename the subcategory field**

```diff
   - name: essays
     label: Textos
     type: collection
-    path: _essays
+    path: _posts/textos
     format: yaml-frontmatter
     filename: "{year}-{month}-{day}-{primary}.md"
     description: >-
       Textos são posts exibidos na página de Textos, com sua própria listagem e organização.
     view:
       primary: title
       default:
         sort: date
         order: desc
     fields:
       - name: layout
         label: Layout
         type: string
         hidden: true
         default: post
       - name: title
         label: Título
         type: string
+      - name: category
+        label: Categoria
+        type: string
+        hidden: true
+        default: "Textos"
       - name: body
         label: Conteúdo
         type: rich-text
       - name: author
         label: Autor
         type: string
         hidden: true
         default: casa
-      - name: category
-        label: Categoria
+      - name: tags
+        label: Categoria
         type: select
+        list: true
         options:
           values:
             - { value: "Textos sobre Cinema", label: "Textos sobre Cinema" }
             - { value: "Roteiros", label: "Roteiros" }
```

**Note:** `list: true` is required, not optional — same reason as Task 7's Decap equivalent (`multiple: true, min:1, max:1`): a scalar value would get word-split by Jekyll's `tags` normalization at build time. Confirm in Step 4's manual CMS check that this actually constrains the Pages CMS UI to one selection while still writing a list — if `list: true` alone doesn't cap it at one item in practice, this needs a follow-up (Pages CMS's exact validation options for a single-item-only list weren't confirmed against live docs during planning).

- [ ] **Step 4: Verify YAML validity**

```bash
ruby -ryaml -e "YAML.load_file('.pages.yml')" && echo OK
```

Expected: `OK`, no exception. Same manual-CMS-check caveat as Task 7 applies here.

---

### Task 9: Full-site verification against the pre-migration baseline

**Files:** none (verification only).

**Interfaces:** none — this task validates the combined output of Tasks 1–8.

- [ ] **Step 1: Full production build**

```bash
JEKYLL_ENV=production bundle exec jekyll build --destination /tmp/_site_final
```

Expected: exit 0, no Liquid errors or warnings in the output.

- [ ] **Step 2: Diff the full site tree against the baseline**

```bash
diff -rq /tmp/_site_check /tmp/_site_final \
  | grep -v -E '/textos/(longas-metragens|médias-metragens|curtas-metragens|coproduções|séries|origens|distribuição|coleções|projetos|episódios|socios|funcionarios|equipes|elencos|passado)'
```

Expected: no output. Every remaining diff after filtering out the intentionally-removed stray autopages pages means something regressed — investigate before proceeding.

- [ ] **Step 3: Confirm the stray pages are in fact gone**

```bash
ls /tmp/_site_final/textos/ | grep -E '^(longas-metragens|médias-metragens|curtas-metragens|coproduções|séries|origens|distribuição|coleções|projetos|episódios|socios|funcionarios|equipes|elencos|passado)$'
```

Expected: no output (directories no longer generated).

- [ ] **Step 4: Manual spot-check in a browser**

```bash
bundle exec jekyll serve --destination /tmp/_site_final
```

Visit and confirm each of: `/blog/`, `/noticias/`, `/textos/`, `/blog/arquivo/`, `/noticias/arquivo/`, `/textos/arquivo/`, `/textos/textos-sobre-cinema/`, `/textos/roteiros/`, one migrated news article, one migrated Roteiros essay (full content shows despite `textos.md`'s `show_content: false`), one migrated non-Roteiros essay (excerpt/no-content behavior per `show_content: false`), and each of the three sidebars (author+year for blog, year-only for news, subcategory+year for textos).

- [ ] **Step 5: CMS smoke test**

Run the Decap CMS local backend (`npx netlify-cms-proxy-server` or the project's existing local-CMS workflow) and the Pages CMS equivalent; confirm in each that Posts/Notícias/Textos list only their own folder's files, that creating a draft in each writes to the right subfolder with the right hidden `category` default, and that an essay's "Categoria" dropdown still offers exactly "Textos sobre Cinema"/"Roteiros" and now writes to the `tags` key.

---

### Task 9b: fix regressions found by Task 9's baseline diff

**Inserted after execution began** — Task 9's full baseline diff (the check every prior task's individual review couldn't run, since each only diffed adjacent commits) came back non-empty and, on investigation, found two genuine, confirmed regressions, both traced to code written for the pre-merge collection semantics and never fully adjusted once `site.posts` became the single source for everything. A third finding (the global `/feed.xml`/`/feed.json` becoming mixed-content instead of blog-only) is a real behavior change too, but isn't fixable via `jekyll-feed`'s config alone — that one is being surfaced to the user directly rather than silently resolved here.

**Files:**
- Modify: `_includes/archive/sidebar.html`
- Modify: `_layouts/lists/posts.html`
- Modify: all 130 `_posts/textos/*.md` files
- Modify: `admin/config.yml`
- Modify: `.pages.yml`

**Interfaces:**
- Consumes: `category`, `tags` (from Task 1/2). Produces: nothing new — these are corrections to existing display/data-model logic, not new features.

**Finding 1 — Blog sidebar aggregates all three categories, and essays leak into `/blog/casa/`.**

`_includes/archive/sidebar.html`'s Blog branch (added in Task 2) was given the `category == "Blog"` *condition* but its body was never given a matching `where` filter — it still reads `site.posts` unfiltered for both the authors widget and the years widget. Before the merge this was implicitly correct (`site.posts` == blog only); now it aggregates Notícias/Textos in too, on every blog post page and every `/blog/<author>/` page.

- [ ] **Step 1: Filter the Blog branch, same pattern as the Notícias/Textos branches**

```diff
   {%- elsif page.category == "Blog" or page.pagination.category == "Blog" or page.layout == "author" -%}
-    {%- assign authors = site.posts | group_by: "author" -%}
+    {%- assign blog_posts = site.posts | where: "category", "Blog" -%}
+    {%- assign authors = blog_posts | group_by: "author" -%}
```

```diff
-    {%- assign years = site.posts | group_by_exp: "item", "item.date | date: '%Y'" -%}
+    {%- assign years = blog_posts | group_by_exp: "item", "item.date | date: '%Y'" -%}
```

(This is the same `blog_posts` naming Task 6b already introduced in `index.html` — keep it consistent.)

Separately, `jekyll-auto-authors`'s actual page CONTENT (not just this sidebar widget) comes from `site.collections["posts"].docs` grouped by the raw `author` field (`jekyll-auto-authors-1.0.6/lib/jekyll-auto-authors/main.rb`, `all_posts = site.collections["posts"].docs...`, `PaginationIndexer.index_posts_by(all_posts, "author")`). Before the merge this only ever saw genuine blog posts. Now every essay's front matter still carries `author: casa` (a Task-1-era CMS default, harmless before the merge since essays weren't part of the `posts` collection) — and "casa" is also a real blog author key (`_data/authors.yml`), so all 130 essays now merge into the real `/blog/casa/` author archive's actual paginated content (confirmed: baseline 4 pages, current build 14 pages).

- [ ] **Step 2: Give essays a distinct author key, not a stripped field**

**Correction, found during implementation (superseding what this step originally said):** the first attempt stripped `author: casa` from essays entirely (`sed -i '' '/^author: casa$/d'`) and, in Step 3 below, removed the hidden `author` field from both CMS configs. That fixed the `/blog/casa/` leak but broke something that predates this migration: `jekyll-seo-tag` resolves `page.author` through `site.data.authors[...]` to render `<meta name="author">`/JSON-LD attribution — with the field gone, all 130 essay pages silently lost that SEO attribution. Caught by the Task 9b implementer itself (not silently absorbed), investigated by the controller against `jekyll-seo-tag`'s `author_drop.rb` source, and fixed by giving essays a *distinct* author key instead of removing the field:

1. Add a `casa_textos` entry to `_data/authors.yml`, identical display info (`name`, `url`) to the existing `casa` entry, so `jekyll-seo-tag` still resolves attribution correctly for essays.
2. Change essays' front-matter `author` value from `casa` to `casa_textos` (all 130 files) — this keeps the field, it does not remove it.
3. Add `autopages.authors.exclude: [casa_textos]` to `_config.yml`'s `autopages.authors` block, so `jekyll-auto-authors` still generates a real `/blog/casa/` archive page for genuine blog posts but never generates (or pollutes) one for `casa_textos` — this is what actually stops essays from leaking into any author archive; unlike the original design, the field is present and does real work (SEO attribution), so removal was never the right lever.

```bash
find _posts/textos -name '*.md' -exec sed -i '' 's/^author: casa$/author: casa_textos/' {} +
```

Verify: `grep -c '^author: casa_textos$' _posts/textos/*.md | grep -c ':1'` → expect `130`; `grep -rl '^author: casa$' _posts/textos/` → expect no output.

- [ ] **Step 3: Extend the byline-suppression check and keep the CMS default (don't remove the field)**

`_includes/post/meta.html`'s byline-suppression check originally read `{%- if post.author and post.author != "casa" -%}` — with essays now carrying `author: casa_textos` instead of `casa`, that check would no longer match, putting a visible "A Casa" byline on all 130 essay pages that never had one before. Caught proactively by the Task 9b implementer before being told. Extend the check to cover both keys:

```diff
-  {%- if post.author and post.author != "casa" -%}
+  {%- if post.author and post.author != "casa" and post.author != "casa_textos" -%}
```

In `admin/config.yml`, the essays collection's hidden `author` field is **kept**, only its default value changes:

```diff
       - label: Autor
         name: author
         widget: hidden
-        default: casa
+        default: casa_textos
       - label: Categoria
```

In `.pages.yml`, same change, field kept:

```diff
       - name: author
         label: Autor
         type: string
         hidden: true
-        default: casa
+        default: casa_textos
       - name: tags
```

**Finding 2 — chronological order inverted on all three Arquivo pages and two sidebar year-widgets.**

`site.posts` (the Liquid-exposed built-in posts collection) is documented Jekyll behavior and empirically confirmed via `Jekyll::Drops::SiteDrop#posts` (`jekyll-4.4.1/lib/jekyll/drops/site_drop.rb:28`, `@obj.posts.docs.sort { |a, b| b <=> a }`): always newest-first, unconditionally. The pre-merge `_news`/`_essays` were *custom* collections, which Jekyll does not auto-sort — they came out oldest-first, which is why the original code needed `| reverse` to display newest-first. Every place that switched its source to `site.posts` while keeping its pre-existing `| reverse` now double-flips: newest-first, reversed, becomes oldest-first.

This also corrects a controller ruling made during Task 3's review (recorded in the ledger) that accepted the blog-arquivo ordering change as "cosmetic, not worth fixing" — that ruling was based on an incomplete read of the actual consequence. It is not cosmetic; it inverts the display on all three arquivo pages, not just blog, and produces an objectively backwards (oldest-first) reading order, not a stylistic difference. Ledger correction to be recorded alongside this fix.

- [ ] **Step 1: Drop the `| reverse` in `_layouts/lists/posts.html`'s category-filtered branch**

```diff
 {%- if page.category -%}
-  {% assign collection = site.posts | where: "category", page.category | reverse %}
+  {% assign collection = site.posts | where: "category", page.category %}
 {% else %}
-  {% assign collection = site.posts | reverse %}
+  {% assign collection = site.posts %}
 {% endif %}
```

(The else-branch is currently unreachable — Task 3's review confirmed all three `arquivo*.md` pages always set an explicit `category` — but fix it too for consistency; it costs nothing and removes a latent trap if a future page ever uses this layout without setting `category`.)

- [ ] **Step 2: Drop the `| reverse` on the Notícias and Textos year-widgets in `_includes/archive/sidebar.html`**

```diff
-    {%- assign years = site.posts | where: "category", "Notícias" | group_by_exp: "item", "item.date | date: '%Y'" | reverse -%}
+    {%- assign years = site.posts | where: "category", "Notícias" | group_by_exp: "item", "item.date | date: '%Y'" -%}
```

```diff
-    {%- assign years = essays | group_by_exp: "item", "item.date | date: '%Y'" | reverse -%}
+    {%- assign years = essays | group_by_exp: "item", "item.date | date: '%Y'" -%}
```

(The Blog branch's year widget already has no `| reverse` — leave it as-is, it was always correct.)

- [ ] **Step 3: Verify both findings together**

```bash
bundle exec jekyll build --destination /tmp/_build_task9b
```

Confirm Finding 1: `/blog/casa/` back to 4 total pagination pages (matching baseline), `grep -c 'href="/textos/' /tmp/_build_task9b/blog/casa/index.html` → 0. Spot-check a blog post's sidebar "Arquivo" widget no longer lists years outside the blog's real range, and the "Publicado por" widget no longer has a blank entry.

Confirm Finding 2: all three arquivo pages list years newest-first (`grep -oE '#[0-9]{4}' /tmp/_build_task9b/blog/arquivo/index.html | head -3` → most recent year first, matching baseline order exactly), and the Notícias/Textos sidebar year widgets likewise.

- [ ] **Step 4: Re-run Task 9's full baseline diff**

```bash
JEKYLL_ENV=production bundle exec jekyll build --destination /tmp/_site_final_v2
diff -rq /tmp/_site_check /tmp/_site_final_v2 \
  | grep -v -E '/textos/(longas-metragens|médias-metragens|curtas-metragens|coproduções|séries|origens|distribuição|coleções|projetos|episódios|socios|funcionarios|equipes|elencos|passado)'
```

Expected this time: output limited to the already-understood, already-accepted categories from Task 9's report (the two new subcategory pages' content, `_redirects`' 3 legitimate new lines, `redirects.json`'s key-order-only difference, timestamp-only noise in `/filmes/*`/sitemap/feed metadata, and Finding 3's feed-content difference, which is not being fixed by this task) — and, critically, **zero** remaining lines attributable to Finding 1 or Finding 2. If anything new or unexplained shows up, do not wave it through — investigate and report it the same way Task 9 did.
