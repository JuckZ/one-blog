# One Blog

## TODO

- [ ] learn from [tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog/blob/main/app/blog/page.tsx)
- [ ] 弄清楚filePathPattern的语法
    // 这种语法可能是用于文件路径匹配的glob模式，如下实例可以参考
    // filePathPattern: `blog/**/*.{mdx,md}`,
    // filePathPattern: `pages/friends/*.md?(x)`,
    // filePathPattern: "**/{readme,README}.md",
    // filePathPattern: "recipes/!(index)*.md*",
    // filePathPattern: `(docs|blog|resources)/**/*.mdx`,
    // filePathPattern: `**/!{Archive,MyObsidian,Areas}/**/*.mdx`,
    // filePathPattern: `Resources/**/*.md`,
- [ ] 重新配置contentDirExclude
- [ ] 配置draft功能
- [ ] 配置类似于obsidian双链预览功能
  - [ ] [linked-blog-starter](https://github.com/matthewwong525/linked-blog-starter/blob/main/components/misc/preview-link.tsx)
  - [ ] [gatsby-remark-obsidian](https://github.com/johackim/gatsby-remark-obsidian)
- [ ] [Routing: Internationalization | Next.js](https://nextjs.org/docs/pages/building-your-application/routing/internationalization)
- [ ] [Webpack warnings when using `next.config.mjs` · Issue #272 · contentlayerdev/contentlayer](https://github.com/contentlayerdev/contentlayer/issues/272)

## How get this

`npm create refine-app@latest`

## Init

`git clone --recurse-submodules git@github.com:JuckZ/one-blog.git`

## Build

<div align="center" style="margin: 30px;">
    <a href="https://refine.dev">
    <img alt="refine logo" src="https://refine.ams3.cdn.digitaloceanspaces.com/readme/refine-readme-banner.png">
    </a>
</div>
<br/>

This [Refine](https://github.com/refinedev/refine) project was generated with [create refine-app](https://github.com/refinedev/refine/tree/master/packages/create-refine-app).

## Getting Started

A React Framework for building internal tools, admin panels, dashboards & B2B apps with unmatched flexibility ✨

Refine's hooks and components simplifies the development process and eliminates the repetitive tasks by providing industry-standard solutions for crucial aspects of a project, including authentication, access control, routing, networking, state management, and i18n.

## Available Scripts

### Running the development server.

```bash
    npm run dev
```

### Building for production.

```bash
    npm run build
```

### Running the production server.

```bash
    npm run start
```

## Learn More

To learn more about **Refine**, please check out the [Documentation](https://refine.dev/docs)

- **Supabase Data Provider** [Docs](https://refine.dev/docs/core/providers/data-provider/#overview)
- **Material UI** [Docs](https://refine.dev/docs/ui-frameworks/mui/tutorial/)

## License

MIT
