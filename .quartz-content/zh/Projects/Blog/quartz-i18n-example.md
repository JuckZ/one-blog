---
title: Quartz 中英文切换示例
description: 一篇用于演示 One Blog 中英文文章配对与切换的中文示例。
date: 2026-08-30
publish: true
lang: zh-CN
translationKey: quartz-i18n-example
tags:
  - blog
  - quartz
  - i18n
---

# Quartz 中英文切换示例

这是这篇示例文章的中文版本。它仍然保存在知识库原有的 `Projects/Blog` 目录中，没有移动到专门的发布目录。

## 发布规则

本站只发布 frontmatter 中明确设置 `publish: true` 的笔记。未设置该属性的私人笔记不会进入 Quartz 的构建输入。

## 语言配对

中文与英文笔记使用相同的 `translationKey: quartz-i18n-example`。构建时，One Blog 会识别这组对应关系，并在页面右上角生成语言切换入口。

> [!tip]
> 点击 **English** 即可打开英文版本；切换后，搜索、目录和关系图谱都只使用英文内容索引。

返回 [[index|首页]]，可以继续从中文图谱浏览。
