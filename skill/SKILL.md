---
name: jira-easy-cli
description: Use when managing Jira issues from the terminal - creating, querying, listing, searching, updating status, commenting, assigning, or deleting tasks via CLI. Also use when installing or configuring the jira-easy-cli npm package.
---

# Jira Easy CLI

命令行 Jira 任务管理工具，支持创建、查询、搜索、状态更新、评论、指派和删除任务。

## 安装

### npm 全局安装（推荐）

```bash
npm install -g jira-easy-cli
```

pnpm:

```bash
pnpm add -g jira-easy-cli
```

yarn:

```bash
yarn global add jira-easy-cli
```

### 从源码安装

```bash
git clone https://github.com/cjhgit/jira-cli.git
cd jira-cli
pnpm install
pnpm run build
pnpm link --global
```

### 开发模式

```bash
pnpm install
pnpm run dev issue view PROJECT-123
```

## 配置

设置三个环境变量：

```bash
export JIRA_ACCOUNT=your-username
export JIRA_PASSWORD=your-password
export JIRA_BASE_URL=https://your-jira-domain.com
```

缺少任一变量时工具会报错退出。

## 命令速查

| 命令 | 必填参数 | 可选参数 | 说明 |
|------|---------|---------|------|
| `jira issue view <key>` | 任务 Key | — | 查看任务详情 |
| `jira issue create` | `-p` 项目, `-s` 标题 | `-d` 描述, `-t` 类型(默认Task), `--priority`, `-a` 指派人, `-l` 标签 | 创建任务 |
| `jira issue list` | `-p` 项目 | `-s` 状态, `-a` 指派人, `-r` 报告人, `--all`, `-l` 数量(默认50) | 列出任务 |
| `jira issue search` | `-j` JQL | `-m` 最大结果(默认50) | JQL 搜索 |
| `jira issue update-status <key>` | `-s` 目标状态 | — | 更新状态 |
| `jira issue add-comment <key>` | `-c` 评论内容 | — | 添加评论 |
| `jira issue assign <key>` | `-a` 用户名 | — | 指派任务 |
| `jira issue delete <key>` | — | `-y` 跳过确认 | 删除任务 |
| `jira projects` | — | — | 列出所有项目 |

## 常用示例

```bash
# 查看任务
jira issue view PROJ-123

# 创建任务
jira issue create -p PROJ -s "修复登录bug" -d "用户无法登录" -t Bug --priority High

# 列出项目的进行中任务
jira issue list -p PROJ -s "In Progress"

# JQL 搜索
jira issue search -j "assignee = currentUser() AND status = Open"

# 更新状态
jira issue update-status PROJ-123 -s "Done"

# 添加评论
jira issue add-comment PROJ-123 -c "已修复，请验证"

# 指派任务
jira issue assign PROJ-123 -a username

# 删除任务（跳过确认）
jira issue delete PROJ-123 -y
```

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `错误: 缺少必需的环境变量` | 未配置环境变量 | 设置 JIRA_ACCOUNT、JIRA_PASSWORD、JIRA_BASE_URL |
| 连接超时 | JIRA_BASE_URL 不正确 | 确认 URL 格式为 `https://domain.com`，不带尾部斜杠 |
| 401 未授权 | 账号密码错误 | 检查 JIRA_ACCOUNT 和 JIRA_PASSWORD |
| 任务类型不存在 | -t 参数值不是项目可用类型 | 先用 `jira issue create` 默认 Task，或确认项目支持的自定义类型 |
