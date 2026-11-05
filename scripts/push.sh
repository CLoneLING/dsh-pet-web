#!/usr/bin/env bash
# 交互式把本仓库推到 GitHub —— token 只在内存里，不写进聊天、不落盘
# 用法: bash scripts/push.sh
set -euo pipefail

say() { printf '%s\n' "$*"; }
die() { printf '✗ %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null || die "没找到 git"
command -v curl >/dev/null || die "没找到 curl"

[ -d .git ] || die "当前目录不是 git 仓库，请先 cd 到项目根目录"

say "== 推送到 GitHub =="
printf 'GitHub 用户名: '; read -r GH_USER
[ -n "${GH_USER:-}" ] || die "用户名不能为空"

printf '仓库名（回车默认 dsh-pet-web）: '; read -r GH_REPO
GH_REPO="${GH_REPO:-dsh-pet-web}"

printf 'PAT（输入时不显示，粘贴后回车）: '; read -rs GH_TOKEN; echo
[ -n "${GH_TOKEN:-}" ] || die "token 不能为空"

cleanup() { unset GH_TOKEN; }
trap cleanup EXIT

say "… 验证 token"
ME=$(curl -sS --max-time 20 -H "Authorization: Bearer $GH_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/user | sed -n 's/.*"login"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -n "$ME" ] || die "token 无效或网络不通（也可能已被吊销）"
say "✓ 登录身份: $ME"

say "… 创建仓库（已存在会自动跳过）"
CODE=$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' \
  -X POST -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$GH_REPO\",\"private\":false,\"description\":\"蓝毛小女仆 · 电子宠物（纯前端）\"}" \
  https://api.github.com/user/repos)
case "$CODE" in
  201) say "✓ 仓库已创建" ;;
  422) say "· 仓库已存在，继续推送" ;;
  401) die "token 无权限创建仓库（401）" ;;
  *)   say "· 创建返回 $CODE，尝试直接推送" ;;
esac

# 用一次性 HTTP 头推送，不把 token 写进 .git/config
say "… 推送 main"
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$GH_USER/$GH_REPO.git"
git -c http.extraheader="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GH_TOKEN" | base64 | tr -d '\n')" \
    push -u origin main

say ""
say "✓ 完成: https://github.com/$GH_USER/$GH_REPO"
say "  下一步去 Cloudflare Pages 连接这个仓库"
say "  记得把刚才的 PAT 吊销掉（Settings → Developer settings → Tokens）"
