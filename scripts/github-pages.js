'use strict';

hexo.extend.filter.register('before_generate', function () {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) return;

  const [owner, repo] = repository.split('/');
  const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  const root = isUserSite ? '/' : `/${repo}/`;

  hexo.config.url = `https://${owner}.github.io${isUserSite ? '' : `/${repo}`}`;
  hexo.config.root = root;
});
