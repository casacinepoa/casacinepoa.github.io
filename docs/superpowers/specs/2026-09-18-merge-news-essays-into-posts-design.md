# Merge `_news` and `_essays` into `_posts` — Design

Date: 2026-09-18

## Goal

Collapse the three Jekyll collections `_posts`, `_news`, `_essays` into a single
`_posts` collection, while preserving:

- every existing public URL (posts, news, essays, and their archive/autopages
  pages) unchanged
- the three separate listings/archives (`/blog/`, `/noticias/`, `/textos/`)
  and their distinct display rules (author+year sidebar for blog, year-only
  for news, subcategory+year for textos)
- the two CMS configs (`admin/config.yml`, `.pages.yml`) as three distinct
  editor-facing collections (Posts / Notícias / Textos), unchanged from an
  editor's point of view

**Hard constraint, confirmed with the user:** no permalink changes anywhere —
not on individual posts/news/essays, not on archive or autopages-generated
pages.

## Background

Today `posts`, `news`, and `essays` are three separate Jekyll collections
(`_config.yml`), each with its own `site.<collection>` array. Listing pages
(`_pages/blog.md`, `noticias.md`, `textos.md`) select their content via
`jekyll-paginate-v2`'s `pagination.collection` front-matter key.
`_includes/archive/sidebar.html` and `_layouts/lists/posts.html` branch on
`page.pagination.collection` / `page.collection` to decide which
`site.<collection>` array and which sidebar widgets to use.

`jekyll-paginate-v2` only supports filtering a paginated set by `collection`,
`category`, `tag`, or `locale` — there is no hook for an arbitrary front-matter
field. Once news/essays move into the literal `_posts` collection, `collection`
stops being a usable discriminator, so the design uses `category` as the
new type marker and reserves `tags` for essays' existing subcategory.

A verification build (`JEKYLL_ENV=production bundle exec jekyll build`, current
`main`) confirmed `autopages.categories` already leaks unrelated category
values from `_projects` (`Longas-metragens`, `Séries`, `Curtas-metragens`, …)
and `_people` (`socios`, `elencos`, `funcionarios`, …) into stray
`/textos/<cat>/` pages today, because its indexer scans every collection
site-wide, not just essays. This is pre-existing and unrelated to this
migration; the design's removal of `autopages.categories` (§4) incidentally
fixes it.

## File layout

- `_posts/` (root) — existing blog posts, untouched. Zero files moved.
- `_posts/noticias/` — `git mv` target for all of `_news/*.md`.
- `_posts/textos/` — `git mv` target for all of `_essays/*.md`.

Jekyll's `:name` placeholder is always `slugify(<filename without extension>)`
— it never strips a leading date, for any collection. `:title`/`:slug`
resolve through `data["slug"]`, which Jekyll populates via a regex that
strips a leading date from the filename for *any* document (not just
`posts`). News's original permalink was already `:name` (its production
URLs already carry a date prefix — relocating into a subfolder changes
nothing). Essays' original permalink was `:title`, which is why its URLs
are date-free — the per-subfolder `permalink` below must preserve that
distinction, not use `:name` for both (confirmed against Jekyll 4.4.1
`document.rb`/`url_drop.rb` and a build diffed against the pre-migration
site during implementation, after an initial draft of this default wrongly
used `:name` for essays too and broke all 130 essay URLs).

## Type marker: `category`

`_config.yml`'s `defaults:` gains three path-scoped entries (ordered general
→ specific, matching the file's existing convention):

```yaml
- scope:
    path: "_posts"
  values:
    category: Blog
- scope:
    path: "_posts/noticias"
  values:
    category: Notícias
    permalink: "/noticias/:name/"
- scope:
    path: "_posts/textos"
  values:
    category: Textos
    permalink: "/textos/:title/"
```

This reproduces every existing post/news/essay URL exactly, with zero
front-matter rewrites needed for blog or news content.

`pagination.collection` in `_config.yml` shrinks from `[posts, essays, news]`
to `[posts]`.

The CMS also writes `category` explicitly into every file it saves, as a
`hidden` field (mirroring the existing `layout: hidden` pattern) — belt and
suspenders alongside the config-level defaults, and keeps each file
self-describing if ever read outside the CMS.

## Essays' subcategory: `category` → `tags`

Essays currently store their subcategory (`Textos sobre Cinema` / `Roteiros`)
in the same `category` field now reserved for the type marker. That field is
renamed to `tags`, migrated across all essay files mechanically as part of
the `git mv` into `_posts/textos/`.

