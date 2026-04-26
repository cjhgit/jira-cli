---
name: jira-easy-cli
description: Use when managing Jira issues from the terminal - creating, querying, listing, searching, updating, commenting, assigning, deleting, downloading attachments, managing sprints, setting parent-child relationships, adding flags, or editing tasks via CLI. Also use when listing assignable users or projects. Also use when installing or configuring the jira-easy-cli npm package.
---

# Jira Easy CLI

功能强大的命令行 Jira 任务管理工具，支持创建、查询、搜索、更新、评论、指派、删除任务，下载附件，管理 Sprint，设置父子任务关系，添加标识等完整功能。

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

支持三种配置方式：

### 方式一：命令配置（推荐）

```bash
jira config set account your-username
jira config set password your-password
jira config set baseUrl https://your-jira-domain.com

# 查看配置
jira config get
```

配置保存在 `~/.jira-easy-cli/config.json`。

### 方式二：环境变量

```bash
export JIRA_ACCOUNT=your-username
export JIRA_PASSWORD=your-password
export JIRA_BASE_URL=https://your-jira-domain.com
```

### 方式三：.env 文件（仅开发模式）

创建 `.env` 文件并设置相同的环境变量。

**优先级**：环境变量 > 配置文件。缺少任一配置时工具会报错退出。

## 命令速查

### 任务基本操作

| 命令 | 必填参数 | 可选参数 | 说明 |
|------|---------|---------|------|
| `jira issue view <key>` | 任务 Key | — | 查看任务详情 |
| `jira issue create` | `-p` 项目, `-s` 标题 | `-d` 描述, `-t` 类型(默认Task), `--priority`, `-a` 指派人, `-l` 标签, `--parent` 父任务, `--no-sprint` | 创建任务或子任务 |
| `jira issue list` | `-p` 项目 | `-s` 状态, `-a` 指派人, `-r` 报告人, `--parent` 父任务, `--current-sprint`, `--all`, `-l` 数量(默认50) | 列出任务 |
| `jira issue search` | `-j` JQL | `-m` 最大结果(默认50) | JQL 搜索 |
| `jira issue delete <key>` | — | `-y` 跳过确认 | 删除任务 |

### 任务更新操作

| 命令 | 必填参数 | 可选参数 | 说明 |
|------|---------|---------|------|
| `jira issue edit <key>` | — | `-s` 标题, `-d` 描述, `-p` 优先级, `-l` 标签, `-t` 类型 | 修改任务 |
| `jira issue update-status <key>` | `-s` 目标状态 | — | 更新状态 |
| `jira issue update-description <key>` | `-d` 新描述 | — | 更新描述 |
| `jira issue assign <key>` | `-a` 用户名 | — | 指派任务 |

### 评论操作

| 命令 | 必填参数 | 可选参数 | 说明 |
|------|---------|---------|------|
| `jira issue add-comment <key>` | `-c` 评论内容 | — | 添加评论 |
| `jira issue edit-comment <key>` | `-c` 评论ID, `-t` 新内容 | — | 修改评论 |
| `jira issue delete-comment <key>` | `-c` 评论ID | `-y` 跳过确认 | 删除评论 |

### Sprint 管理

| 命令 | 必填参数 | 可选参数 | 说明 |
|------|---------|---------|------|
| `jira issue add-to-current-sprint <key>` | — | `-b` Board ID, `-s` Sprint ID | 添加到当前 Sprint |
| `jira issue remove-from-current-sprint <key>` | — | — | 从 Sprint 中移出 |

### 父子任务关系

| 命令 | 必填参数 | 可选参数 | 说明 |
|------|---------|---------|------|
| `jira issue set-parent <key>` | `-p` 父任务 Key | `--auto-convert` | 设置为子任务 |
| `jira issue remove-parent <key>` | — | `--auto-convert` | 子任务变独立任务 |

### 任务标识

| 命令 | 必填参数 | 可选参数 | 说明 |
|------|---------|---------|------|
| `jira issue add-flag <key>` | — | `-m` 原因说明 | 添加标识 🚩 |
| `jira issue remove-flag <key>` | — | — | 移除标识 |

### 附件管理

| 命令 | 必填参数 | 可选参数 | 说明 |
|------|---------|---------|------|
| `jira issue download-attachment <key>` | `-a` 附件ID或文件名 | `-o` 输出路径 | 下载任务附件 |

### 项目和用户

| 命令 | 必填参数 | 可选参数 | 说明 |
|------|---------|---------|------|
| `jira projects` | — | — | 列出所有项目 |
| `jira assignees` | `-p` 项目 或 `-i` 任务 | `-m` 最大结果(默认50) | 列出可分配的用户 |

### 配置管理

| 命令 | 必填参数 | 可选参数 | 说明 |
|------|---------|---------|------|
| `jira config set <key> <value>` | key (account/password/baseUrl), value | — | 设置配置 |
| `jira config get [key]` | — | key (可选) | 查看配置 |

## 常用示例

### 配置管理

```bash
# 首次使用，设置配置
jira config set account your-username
jira config set password your-password
jira config set baseUrl https://your-jira-domain.com

# 查看所有配置
jira config get

# 查看单个配置项
jira config get account
```

