# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Jekyll 4.4 static site for Casa de Cinema de Porto Alegre (`www.casacinepoa.com.br`). Content is Portuguese (`lang: pt-BR`) — UI strings, labels, slugs and CMS field labels are all in Portuguese; keep new ones in Portuguese. Content lives in Markdown collections edited mostly through a web CMS, not by hand.

## Commands

```bash
bundle install                 # first run (Gemfile.lock is gitignored)
bundle exec jekyll serve       # dev server on http://localhost:4000
bundle exec jekyll build       # output to _site/
JEKYLL_ENV=production bundle exec jekyll build   # what CI/Netlify run

# jekyll-compose scaffolding (writes correct filename + front matter)
bundle exec jekyll post "Título"
bundle exec jekyll page "Título"
```

No test suite, no linter. Verification = a clean `jekyll build` plus checking the rendered page. Builds are slow (~1300 files in `uploads/`, ~490 blog posts in `_posts/`, ~750 notícias in `_posts/noticias/`, ~130 textos in `_posts/textos/`); prefer `serve` with incremental reloads over repeated full builds.

## Deploy

- `.github/workflows/jekyll.yml` builds and deploys to GitHub Pages on every push to `main`. Repo is `casacinepoa/casacinepoa.github.io`; `CNAME` pins the custom domain.
- `netlify.toml` and the Liquid-generated `_redirects` file are also present (Netlify-style redirects, including a proxy of `/giba/*` to a separate subdomain).
- `_redirects` is itself a Liquid template: it walks pages/posts/projects and emits a 301 for every `redirect_from` in front matter (`site.posts` already covers notícias and textos, since they're part of the same collection). The `jekyll-redirect-from` plugin handles the same field for the GitHub Pages build. Adding `redirect_from:` to a document is the supported way to preserve a legacy URL — dozens of documents rely on it.

## Content architecture

Collections (see `_config.yml`) and their public URLs:

| Collection | Dir | Permalink | Notes |
|---|---|---|---|
| posts | `_posts`, `_posts/noticias`, `_posts/textos` | `/blog/:year-:month-:day-:slug/`, `/noticias/:name/`, `/textos/:title/` | one merged Jekyll collection covering blog, notícias and textos — see below |
| projects | `_projects` | `/filmes/:title/` | films; `category` drives grouping |
| banners | `_banners` | `output: false` | homepage hero; `index.html` takes the last two, reversed |
| people | `_people` | `output: false` | rendered only through `_includes/about/*.html`, filtered by `category` (`socios`, `funcionarios`, `equipes`, `elencos`, `passado`) |
| pages | `_pages` | explicit `permalink:` per file | `_pages` is not a collection — it is listed under `include:` so Jekyll renders it as regular pages |

`_pages` holds the real site pages (`/sobre/`, `/filmes/`, `/blog/`, `/contato/`…) plus ~130 `*-créditos.md` pages, one per film, each with an explicit permalink like `filmes/<film>/creditos-completos` linked from the film's page body.

**`posts` is one Jekyll collection with three content types distinguished by a `category` value, not three separate collections.** Where a document lives decides its category and permalink, both injected at build time via `_config.yml`'s path-scoped `defaults:` (rarely written literally into a file's own front matter):

| Path | `category` | Permalink | Notes |
|---|---|---|---|
| `_posts/` (root) | `Blog` | `/blog/:year-:month-:day-:slug/` | has `author`; the only one with a visible byline |
| `_posts/noticias/` | `Notícias` | `/noticias/:name/` | no author shown |
| `_posts/textos/` | `Textos` | `/textos/:title/` (date-stripped) | subcategory lives in `tags` (see below); a `file:` field makes listings link straight to a PDF in `/uploads/` instead of the page |

All templates that list or group posts (`_layouts/lists/posts.html`, `_includes/archive/sidebar.html`, `_includes/archive/pagination.html`, `index.html`) read `site.posts` and filter with `| where: "category", "..."` — there is no `site.news` or `site.essays` to reach for.

