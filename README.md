# Jira CLI

Jira 命令行工具，用于查询和管理 Jira 任务。

## 功能特点

- 创建 Jira 任务
- 查询任务详情
- 列出项目任务
- 搜索任务（支持 JQL）
- 更新任务状态
- 添加评论
- 指派任务
- 查看项目列表
- 支持 TypeScript
- 命令行友好
- 支持全局安装

## 安装

### 本地开发

```bash
pnpm install
```

### 全局安装

```bash
# 从源码全局安装
pnpm install
pnpm run build
pnpm link --global

# 现在可以在任何地方使用 jira 命令
jira --help
```

## 配置

复制 `.env.example` 文件为 `.env` 并填入你的实际配置：

```bash
cp .env.example .env
```

然后编辑 `.env` 文件：

```
JIRA_ACCOUNT=your-username
JIRA_PASSWORD=your-password
JIRA_BASE_URL=https://your-jira-domain.com
```

或者直接设置环境变量：

```bash
export JIRA_ACCOUNT="your-username"
export JIRA_PASSWORD="your-password"
export JIRA_BASE_URL="https://your-jira-domain.com"
```

## 使用方法

### 查看帮助

```bash
# 查看主命令帮助
jira --help

# 查看 issue 子命令帮助
jira issue --help

# 查看具体命令的帮助
jira issue view --help
jira issue create --help
jira issue search --help
```

### 查看任务详情

```bash
# 全局安装后
jira issue view PROJECT-123

# 本地开发
pnpm run dev issue view PROJECT-123
```

### 创建任务

```bash
# 创建基本任务（全局安装）
jira issue create -p PROJECT -s "任务标题" -d "任务描述"

# 创建带优先级的任务
jira issue create -p PROJECT -s "紧急任务" --priority High

# 创建并指派任务
jira issue create -p PROJECT -s "新功能" -a username

# 创建带标签的任务
jira issue create -p PROJECT -s "新任务" -l "frontend,urgent"

# 创建指定类型的任务
jira issue create -p PROJECT -s "Bug修复" -t Bug

# 本地开发方式
pnpm run dev issue create -p PROJECT -s "任务标题"
```

### 列出任务

```bash
# 列出项目中的任务（全局安装）
jira issue list -p PROJECT

# 按状态筛选
jira issue list -p PROJECT -s "In Progress"

# 按指派人筛选
jira issue list -p PROJECT -a username

# 显示所有任务（包括已完成）
jira issue list -p PROJECT --all

# 限制结果数
jira issue list -p PROJECT -l 20

# 本地开发
pnpm run dev issue list -p PROJECT
```

### 搜索任务（JQL）

```bash
# 全局安装后
jira issue search -j "project = PROJECT AND status = 待办"
jira issue search -j "project = PROJECT AND assignee = currentUser()"

# 限制最大结果数
jira issue search -j "project = PROJECT" -m 20

# 本地开发
pnpm run dev issue search -j "project = PROJECT AND status = 待办"
```

### 更新任务状态

```bash
# 全局安装后
jira issue update-status PROJECT-123 -s "In Progress"
jira issue update-status PROJECT-123 -s "Done"

# 本地开发
pnpm run dev issue update-status PROJECT-123 -s "In Progress"
```

### 添加评论

```bash
# 全局安装后
jira issue add-comment PROJECT-123 -c "这是评论内容"

# 本地开发
pnpm run dev issue add-comment PROJECT-123 -c "这是评论内容"
```

### 指派任务

```bash
# 全局安装后
jira issue assign PROJECT-123 -a username

# 本地开发
pnpm run dev issue assign PROJECT-123 -a username
```

### 查看项目列表

```bash
# 全局安装后
jira projects

# 本地开发
pnpm run dev projects
```

## 示例

### 创建任务

```bash
jira issue create -p PROJECT -s "实现用户登录功能" -d "需要实现用户名密码登录" --priority High -a username
```

输出示例：
```
正在创建任务...
✅ 任务创建成功！
   Key: PROJECT-123
   ID: 12345
   链接: https://your-jira-domain.com/browse/PROJECT-123
```

### 查询任务

```bash
jira issue view PROJECT-123
```

输出示例：
```
正在查询任务: PROJECT-123...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
任务编号: PROJECT-123
任务标题: 实现用户登录功能
任务类型: Task
状态: 待办
优先级: Medium
创建人: John Doe (johndoe)
负责人: 未分配
项目: My Project (PROJECT)

描述:
需要实现用户名密码登录功能

创建时间: 2026-04-25T10:00:00.000+0800
更新时间: 2026-04-25T10:00:00.000+0800

链接: https://your-jira-domain.com/browse/PROJECT-123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 搜索任务

```bash
jira issue search -j "project = PROJECT AND status = 待办"
```

## 命令参数说明

### `jira issue view <issueKey>`

查看任务详情。

参数：
- `<issueKey>` - 任务 Key（必需），例如：PROJECT-123

### `jira issue create`

创建新任务。

选项：
- `-p, --project <project>` - 项目 Key（必需）
- `-s, --summary <summary>` - 任务标题（必需）
- `-d, --description <description>` - 任务描述（可选）
- `-t, --issue-type <type>` - 任务类型（可选，默认：Task）
- `--priority <priority>` - 优先级（可选）
- `-a, --assignee <assignee>` - 指派人（可选）
- `-l, --labels <labels>` - 标签，逗号分隔（可选）

### `jira issue list`

列出项目中的任务。

选项：
- `-p, --project <project>` - 项目 Key（必需）
- `-s, --status <status>` - 按状态筛选（可选）
- `-a, --assignee <assignee>` - 按指派人筛选（可选）
- `-r, --reporter <reporter>` - 按报告人筛选（可选）
- `--all` - 显示所有任务，包括已完成（可选，默认：false）
- `-l, --limit <limit>` - 最大结果数（可选，默认：50）

### `jira issue search`

搜索任务。

选项：
- `-j, --jql <jql>` - JQL 查询语句（必需）
- `-m, --max-results <number>` - 最大结果数（可选，默认：50）

### `jira issue update-status <issueKey>`

更新任务状态。

参数：
- `<issueKey>` - 任务 Key（必需），例如：PROJECT-123

选项：
- `-s, --status <status>` - 目标状态（必需）

### `jira issue add-comment <issueKey>`

添加评论到任务。

参数：
- `<issueKey>` - 任务 Key（必需），例如：PROJECT-123

选项：
- `-c, --comment <comment>` - 评论内容（必需）

### `jira issue assign <issueKey>`

指派任务给用户。

参数：
- `<issueKey>` - 任务 Key（必需），例如：PROJECT-123

选项：
- `-a, --assignee <assignee>` - 指派人用户名（必需）

### `jira projects`

列出所有可用的项目。

## 开发

项目结构：
- `src/index.ts` - 主入口文件，命令行接口
- `src/jira-client.ts` - Jira API 客户端
- `src/types.ts` - TypeScript 类型定义

### 本地开发

```bash
# 安装依赖
pnpm install

# 运行开发版本
pnpm run dev issue view PROJECT-123

# 编译
pnpm run build

# 本地链接测试全局安装
pnpm link --global
jira issue view PROJECT-123
```

## 技术栈

- TypeScript - 类型安全
- Commander.js - 命令行解析
- Axios - HTTP 客户端
