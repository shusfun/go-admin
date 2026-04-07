# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 包：@suiyuan/design-tokens

设计令牌包，定义全局品牌色和主题 CSS 变量。

## 导出

- `src/index.ts` — 导出 `brandTokens` 对象（JavaScript 中使用的品牌色常量：`colorInk`、`colorMuted`、`colorAccent`、`colorHighlight`、`colorCanvas`）
- `src/theme.css` — CSS 自定义属性和全局重置样式（通过 `@suiyuan/design-tokens/theme.css` 导入）

## CSS 变量清单

| 变量 | 用途 |
|------|------|
| `--font-display` / `--font-body` | 标题字体（Fraunces）/ 正文字体（Manrope） |
| `--color-ink` / `--color-muted` | 主文字色 / 次要文字色 |
| `--color-canvas` / `--color-panel` | 背景色 / 面板色 |
| `--color-accent` / `--color-accent-soft` | 强调色（teal）/ 浅强调色 |
| `--color-highlight` / `--color-highlight-soft` | 高亮色（orange）/ 浅高亮色 |
| `--radius-sm/md/lg` | 圆角大小（14/22/32px） |
| `--shadow-soft` / `--shadow-float` | 阴影效果 |
| `--grid-gap` | 网格间距 |

## 使用方式

应用在入口处导入 `@suiyuan/design-tokens/theme.css` 即可获得全局变量和重置样式。

## 开发命令

```bash
pnpm build       # tsc 编译
pnpm typecheck   # 类型检查
```