Key front-matter contracts:
- `author` on `Blog`-category posts is a **key** into `_data/authors.yml` (`casa`, `ana`, `giba`, `jorge`, `nora`), not a name. `jekyll-auto-authors` generates `/blog/:author/` index pages from that same data file via the `autopages` config. Textos-category posts carry `author: casa_textos` (a distinct key, same display info as `casa` in `_data/authors.yml`) so `jekyll-seo-tag` still attributes them correctly without leaking essays into `/blog/casa/` — `autopages.authors.exclude: [casa_textos]` in `_config.yml` keeps that key out of page generation, and `_includes/post/meta.html`'s byline-suppression check excludes both `casa` and `casa_textos`. Adding a real blog author means editing `_data/authors.yml` *and* the option lists in both CMS configs.
- `tags` on Textos-category posts is the subcategory — a real one-item YAML **list** (e.g. `tags:\n  - Roteiros`), never a scalar: `tags` is a Jekyll-reserved key and a scalar value gets word-split by Jekyll's own normalization. Values are `Textos sobre Cinema` / `Roteiros`, each with its own listing page (`_pages/textos-sobre-cinema.md`, `_pages/roteiros.md`).
- `autopages.categories` in `_config.yml` is deliberately `enabled: false` — see the comment above that block. Path-scoped defaults give notícias/essays documents an inert plural `categories:` field (`Document#categories_from_path`) that nothing currently reads; re-enabling `autopages.categories` would regenerate stray `/textos/noticias/` and `/textos/textos/` pages from that field.
- `category` on projects must match one of the hardcoded strings in `_layouts/lists/films.html` (`Longas-metragens`, `Coproduções`, `Séries`, `Curtas-metragens`, `Médias-metragens`, `Origens`, `Distribuição`, plus `Projetos` used by `_layouts/lists/projects.html`) or the film will not appear in any list.
- Project pages read `tech_specs`, `image`/`image_credits`, `trailer` (a Vimeo URL — the id is parsed out of it), `where_to_watch[]`, and `details[]` (`title` + Markdown `content`, rendered as `<details>` accordions).
- Media paths are site-absolute `/uploads/...`; `uploads/` is the CMS media folder.

## Layouts and includes

`default.html` is the shell (head/header/main/footer) and sets `body class` from the layout name. Everything else nests into it: `page`, `post` (used for every `posts`-collection document — blog, notícias and textos alike), `project`, `about`, `contact`, `archive`, `author`, `blog`, and `lists/{posts,films,projects}.html`.

Two pieces of shared logic worth knowing before editing listings:
- `_includes/archive/sidebar.html` and `_includes/archive/pagination.html` both branch on `page.category` / `page.pagination.category` (`"Notícias"`, `"Blog"`, `"Textos"`) to decide which years/authors/subcategories widget and which "Visite o Arquivo..." link to show; `pagination.html` also matches `page.layout == "author"` for Blog and `page.layout == "archive"` (dead layout, no live page uses it) for Textos. A new paginated listing must set `category` (directly, or via `pagination.category`) for these to make sense; `sidebar.html`'s Textos branch is the implicit `else`, so it also catches anything that matches neither of the other two conditions.
- `_includes/archive/post.html` respects `page.show_content` (`"excerpt"`, `false`, or unset = full `markdownify`) and `page.show_tags`, both set in the listing page's front matter (see `_pages/blog.md`, `_pages/noticias.md`, `_pages/textos.md`).

Pagination is `jekyll-paginate-v2`: enabled per listing page in front matter, 12 per page, `/pagina/:num/`.

Site search is a plain GET form to Google scoped with `site:casacinepoa.com.br` — there is no local index.

## Styles

Single entry point `assets/css/screen.scss`. It declares the variables (`$color-accent: #CC0000`, fonts Oswald/Roboto, `$content-width`, `$spacing-unit`, the `media-query` mixin — mobile-first `min-width`) and then imports `_sass/_fonts`, `_base`, `_layout`; `_sass/layouts/*.scss` holds per-page styles. Class naming is `block_element` with `_modifier` (e.g. `post_content`, `meta_info _author`). Any new variable or mixin must go in `screen.scss` above the imports to be visible to partials.

## CMS configs — keep in sync

Two CMS configurations describe the same content model and both must be updated when front matter changes:
- `.pages.yml` — Pages CMS (current; added most recently).
- `admin/config.yml` — Decap/Netlify CMS with `editorial_workflow`, GitHub backend, external auth at `auth.casacinepoa.com.br`, plus preview templates in `admin/preview-templates/`.

Adding or renaming a front-matter field without mirroring it in both configs silently breaks editing for the site's non-technical authors. Field labels and descriptions there are user-facing Portuguese.

## Conventions

- `.editorconfig`: 2-space indent, LF, UTF-8, final newline; trailing whitespace is **preserved** in `.md` and `.yml` (Markdown hard line breaks and `\`-continuations are used heavily in credits blocks — do not strip them).
- Liquid whitespace control (`{%- -%}`) is used consistently in includes and layouts; match the surrounding style.
- Most commits to `_posts` (including its `noticias`/`textos` subfolders) and `_projects` come from the CMS with messages like `Update Notícia "…"` — content commits and code commits stay separate.