**Must be stored as a real single-item YAML list** (`tags:\n  - Roteiros`),
not a scalar string (`tags: Roteiros`). `tags` is a Jekyll-reserved
front-matter key: `Document#populate_tags` unconditionally normalizes it
through `Utils.value_from_plural_key`, which calls bare `.split` (splits on
any whitespace) whenever the raw value is a `String` — silently shattering
`"Textos sobre Cinema"` into `["Textos", "sobre", "Cinema"]`. The `Array`
branch of that same function only `.compact`s, never re-splitting an
existing element's internal whitespace, so a real list survives intact.
This was found during implementation, after an initial scalar-value draft
of this migration broke both the Roteiros full-content case and the essays
sidebar widget (see the implementation plan's Task 2 for the full trace).

Consequences:

- `_includes/archive/post.html`'s `{% if post.category == "Roteiros" %}`
  special case (forces full content display for Roteiros essays even when
  `show_content: false`) becomes `{% if post.tags contains "Roteiros" %}`
  (Array membership — `post.tags` is always an Array once Jekyll processes
  it, so equality against a bare string is never true).
- `_includes/archive/sidebar.html`'s essays branch groups by
  `item.tags[0]` (via `group_by_exp`, not a plain `group_by: "tags"` —
  grouping by the raw Array field would key on the Array itself and render
  its literal `["Textos", "sobre", "Cinema"]` inspect form as link text)
  instead of `category`.
- The CMS's essay `category` select field (2 fixed options) is renamed to
  `tags`, presented as the same single-choice control editors see today,
  but must be configured to write a one-item list, not a scalar — see the
  CMS configs section below for the concrete widget config per tool.

## Subcategory archive pages: static pages, not autopages

`autopages.tags` was considered as a replacement for the essays'
`/textos/:cat/` autopages, but rejected: it would also fire for every
distinct tag ever used on any of the ~500 existing blog posts, creating
hundreds of new `/textos/<tag>/` URLs — violating the no-new-permalinks
constraint. `autopages.categories` is disabled outright (nothing else uses
it after this migration).

Instead, two ordinary paginated `_pages` entries replace it, reusing the same
per-page `pagination.tag` filter that already exists in `jekyll-paginate-v2`
(filtering is scoped to that page's own config, so it cannot leak into other
pages):

```yaml
# _pages/textos-sobre-cinema.md
layout: blog
title: Textos sobre Cinema
permalink: "/textos/textos-sobre-cinema/"
pagination:
  enabled: true
  collection: posts
  tag: "Textos sobre Cinema"
show_content: false
```

(and a matching `_pages/roteiros.md` with `tag: "Roteiros"`)

Both reuse `layout: blog`, identical to `blog.md`/`noticias.md`/`textos.md` —
no new template code. Output URLs are identical to today's
`autopages.categories`-generated ones.

Caveat: if a blog post ever legitimately uses the tag `"Roteiros"` or `"Textos
sobre Cinema"` as a real topic tag, it would incorrectly appear on these two
listings too. Low probability, acceptable given the existing fixed 2-value
set; not otherwise mitigated.

## Listing pages and sidebar

`blog.md` / `noticias.md` / `textos.md` pagination front matter switches from
`collection:` to `category:`:

```yaml
pagination:
  enabled: true
  collection: posts
  category: Blog   # / Notícias / Textos
```

`_includes/archive/sidebar.html`'s branching on `page.pagination.collection`
/ `page.collection` no longer works — every document's `page.collection`
becomes `"posts"` after the merge. It is replaced with the `category` field,
which now covers both listing pages (`page.pagination.category`) and
individual post pages (`page.category`, populated by the path-scoped
defaults):

```liquid
{%- if page.category == "Notícias" or page.pagination.category == "Notícias" -%}
  ...news branch (year archive only)...
{%- elsif page.category == "Blog" or page.pagination.category == "Blog" or page.layout == "author" -%}
  ...blog branch (author + year archive)...
{%- else -%}
  ...essays branch (subcategory + year archive)...
{%- endif -%}
```

`_layouts/lists/posts.html` (backs the three `/…/arquivo/` pages) swaps its
`site[page.collection]` lookup for `site.posts | where: "category",
page.category`.

`_pages/arquivo.md`, `arquivo-de-noticias.md`, `arquivo-de-textos.md` each
need an explicit `category:` front-matter value now — `arquivo.md`
previously relied on the implicit "no collection set = site.posts" default,
which is no longer safe once `site.posts` holds everything. Their body counts
(`{{ site.posts | size }}`, `site.essays`, `site.news`) become filtered
counts, e.g. `{{ site.posts | where: "category", "Blog" | size }}`.

## Redirects

`_redirects`'s separate `{%- for news in site.news -%}` loop is removed —
the existing `{%- for post in site.posts -%}` loop already covers migrated
news content once it lives under `_posts`. `jekyll-redirect-from` (the GitHub
Pages deploy path) needs no changes; it already scans the posts collection.

## CMS configs

Both `admin/config.yml` (Decap) and `.pages.yml` (Pages CMS) keep three
separate collection entries — Posts / Notícias / Textos — so editors see no
change. All three now point into subfolders of the same `_posts` root:

| CMS collection | folder/path         | new hidden field                                      |
|-----------------|----------------------|--------------------------------------------------------|
| post            | `_posts`             | `category` hidden, default `Blog`                      |
| news            | `_posts/noticias`    | `category` hidden, default `Notícias`                  |
| essays          | `_posts/textos`      | `category` hidden, default `Textos`; `category` select field renamed to `tags` |

**Correction, found during the final whole-branch review (not assumed — traced
directly against each tool's source):** Decap's folder-based collections do
read only the direct contents of their configured folder by default, so its
root `post` collection is safe as originally described. Pages CMS is
different — its `subfolders` option **defaults to enabled**, so without an
explicit override the root `post` collection (`folder: _posts`) would show
`_posts/noticias/*` and `_posts/textos/*` as browsable subfolders in the
editor, and a save made from inside that wrong context would silently apply
the `post` collection's field schema (hidden `category` defaulting to
`"Blog"`) to a notícia or essay, miscategorizing it while keeping its old
URL. `.pages.yml`'s `post` collection block now sets `subfolders: false`
explicitly to prevent this; the `news`/`essays` collections don't need the
same override since editors reach them through their own dedicated
collection entries, not by browsing into `post`. Verify in the CMS after the
file move (§ Migration steps, step 8).

**Essays' `tags` field must write a one-item list, not a scalar** (see
above). In Decap, the `select` widget needs `multiple: true, min: 1, max: 1`
instead of a plain single-choice select — this is a real, if minor, UI
change (Decap typically renders `multiple: true` as a checkbox list rather
than a single dropdown) that editors will see, unlike every other field in
this migration. In Pages CMS, the equivalent is `list: true` alongside
`type: select`, matching the same `list: true` pattern already used for the
posts collection's `tags` field. Neither has been verified against the
actual rendered CMS UI for this repo — confirm during the CMS smoke test
(§ Migration steps, step 8) and adjust the widget config if either tool's
real behavior differs from this description.

