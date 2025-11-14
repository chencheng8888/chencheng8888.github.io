import * as path from 'node:path';
import { defineConfig } from 'rspress/config';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: '前橙似锦的博客',
  description: '分享技术学习和生活感悟的个人博客',
  icon: '/orange.png',
  logo: {
    light: '/code-light.png',
    dark: '/code-dark.png',
  },
  head: [
    ['link', { rel: 'stylesheet', href: '/styles/custom.css' }],
    ['meta', { name: 'keywords', content: '后端开发,技术博客,Golang' }],
    ['meta', { name: 'author', content: '前橙似锦' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: '我的技术博客' }],
    [
      'meta',
      {
        property: 'og:description',
        content: '前橙似锦的个人博客',
      },
    ],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],
  themeConfig: {
    // nav: [
    //   { text: '首页', link: '/' },
    //   { text: '博客', link: '/guide/' },
    // ],
    // sidebar: {
    //   '/guide/': [
    //     {
    //       text: 'Golang',
    //       items: [
    //         { text: '如何使用interface', link: '/guide/golang/interface' },
    //       ],
    //     },
    //   ],
    // },
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/chencheng8888',
      },
    ],
    footer: {
      message: `
    <div>🙌别管那么多，沉淀!🙌</div>
    <div style="font-size: 13px; opacity: 0.7;">
      Icons by <a href="https://igoutu.cn/" target="_blank" rel="noopener noreferrer">Icons8</a>
    </div>
  `,
    },
    lastUpdatedText: '最后更新于',
    prevPageText: '上一页',
    nextPageText: '下一页',
    outlineTitle: '页面导航',
  },
  builderConfig: {
    source: {
      alias: {
        '@': path.join(__dirname, 'docs'),
      },
    },
  },
  markdown: {
    showLineNumbers: true,
    defaultWrapCode: true,
  },
});
