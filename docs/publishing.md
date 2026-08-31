# One Blog 发布与 i18n 约定

One Blog 同时保留两套站点引擎：现有的 Next.js + Refine，以及 Quartz v5。两者读取同一个
Obsidian vault，也遵守同一个显式发布规则；不需要移动或重组任何笔记目录。

## 1. 发布开关

只要在笔记 frontmatter 顶层加入严格的 YAML 布尔值，即可进入发布集合：

```yaml
---
publish: true
---
```

只有未加引号的布尔值 `true` 有效。`publish: "true"`、`publish: false`、字符串和列表都不会
发布。知识库已有一些笔记用 `publish` 保存出版社名称；这些非布尔值会被忽略，不会误公开。
以后建议把出版社字段逐步命名为 `publisher`，但这不是发布前置条件。

构建前，`npm run content:prepare` 会扫描原 vault，并生成两份安全输入：

- `src/generated/published-content.json`：供 Next.js 站点使用。
- `.quartz-content/`：供 Quartz 使用，保留原笔记的相对路径。

整个 `posts` vault 仍被 `.vercelignore` 排除。Quartz 只会收到已发布 Markdown，以及这些
Markdown 明确引用且扩展名在允许列表内的图片、音视频或 PDF；未引用附件不会进入产物。

## 2. i18n frontmatter

公开笔记必须同时声明 `lang` 和稳定的 `translationKey`。构建不会猜测语言；缺少字段会直接失败，
避免文章进入错误语言的搜索或图谱。

完整写法：

```yaml
---
title: 示例文章
description: 可选的摘要
date: 2026-08-30
publish: true
lang: zh-CN
translationKey: stable-article-id
tags:
  - example
---
```

字段约定：

- `lang`：必填。中文使用 `zh-CN`，英文使用 `en-US`。
- `translationKey`：必填，是不随标题和文件路径变化的内容 ID。中英文版本使用相同值；目前只有
  单一语言的文章也需要填写，方便以后增加译文。
- `title`：可选，Quartz 和 Next 都会回退到文件名。
- `description` / `summary`：可选，Next 会从正文首段生成摘要。
- `slug`：可选，只用于覆盖 Next 的文章 slug；默认使用 `translationKey`。

译文可以放在知识库的任意现有目录，不要求建立 `zh/`、`en/` 或 `Public/`。例如：

```yaml
# 中文原文
publish: true
lang: zh-CN
translationKey: quartz-i18n-design
```

```yaml
# English translation, stored anywhere in the vault
publish: true
lang: en-US
translationKey: quartz-i18n-design
```

生成器先建立 `translationKey -> zh/en` 索引，然后生成 `.quartz-content/zh` 和
`.quartz-content/en` 两份内容投影。投影会把 Wikilink 重写为当前语言的对应文章；原笔记不会被
改写。Quartz 对两份内容分别构建，因此 Graph、Search、Explorer 和 Backlinks 使用彼此隔离的
`contentIndex.json`。

中英文页面分别位于 `/zh/**` 和 `/en/**`。语言按钮会保存 `one-blog-lang` 偏好，并通过
`translationKey` 跳转当前文章的译文；访问 `/` 时优先使用已保存语言，首次访问才参考浏览器语言。
如果目标文章没有当前语言译文，它不会进入当前语言图谱；正文中的跨语言降级会被明确标注。
文章右上角的语言入口会回退到目标语言首页，并显示“译文尚未提供”的提示，不会偷偷打开另一
语言的文章或复用上一语言的 Quartz 索引。

## 3. 双站点与站点引擎

环境变量 `SITE_ENGINE` 接受 `next` 或 `quartz`，默认 `next`。本地仍可随时切换：

```powershell
$env:SITE_ENGINE = "next"
npm run build

$env:SITE_ENGINE = "quartz"
npm run build
```

也可以直接使用快捷命令：

```bash
npm run build:next
npm run build:quartz
npm run dev:next
npm run dev:quartz
```

Quartz 模式先生成静态 Quartz 站点，再由一个很薄的 Next.js 适配层提供文件响应。因此 Vercel
仍使用现有 Next.js 项目配置，只需修改 `SITE_ENGINE` 环境变量，无需更换 Framework Preset
或 Output Directory。

正式发布使用两个绑定同一 GitHub 仓库的 Vercel 项目。两者都保留 Framework Preset 为
Next.js、Build Command 为 `npm run build`，并通过 `NEXT_PUBLIC_PEER_SITE_URL` 互相显示为友链。

Quartz 项目的 Production 环境：

```text
SITE_ENGINE=quartz
QUARTZ_LOCALES=zh-CN,en-US
QUARTZ_BASE_URL=https://one-blog-bay.vercel.app
NEXT_PUBLIC_SITE_URL=https://one-blog-bay.vercel.app
NEXT_PUBLIC_PEER_SITE_URL=https://one-blog-refine.vercel.app
```

