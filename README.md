# 世界线观测站

一个已经配置完成的 Hexo Bangumi 收藏站。数据来自 Bangumi 用户 `829882`，推送到 GitHub 后会自动构建并发布到 GitHub Pages。

站点只有一个收藏页面，包含“动画 / 我的书籍 / 我的游戏”三个入口。每个入口不再区分想看、在看、已看等状态，所有条目合并后按照中文拼音排序，并以 `# / A–Z` 分组。右侧字母索引可直接定位，向下滚动会继续加载，无须翻页。

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

1. 把本项目全部文件推送到仓库的 `main` 分支。
2. 打开仓库的 **Settings → Pages**，将 **Source** 设置为 **GitHub Actions**。
3. 等待 Actions 中的 `Deploy Hexo to GitHub Pages` 完成。

工作流每天北京时间约 06:17 自动同步动画、书籍和游戏收藏，也可以在 GitHub 的 **Actions** 页面手动运行。

## 手动同步

```bash
# 同步动画、书籍和游戏
pnpm sync:bangumi

# 也可以分别同步
pnpm sync:anime
pnpm sync:books
pnpm sync:games
```

## 常用定制位置

- 网站标题、Bangumi UID：`_config.yml`
- 站名和页脚：`themes/stargazer/_config.yml`
- 收藏页面样式：`themes/stargazer/source/css/bangumi-custom.css`
- 拼音分组、字母索引和滚动加载：`themes/stargazer/source/js/bangumi-infinite.js`
- 书籍与游戏同步：`scripts/bangumi-books.js`
- 自动生成详情页：`scripts/bangumi-pages.js`

> Bangumi 收藏需要设为公开，自动同步才能读取列表。
