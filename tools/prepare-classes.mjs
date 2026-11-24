import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { slug as githubSlug } from 'github-slugger'

const source = resolve(process.env.CLASSES_SOURCE || '.classes-source')
const output = resolve('classes/content')
const courses = ['现代信号处理', '高等计算机系统结构', '数字图像处理']
const commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
// Only generated content in this checkout may be replaced.
if (output !== resolve('classes', 'content')) throw new Error('Unexpected output directory')
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
const adapt = text => text.replaceAll('README.md', 'overview.md')
  .replace(/^(#{1,6}) (.+\$.+)$/gm, (_, level, heading) => `${level} ${heading} {#${githubSlug(heading)}}`)
  .replace(/^([ \t]*)<details><summary>(.*?)<\/summary>([\s\S]*?)<\/details>/gm,
    (_, indent, title, body) => `${indent}<details>\n${indent}<summary>${title}</summary>\n\n${indent}${body.trim()}\n\n${indent}</details>`)
await writeFile(join(output, 'overview.md'), adapt(await readFile(join(source, 'README.md'), 'utf8')))
const catalog = { commit, courses: [], pages: ['index.md', 'overview.md'] }
for (const name of courses) {
  const files = (await readdir(join(source, name)))
    .filter(file => /^\d{4}-\d{2}-\d{2}(?:-\d+)?(?:-来源)?\.md$/.test(file)).sort()
  if (!files.length) throw new Error(`No course notes found: ${name}`)
  await mkdir(join(output, name), { recursive: true })
  const lectures = []
  for (const file of files) {
    const text = await readFile(join(source, name, file), 'utf8')
    await writeFile(join(output, name, file), adapt(text))
    catalog.pages.push(`${name}/${file}`)
    if (!file.endsWith('-来源.md')) {
      const date = file.replace('.md', '')
      const summary = (text.match(/^本次范围[：:]\s*(.+)$/m)?.[1] || '')
        .replace(/（(?:画面)?课件[^）]*）/g, '').replaceAll('|', '／')
      lectures.push({ date, summary, link: `/${name}/${date}` })
    }
  }
  catalog.courses.push({ name, lectures })
  catalog.pages.push(`${name}/index.md`)
  await writeFile(join(output, name, 'index.md'), `# ${name}\n\n按授课日期阅读详细笔记，或通过全站搜索查找概念。\n\n| 日期 | 本次内容 |\n| --- | --- |\n${lectures.map(l => `| [${l.date}](./${l.date}.md) | ${l.summary} |`).join('\n')}\n`)
}
const count = catalog.courses.reduce((sum, c) => sum + c.lectures.length, 0)
await writeFile(join(output, 'index.md'), `---\noutline: false\n---\n\n<div class="study-intro"><p class="eyebrow">SJTU · 2026 秋</p><h1>课程笔记</h1><p class="lead">沿着知识主线读懂每次课，再用易错点和自测检查理解。</p></div>\n\n<div class="course-grid">\n${catalog.courses.map((c, i) => `<a class="course-card" href="./${c.name}/"><span class="course-subject">${['SIGNAL PROCESSING', 'COMPUTER ARCHITECTURE', 'IMAGE PROCESSING'][i]}</span><h2>${c.name}</h2><p>${['从随机信号与参数估计，到谱估计、循环统计与时频分析。', '从指令集与性能度量，到存储层次、流水线与动态调度。', '从图像形成与正交变换，到增强、复原与图像压缩。'][i]}</p><span class="course-count">${c.lectures.length} 次课</span></a>`).join('\n')}\n</div>\n\n## 从这里开始\n\n- **系统复习**：选择课程，按日期阅读详细笔记。\n- **考前检查**：查看每次课的学习目标、易错点、折叠自测和概念速览。\n- **跨课查找**：点击顶部搜索，输入术语或问题。\n\n[打开总索引与知识主线](./overview.md)\n\n<div class="study-meta">3 门课程 · ${count} 次课 · 内容版本 ${commit.slice(0, 7)}</div>\n`)
await mkdir(resolve('classes/.vitepress'), { recursive: true })
await writeFile(resolve('classes/.vitepress/catalog.json'), JSON.stringify(catalog, null, 2))
console.log(`Prepared ${count} lectures (${catalog.pages.length} pages), source ${commit.slice(0, 7)}`)
