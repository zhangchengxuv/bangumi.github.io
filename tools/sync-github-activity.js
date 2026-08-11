'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const packageData = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const username = process.env.GITHUB_USERNAME
  || packageData.githubActivity?.username
  || process.env.GITHUB_REPOSITORY_OWNER
  || 'zhangchengxuv';
const token = process.env.GITHUB_TOKEN;
const outputPath = path.join(projectRoot, 'source', 'github-activity.json');

if (!token) {
  console.warn('GITHUB_TOKEN is not set; keeping the cached GitHub activity data.');
  process.exit(0);
}

const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'User-Agent': 'hexo-bangumi-diary',
  'X-GitHub-Api-Version': '2022-11-28',
};

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function getContributionCalendar() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  const query = `
    query Activity($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        login
        name
        avatarUrl
        url
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                weekday
              }
            }
          }
        }
      }
    }`;
  const payload = await request('https://api.github.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { login: username, from: from.toISOString(), to: to.toISOString() },
    }),
  });
  if (payload.errors?.length) throw new Error(payload.errors.map(error => error.message).join('; '));
  if (!payload.data?.user) throw new Error(`GitHub user ${username} was not found.`);
  return {
    profile: payload.data.user,
    calendar: payload.data.user.contributionsCollection.contributionCalendar,
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

async function getCommitsForPush(event) {
  const repository = event.repo.name;
  const branch = String(event.payload.ref || '').replace('refs/heads/', '');
  const before = event.payload.before;
  const head = event.payload.head;
  let commits = [];

  try {
    if (before && !/^0+$/.test(before)) {
      const comparison = await request(`https://api.github.com/repos/${repository}/compare/${before}...${head}?per_page=100`);
      commits = comparison.commits || [];
    } else if (head) {
      commits = [await request(`https://api.github.com/repos/${repository}/commits/${head}`)];
    }
  } catch (error) {
    console.warn(`Could not expand push ${head} in ${repository}: ${error.message}`);
  }

  return commits.map(item => ({
    sha: item.sha,
    shortSha: item.sha.slice(0, 7),
    message: String(item.commit?.message || '').split('\n')[0],
    url: item.html_url || `https://github.com/${repository}/commit/${item.sha}`,
    repository,
    repositoryUrl: `https://github.com/${repository}`,
    branch,
    committedAt: item.commit?.author?.date || event.created_at,
    author: item.author?.login || item.commit?.author?.name || username,
  }));
}

async function getRecentCommits() {
  const events = await request(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`);
  const pushes = events.filter(event => event.type === 'PushEvent').slice(0, 20);
  const expanded = await Promise.all(pushes.map(getCommitsForPush));
  const unique = new Map();
  expanded.flat().forEach(commit => unique.set(commit.sha, commit));
  return [...unique.values()]
    .sort((left, right) => new Date(right.committedAt) - new Date(left.committedAt))
    .slice(0, 30);
}

(async () => {
  const [{ profile, calendar, from, to }, commits] = await Promise.all([
    getContributionCalendar(),
    getRecentCommits(),
  ]);
  const data = {
    username: profile.login,
    name: profile.name || profile.login,
    avatarUrl: profile.avatarUrl,
    profileUrl: profile.url,
    totalContributions: calendar.totalContributions,
    from,
    to,
    generatedAt: new Date().toISOString(),
    weeks: calendar.weeks,
    commits,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`Synced ${data.totalContributions} contributions and ${commits.length} commits for ${username}.`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
