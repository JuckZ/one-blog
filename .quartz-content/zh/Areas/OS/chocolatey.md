---
title: Chocolatey
aliases: [Chocolatey]
categories: []
tags:
  - windows
  - package-manager
  - chocolatey
sources: []
authors:
  - Juck
keywords:
  - ''
draft: false
publish: true
lang: zh-CN
translationKey: chocolatey
description: 在 Windows 上安装和使用 Chocolatey，并通过命令行或图形界面管理软件包。
date: 2024-01-29
banner: "Obsidian/attachments/banner/banner5.jpg"
createTime: 2024-01-29 20:57:30
lastUpdateTime: 2026-08-31 00:00:00
cssclasses: []
weight: 8
---

# Chocolatey

如果你曾经在 Linux 或 macOS 上使用过包管理器，可能会觉得在 Windows 上逐个寻找官网、下载安装包并手动升级软件有些繁琐。

Chocolatey 是 Windows 上的包管理器，可以用一组一致的命令查找、安装、升级和卸载软件。本教程介绍 Chocolatey CLI 2.x 的基础用法。

## 安装 Chocolatey

> [!warning] 使用管理员终端
> 从开始菜单打开“Windows PowerShell”或“终端”，选择“以管理员身份运行”。执行远程安装脚本前，建议先查看脚本内容并确认来源。

在管理员 PowerShell 中执行官方安装命令[^1]：

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; `
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; `
iwr https://community.chocolatey.org/install.ps1 -UseBasicParsing | iex
```

安装完成后，重新打开终端并确认版本：

```powershell
choco --version
```

## 使用 Chocolatey

安装 Chocolatey 后，可以使用 `choco` 命令管理软件包。以下命令中的尖括号表示需要替换的参数，不要原样输入。

### 查找软件包

查找名称或描述中包含关键词的软件包：

```powershell
choco search <search-term>
```

### 安装软件包

安装软件包；`-y` 表示自动确认提示：

```powershell
choco install <package-name> -y
```

### 升级软件包

升级指定软件包：

```powershell
choco upgrade <package-name> -y
```

### 升级所有软件包

升级所有由 Chocolatey 管理的软件包：

```powershell
choco upgrade all -y
```

### 列出已安装的软件包

Chocolatey CLI 2.0 起，直接使用 `choco list` 列出本机已安装的软件包；不再需要旧的 `--local-only` 参数，普通输出下继续使用它会报错[^2]：

```powershell
choco list
```

### 卸载软件包

卸载软件包：

```powershell
choco uninstall <package-name> -y
```

## Chocolatey GUI

Chocolatey GUI 提供图形化的软件包管理界面。使用管理员 PowerShell 安装[^3]：

```powershell
choco install chocolateygui -y
```

## Reference

[^1]: [Chocolatey Docs：Set up Chocolatey CLI](https://docs.chocolatey.org/en-us/choco/setup/)
[^2]: [Chocolatey Docs：New features for Chocolatey CLI v2.0.0](https://docs.chocolatey.org/en-us/choco/new-in-v2/)
[^3]: [Chocolatey GUI Docs：Installation](https://docs.chocolatey.org/en-us/chocolatey-gui/setup/installation/)
