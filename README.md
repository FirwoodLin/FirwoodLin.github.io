# FirwoodLin personal site

The existing Hexo blog and the VitePress course reader are published together at
<https://firwoodlin.github.io/> and <https://firwoodlin.github.io/classes/>.

## Course content and publishing

`FirwoodLin/SJTU-Classes` remains the source of truth. This repository only contains
the website configuration. The workflow reads the course repository's `main`
branch, generates navigation from its Markdown, and builds the course reader into
`public/classes/` after building the blog. No files are written back to the course repository.

Set the repository Actions secret `CLASSES_READ_TOKEN` to a fine-grained token
restricted to `SJTU-Classes`, with **Contents: read-only** (and mandatory metadata access).
The source repository can remain private; the selected Markdown pages on this website are public.
Do not place credentials in tracked files. Renew the token before its expiration.

Publication runs on changes to this repository's `main`, manually from Actions → Pages,
and every six hours. Uncommitted or unpushed course edits are never included.
GitHub scheduled runs can be delayed and can be disabled after prolonged repository inactivity;
manual publication remains available. All content is derived from one checked-out course commit,
shown on the reader homepage. A failed build does not deploy a partial website.

## Local preview

```powershell
npm ci
$env:CLASSES_SOURCE = 'C:/path/to/a/separate/SJTU-Classes/checkout'
npm run site:build
npm run site:check
npm run classes:preview
```

The course reader retains formulas, tables and folded answers. References to files
outside the published Markdown are shown as local-resource labels, since recordings
and slides are not copied to this site. Generated pages and the downloaded course
checkout are ignored by Git.

The Pages custom domain must be empty to serve the default GitHub domain. Do not
add a `CNAME` to the output. VitePress uses the `/classes/` base path.