Refine 项目的 Production 环境：

```text
SITE_ENGINE=next
NEXT_PUBLIC_SITE_URL=https://one-blog-refine.vercel.app
NEXT_PUBLIC_PEER_SITE_URL=https://one-blog-bay.vercel.app
```

Preview 环境可使用 `QUARTZ_BASE_URL=auto`。构建脚本会读取 Vercel 在构建阶段注入的
`VERCEL_URL`，确保 Quartz 资源基路径、canonical 和 hreflang 指向当前预览，而不是旧部署。
Production 必须使用最终公开域名；`QUARTZ_BASE_URL` 和 `NEXT_PUBLIC_SITE_URL` 应保持一致。

Quartz 默认同时构建中英文；`QUARTZ_LOCALES` 仅用于本地诊断时限制构建语言。旧的
`QUARTZ_LOCALE` 已弃用，不再把生产站点限制为单一语言。

未登录 Vercel CLI 时，可创建临时 Quartz 预览：

```powershell
$env:SITE_ENGINE = "quartz"
$env:QUARTZ_LOCALES = "zh-CN,en-US"
npx vercel build --prod --yes
npm run vercel:preview:prepare
npx vercel deploy --temporary --prebuilt --yes --env SITE_ENGINE=quartz
```

`quartz-engine` 以公开 HTTPS 子模块获取。私有 `posts` 子模块设置为默认不递归拉取：GitHub
Actions 使用仅对 `one-hub` 有只读权限的 `POSTS_DEPLOY_KEY`，按 one-blog 记录的精确 commit
检出并校验发布投影；Vercel 不拉取原始 vault，只消费 `.quartz-content/` 和
`src/generated/published-content.json`。Vercel CLI 源码上传还会通过 `.vercelignore` 排除 vault。

## 4. 发布前检查

```bash
npm run content:prepare
npm run content:test
npm run content:verify
npm run build:quartz
npm run build:next
npm run test:e2e:refine
npm run test:e2e
```

`.quartz-content/` 和 `src/generated/published-content.json` 都只含公开内容。提交前必须运行
`content:prepare` 并提交这两个生成结果；CI 会用 `content:verify` 拒绝过期的发布投影。

## 5. 自动测试与 Git 发布

`.github/workflows/ci.yml` 会在 Pull Request 和 `main` 推送时执行：

1. 发布规则 fixture 测试；
2. 检查提交的公开内容投影是否与 vault 一致；
3. 分别构建 Next + Refine 与 Quartz；
4. 运行 Playwright 双语回归测试。

回归范围包括两种引擎的语言协商、Cookie 优先级、缺失译文回退与提示，以及 Quartz 的语言偏好
持久化、跨语言整页加载、内部链接语言前缀、英文 Search/Explorer/Graph/Backlinks 隔离、移动端
按钮、robots/sitemap/canonical/hreflang。

CI 通过后，`.github/workflows/deploy-vercel.yml` 会分别触发 Quartz 和 Refine 的永久 Vercel
Production 构建。为避免 Vercel Git 集成与 GitHub Actions 重复部署，`vercel.json` 已关闭
Vercel 自带的即时 Git 自动部署；`CI` 成功后由 GitHub Actions 调用仅绑定 `main` 的 Vercel
Deploy Hook，因此正式发布仍是单一路径：push -> CI -> Vercel Production。

仓库需配置三个最小权限 GitHub Actions Secrets：

```text
VERCEL_QUARTZ_DEPLOY_HOOK
VERCEL_REFINE_DEPLOY_HOOK
POSTS_DEPLOY_KEY
```

两个 Deploy Hook 分别由对应 Vercel 项目生成，只能触发该项目的 `main` 分支构建，不需要把个人 Vercel
Access Token 交给 GitHub。`POSTS_DEPLOY_KEY` 是 `one-hub` 的只读 Deploy Key。这些 Secret 都不应
写入仓库或日志。

Secret 只保存在 GitHub，不提交到仓库。

如果只想验收已经部署的地址，不启动本地服务器：

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://你的部署域名"
npm run test:e2e:run
```

## 6. 正式发布步骤

1. 在 `posts`（one-hub）提交并推送公开笔记；无需创建或移动到 `Public` 目录。
2. 在 one-blog 根目录运行 `npm run content:prepare`。
3. 提交 `posts` 子模块指针、`.quartz-content/`、`src/generated/published-content.json` 和站点代码。
4. 推送 one-blog 的 `main` 分支。
5. CI 全部通过后自动部署 Quartz 与 Refine 两个 Production；失败时不会覆盖线上 Production。

两个项目的 `SITE_ENGINE` 分别固定为 `quartz` 和 `next`。如需交换域名或用途，只需修改对应
项目的 `SITE_ENGINE` 与站点 URL 环境变量，再在 GitHub Actions 手动运行
`Deploy Vercel Production`。两种引擎继续读取同一份安全发布清单，目录组织无需改变。
