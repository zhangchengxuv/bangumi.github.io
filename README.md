# 漫游放映室

一个已经配置好的 Hexo 追番博客。追番数据来自 Bangumi 用户 `829882`，推送到 GitHub 后会自动构建并发布到 GitHub Pages。

## 本地预览

需要 Node.js 20 或更新版本。

```bash
corepack enable
pnpm install
pnpm sync:bangumi
pnpm dev
```

打开 `http://localhost:4000`。

## 发布到 GitHub Pages

1. 在 GitHub 新建仓库。推荐命名为 `你的用户名.github.io`；其他仓库名也支持。
2. 把本项目全部文件推送到仓库的 `main` 分支。
3. 打开仓库的 **Settings → Pages**，将 **Source** 设为 **GitHub Actions**。
4. 等待 Actions 中的 `Deploy Hexo to GitHub Pages` 完成，页面即可访问。

工作流每天北京时间约 06:17 自动同步一次 Bangumi 数据，也可以在 GitHub 的 **Actions** 页面手动运行。

## 日常使用

新建文章：

```bash
npx hexo new "文章标题"
```

文章保存在 `source/_posts/`。编辑完成后提交并推送，GitHub 会自动发布。

手动更新追番数据：

```bash
pnpm sync:bangumi
```

## 常用定制

- 网站标题、作者、Bangumi UID：`_config.yml`
- 导航和页脚：`themes/stargazer/_config.yml`
- 主题样式：`themes/stargazer/source/css/style.css`
- 追番页样式：`themes/stargazer/source/css/bangumi-custom.css`

> Bangumi 收藏需设为公开，插件才能正常读取列表。
