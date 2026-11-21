# One Blog 发布与 i18n 约定

One Blog 的 Quartz 和 Next.js + Refine 站点从同一份 Obsidian 内容生成。笔记继续写在原来的目录里。

## 1. 日常写作和发布

笔记保留原来的目录和模板。决定公开时设置布尔值 `publish: true`，补齐正文的语言和稳定标识。
现有笔记的 `publish` 若是出版社等文本，仍按普通属性处理。下架时将 `publish` 改为 `false`。

```yaml
---
publish: true
lang: zh-CN
translationKey: stable-article-id
---
```

沿用 `date` 或模板已填写的 `published`、`created`、`createTime`。缺少日期时补一次
`date: YYYY-MM-DD`。发布状态统一使用 `publish`。旧笔记若仍同时设置 `publish: true` 和
`draft: true`，生成器会提示文件名并停止，供发布者核对公开意图。

发布执行者运行 `npm run content:prepare`，从私有 vault 生成两个站点的公开输入。

- `src/generated/published-content.json`：供 Next.js 站点使用。
- `.quartz-content/`：供 Quartz 使用，按语言分开并保留主题目录。

生成后检查 Markdown、属性和附件。日常站点预览、构建和 Vercel 部署直接读取已提交的公开版本。
`posts` 私有 vault 由 `.vercelignore` 排除。

## 2. 翻译

正文用中文时设 `lang: zh-CN`，用英文时设 `lang: en-US`。单语可以先发布。补译文时沿用原文的
`translationKey`，按译文设置 `lang`，准备完成后分别开启发布。把译文放在同一个主题目录，便于
维护笔记和保持 Quartz 地址稳定。标题、摘要、标签按需填写，Next 的自定义 `slug` 也是可选项。

生成器先建立 `translationKey -> zh/en` 索引，然后生成 `.quartz-content/zh` 和
`.quartz-content/en` 两份内容投影。投影会把 Wikilink 重写为当前语言的对应文章；原笔记不会被
改写。Quartz 对两份内容分别构建，因此 Graph、Search、Explorer 和 Backlinks 使用彼此隔离的
`contentIndex.json`。

中英文页面分别位于 `/zh/**` 和 `/en/**`。语言按钮会保存 `one-blog-lang` 偏好，并通过
`translationKey` 跳转当前文章的译文；访问 `/` 时优先使用已保存语言，首次访问才参考浏览器语言。
如果目标文章没有当前语言译文，它不会进入当前语言图谱；正文中的跨语言降级会被明确标注。
语言切换器会回退到目标语言首页，并显示“译文尚未提供”的提示，不会偷偷打开另一
语言的文章或复用上一语言的 Quartz 索引。

Quartz 的 `configuration.locale` 负责官方组件文案和日期格式，但官方没有跨多个独立构建的
现成语言切换组件。因此 One Blog 保留 URL、Cookie 和 `translationKey` 映射逻辑，把自定义的
“中 / EN”分段切换器放进 Quartz 官方 toolbar，与 Search、Darkmode、Reader mode 同组。
Next + Refine 的公开博客使用同一视觉模型；Refine 的 `i18nProvider`、`useSetLocale` 和
`useGetLocale` 仍适合应用内部状态，但公开博客需要以 `/zh`、`/en` 路由为 SEO 和内容索引边界，
所以切换动作继续使用真实链接并写入 `one-blog-lang` Cookie，而不是只修改客户端状态。

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
Next.js、Build Command 为 `npm run build`。`ihave.cool` 是知识库，`blog.ihave.cool` 是博客，
两站在页脚互相链接。正式构建读取 Vercel 提供的生产主域名，生成 canonical、站点地图和页脚链接。
两站均提供 `/zh/rss.xml` 和 `/en/rss.xml`，`/rss.xml` 使用默认语言。
本地、预览和其他部署可以继续通过 `NEXT_PUBLIC_PEER_SITE_URL` 配置页脚链接。

Quartz 项目的 Production 环境：

```text
SITE_ENGINE=quartz
QUARTZ_LOCALES=zh-CN,en-US
```

Refine 项目的 Production 环境：

```text
SITE_ENGINE=next
```

Preview 环境可使用 `QUARTZ_BASE_URL=auto`。构建脚本会读取 Vercel 在构建阶段注入的
`VERCEL_URL`，确保 Quartz 资源基路径、canonical 和 hreflang 指向当前预览，而不是旧部署。
自行部署时可用 `QUARTZ_BASE_URL` 和 `NEXT_PUBLIC_SITE_URL` 指定公开域名，两者应保持一致。

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

## 4. 自动测试与 Git 发布

`.github/workflows/ci.yml` 会在 Pull Request 和 `main` 推送时执行：

1. 运行代码 lint 和发布规则测试。
2. 用 `content:verify` 核对已提交的 JSON、Quartz 笔记和附件是否与固定的 vault 版本一致。
3. 分别构建 Next + Refine 与 Quartz；
4. 运行 Playwright 双语回归测试。

回归范围包括两种引擎的语言协商、Cookie 优先级、缺失译文回退与提示，以及 Quartz 的语言偏好
持久化、跨语言整页加载、内部链接语言前缀、英文 Search/Explorer/Graph/Backlinks 隔离、语言
切换器的 toolbar/header 位置、移动端边界和选中态，以及 robots/sitemap/canonical/hreflang。

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

## 5. 正式发布步骤

1. 在 `posts`（one-hub）提交并推送指定的笔记和附件，核对待推送的提交范围。
2. 在 one-blog 根目录运行 `npm run content:prepare`，核对生成结果。将对应的 `posts` 子模块指针、
   `.quartz-content/` 和 `src/generated/published-content.json` 一起提交。
3. 推送 one-blog 的 `main`。CI 校验通过后，Quartz 和 Refine 自动部署到生产域名。

两个项目的 `SITE_ENGINE` 分别固定为 `quartz` 和 `next`。如需交换域名或用途，只需修改对应
项目的 `SITE_ENGINE` 与站点 URL 环境变量，再在 GitHub Actions 手动运行
`Deploy Vercel Production`。两种引擎继续读取同一份安全发布清单，目录组织无需改变。
