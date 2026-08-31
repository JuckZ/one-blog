---
title: Quartz Chinese–English Switching Example
description: An English example demonstrating how One Blog pairs and switches translated articles.
date: 2026-08-30
publish: true
lang: en-US
translationKey: quartz-i18n-example
tags:
  - blog
  - quartz
  - i18n
---

# Quartz Chinese–English Switching Example

This is the English version of the example article. It remains in the vault's existing `Projects/Blog` directory instead of being moved to a dedicated publishing folder.

## Publishing rule

The site publishes only notes whose frontmatter explicitly contains `publish: true`. Private notes without that property never enter the Quartz build input.

## Translation pairing

The Chinese and English notes share `translationKey: quartz-i18n-example`. During the build, One Blog recognizes the pair and adds a language switcher in the upper-right corner.

> [!tip]
> Select **中文** to open the Chinese version. After switching to English, search, explorer, and graph navigation use only the English content index.

Return to the [[index|home page]] to continue exploring the English graph.
