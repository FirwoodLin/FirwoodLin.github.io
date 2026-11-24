import { readFile, stat, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import MiniSearch from 'minisearch'
const catalog = JSON.parse(await readFile('classes/.vitepress/catalog.json', 'utf8'))
const documents = new Map()
for (const page of catalog.pages) {
  const htmlPath = page.replace(/\.md$/, '.html')
  if (!(await stat(resolve('public/classes', htmlPath))).size) throw new Error(`Empty page: ${page}`)
  documents.set(htmlPath, await readFile(resolve('public/classes', htmlPath), 'utf8'))
}
const errors = new Set()
for (const [file, html] of documents) {
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const link = new URL(match[1], `https://firwoodlin.github.io/classes/${file}`)
    if (link.origin !== 'https://firwoodlin.github.io' || !link.pathname.startsWith('/classes/')) continue
    let target = decodeURIComponent(link.pathname.slice('/classes/'.length))
    if (!target || target.endsWith('/')) target += 'index.html'
    if (!target.endsWith('.html')) continue
    const body = documents.get(target)
    if (!body) errors.add(`${file}: missing page ${target}`)
    else if (link.hash && !body.includes(`id="${decodeURIComponent(link.hash.slice(1))}"`)) errors.add(`${file}: missing anchor ${target}${decodeURIComponent(link.hash)}`)
  }
}
if (errors.size) throw new Error([...errors].join('\n'))
const home = await readFile('public/classes/index.html', 'utf8')
if (!home.includes('/classes/assets/')) throw new Error('Missing /classes/ asset base')
const lecture = await readFile('public/classes/高等计算机系统结构/2026-10-21.html', 'utf8')
if (!lecture.includes('mjx-container')) throw new Error('Math was not rendered')
if (!lecture.includes('<details>')) throw new Error('Self-check answers were not preserved')
await stat('public/index.html')
const searchDir = 'public/classes/assets/chunks'
const indexFile = (await readdir(searchDir)).find(file => file.startsWith('@localSearchIndexroot.'))
if (!indexFile) throw new Error('Search index was not generated')
const { default: indexJSON } = await import(pathToFileURL(resolve(searchDir, indexFile)))
const search = MiniSearch.loadJSON(indexJSON, {
  fields: ['title', 'titles', 'text'], storeFields: ['title', 'titles'],
  tokenize: text => text.toLowerCase().match(/[\u3400-\u9fff]|[a-z0-9_]+/g) || []
})
for (const [query, expectedCourse] of [['SRAM', '高等计算机系统结构'], ['中值滤波', '数字图像处理']]) {
  if (!search.search(query, { combineWith: 'AND' }).some(result => result.id.includes(expectedCourse))) throw new Error(`Search failed: ${query}`)
}
console.log(`Verified blog + ${catalog.pages.length} course pages, links and anchors, asset base, math, folded answers and bilingual search`)
