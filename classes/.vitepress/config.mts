import { defineConfig } from 'vitepress'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { slug as githubSlug } from 'github-slugger'

const here = dirname(fileURLToPath(import.meta.url))
const catalog = JSON.parse(readFileSync(resolve(here, 'catalog.json'), 'utf8'))
const sidebar = [
  { text: '课程笔记', items: [{ text: '首页', link: '/' }, { text: '总索引与知识主线', link: '/overview' }] },
  ...catalog.courses.map(course => ({
    text: course.name, link: `/${course.name}/`, collapsed: false,
    items: course.lectures.map(lecture => ({ text: lecture.date, link: lecture.link }))
  }))
]
export default defineConfig({
  lang: 'zh-CN', title: 'SJTU 课程笔记',
  description: '现代信号处理、高等计算机系统结构、数字图像处理课程复习笔记',
  base: '/classes/', srcDir: 'content', outDir: '../public/classes', cleanUrls: false,
  head: [['meta', { name: 'theme-color', content: '#2563eb' }]],
  themeConfig: {
    siteTitle: 'SJTU / 课程笔记',
    nav: [{ text: '课程总览', link: '/' }, { text: '知识主线', link: '/overview' }, { text: '个人主页', link: 'https://firwoodlin.github.io/' }],
    sidebar, outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    darkModeSwitchLabel: '外观', sidebarMenuLabel: '课程目录', returnToTopLabel: '回到顶部',
    search: { provider: 'local', options: {
      miniSearch: { options: { tokenize: (text: string) => text.toLowerCase().match(/[\u3400-\u9fff]|[a-z0-9_]+/g) || [] } },
      translations: { button: { buttonText: '搜索笔记', buttonAriaLabel: '搜索课程笔记' }, modal: { noResultsText: '没有找到相关笔记', resetButtonTitle: '清空', displayDetails: '显示详情', footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } } }
    } }
  },
  markdown: {
    math: true,
    anchor: { slugify: githubSlug },
    config(md) {
      // Local-only references become labels; the original notes remain unchanged.
      md.core.ruler.push('local-resource-labels', state => {
        const visit = tokens => {
          const localLinks: boolean[] = []
          for (const token of tokens) {
            if (token.children) visit(token.children)
            if (token.type === 'image') {
              const src = token.attrGet('src') || ''
              const path = decodeURIComponent(src.split('#')[0].split('?')[0])
              const relative = state.env.relativePath || 'index.md'
              const target = resolve(here, '../content', dirname(relative), path)
              if (path && !/^(?:[a-z]+:|\/)/i.test(path) && !existsSync(target)) {
                token.type = 'html_inline'; token.tag = ''; token.nesting = 0
                token.content = `<span class="local-resource" title="图片仅本地可用，未随笔记发布">${md.utils.escapeHtml(token.content || '图片')}</span>`
                token.children = null; token.attrs = null
              }
            } else if (token.type === 'link_open') {
              const href = token.attrGet('href') || ''
              const path = decodeURIComponent(href.split('#')[0].split('?')[0])
              const relative = state.env.relativePath || 'index.md'
              const target = resolve(here, '../content', dirname(relative), path)
              const missing = path && !/^(?:[a-z]+:|\/)/i.test(path) && !existsSync(target)
              localLinks.push(Boolean(missing))
              if (missing) { token.tag = 'span'; token.attrs = [['class', 'local-resource'], ['title', '仅本地可用，未随笔记发布']] }
            } else if (token.type === 'link_close' && localLinks.pop()) token.tag = 'span'
          }
        }
        visit(state.tokens)
      })
    }
  }
})