### 基本操作

```bash
# 查看任务详情
jira issue view PROJ-123

# 创建任务（自动加入当前 Sprint）
jira issue create -p PROJ -s "修复登录bug" -d "用户无法登录" -t Bug --priority High

# 创建任务但不加入 Sprint（保留在 Backlog）
jira issue create -p PROJ -s "需求调研" --no-sprint

# 创建子任务
jira issue create -p PROJ -s "编写测试用例" --parent PROJ-123 -t Sub-task

# 列出项目的进行中任务
jira issue list -p PROJ -s "In Progress"

# 列出当前 Sprint 中的任务
jira issue list -p PROJ --current-sprint

# 查看某个任务的所有子任务
jira issue list -p PROJ --parent PROJ-123

# JQL 搜索
jira issue search -j "assignee = currentUser() AND status = Open"

# 删除任务（跳过确认）
jira issue delete PROJ-123 -y
```

### 更新操作

```bash
# 编辑任务（多个字段）
jira issue edit PROJ-123 -s "新标题" -p High -l "urgent,backend"

# 更新状态
jira issue update-status PROJ-123 -s "Done"

# 更新描述
jira issue update-description PROJ-123 -d "更新后的详细描述信息"

# 指派任务
jira issue assign PROJ-123 -a username
```

### 评论管理

```bash
# 添加评论
jira issue add-comment PROJ-123 -c "已修复，请验证"

# 修改评论（需要评论 ID）
jira issue edit-comment PROJ-123 -c 12345 -t "更新后的评论内容"

# 删除评论
jira issue delete-comment PROJ-123 -c 12345 -y
```

### Sprint 管理

```bash
# 将任务添加到当前活动的 Sprint
jira issue add-to-current-sprint PROJ-123

# 指定 Board ID 添加到 Sprint
jira issue add-to-current-sprint PROJ-123 -b 1

# 从 Sprint 中移出任务
jira issue remove-from-current-sprint PROJ-123
```

### 父子任务关系

```bash
# 将任务转换为子任务
jira issue set-parent PROJ-124 -p PROJ-123 --auto-convert

# 将子任务转换为独立任务
jira issue remove-parent PROJ-124 --auto-convert
```

### 标识管理

```bash
# 添加标识（标记为需要关注）
jira issue add-flag PROJ-123 -m "等待外部依赖"

# 移除标识
jira issue remove-flag PROJ-123
```

### 附件下载

```bash
# 先查看任务的附件信息（包含附件 ID 和文件名）
jira issue view PROJ-123

# 使用附件 ID 下载（文件会保存到当前目录）
jira issue download-attachment PROJ-123 -a 12345

# 使用文件名下载
jira issue download-attachment PROJ-123 -a "screenshot.png"

# 指定输出路径
jira issue download-attachment PROJ-123 -a 12345 -o ~/Downloads/file.png

# 指定输出目录（会使用原始文件名）
jira issue download-attachment PROJ-123 -a "report.pdf" -o ~/Documents/
```

### 查询信息

```bash
# 列出所有项目
jira projects

# 查看项目可分配的用户
jira assignees -p PROJ

# 查看任务可分配的用户
jira assignees -i PROJ-123
```

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `错误: 缺少必需的环境变量` | 未配置环境变量 | 设置 JIRA_ACCOUNT、JIRA_PASSWORD、JIRA_BASE_URL |
| 连接超时 | JIRA_BASE_URL 不正确 | 确认 URL 格式为 `https://domain.com`，不带尾部斜杠 |
| 401 未授权 | 账号密码错误 | 检查 JIRA_ACCOUNT 和 JIRA_PASSWORD |
| 任务类型不存在 | -t 参数值不是项目可用类型 | 使用默认 Task 或确认项目支持的类型名称 |
| 创建子任务失败 | 未指定子任务类型或使用了父任务类型 | 创建子任务时使用 `-t Sub-task` 或 `-t Subtask` |
| 无法添加到 Sprint | 项目没有 Board 或无活动 Sprint | 先在 Jira 创建 Scrum Board 并启动 Sprint |
| 设置父任务失败 | 直接修改 parent 字段受限制 | 使用 `--auto-convert` 参数自动转换 |
| 评论 ID 不知道 | 需要评论 ID 才能编辑/删除 | 先用 `jira issue view` 查看任务，评论会显示 ID |

## 提示与技巧

- 创建任务时默认会自动加入当前 Sprint，使用 `--no-sprint` 保留在 Backlog
- 查看任务的子任务用 `--parent` 参数
- 只查看当前 Sprint 任务用 `--current-sprint` 参数
- 父子任务转换会改变任务 Key，但内容完整保留
- 标识功能通过 `FLAGGED` 标签实现，兼容所有 Jira 实例
- 可以组合多个筛选条件，如 `--current-sprint -a username -s "In Progress"`
- 下载附件时可以使用附件 ID 或完整文件名，先用 `jira issue view` 查看附件列表
- 下载附件支持流式传输，适合下载大文件，内存占用低