All other per-collection fields (`file`, commented-out `redirect_from`, sort
settings, view filters, etc.) carry over unchanged, just relocated under
their collection's new block.

## Migration steps

1. `git mv _news/*.md _posts/noticias/`
2. `git mv _essays/*.md _posts/textos/`
3. Script: rewrite `category: X` → `tags:\n  - X` (a one-item YAML list, not
   a scalar) across `_posts/textos/*.md`
4. `_config.yml`: drop `news`/`essays` from `collections:`, add the three
   path-scoped `defaults:` entries, shrink `pagination.collection` to
   `[posts]`, disable `autopages.categories`
5. Update `_includes/archive/post.html`, `_includes/archive/sidebar.html`,
   `_layouts/lists/posts.html`
6. Update `_pages/blog.md`, `noticias.md`, `textos.md`, `arquivo.md`,
   `arquivo-de-noticias.md`, `arquivo-de-textos.md`
7. Add `_pages/textos-sobre-cinema.md`, `_pages/roteiros.md`
8. Update `admin/config.yml` + `.pages.yml`; smoke-test folder scoping in
   both CMS UIs
9. Trim `_redirects`

## Verification

Full `JEKYLL_ENV=production bundle exec jekyll build`, diff the generated
`_site/` tree against a pre-migration build. Expect zero URL diffs for
existing content; the only removed paths should be the stray
`/textos/<project-or-people-category>/` pages eliminated by disabling
`autopages.categories`.

Manual spot-check: all three listings and their `arquivo` pages and sidebars,
one migrated news permalink, one migrated essay permalink (including a
Roteiros one, to confirm the full-content special case still fires), both new
subcategory pages (`/textos/textos-sobre-cinema/`, `/textos/roteiros/`), and
a CMS create/edit smoke test in both admin UIs.
