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
- 删除任务
- 将任务添加到当前 Sprint
- 将任务从当前 Sprint 中移出
- 将任务设置为子任务
- 将子任务变成独立任务
- 给任务添加标识（flag）
- 移除任务的标识（flag）
- 查看项目列表
- 查看可分配用户列表
- 配置管理（通过命令设置账号信息）
- 支持 TypeScript
- 命令行友好
- 支持全局安装

## 安装

### 通过 npm 全局安装（推荐）

```bash
# 使用 npm 安装
npm install -g jira-easy-cli

# 或使用 pnpm 安装
pnpm add -g jira-easy-cli

# 或使用 yarn 安装
yarn global add jira-easy-cli

# 安装完成后可以在任何地方使用 jira 命令
jira --help
```

### 本地开发

```bash
pnpm install
```

### 从源码全局安装

```bash
# 克隆仓库
git clone https://github.com/cjhgit/jira-cli.git
cd jira-cli

# 从源码全局安装
pnpm install
pnpm run build
pnpm link --global

# 现在可以在任何地方使用 jira 命令
jira --help
```

## 配置

有三种方式配置 Jira 连接信息：

### 方式一：使用配置命令（推荐）

```bash
# 设置配置
jira config set account your-username
jira config set password your-password
jira config set baseUrl https://your-jira-domain.com

# 查看所有配置
jira config get

# 查看单个配置项
jira config get account
```

配置会保存在 `~/.jira-easy-cli/config.json` 文件中。

### 方式二：设置环境变量

```bash
export JIRA_ACCOUNT="your-username"
export JIRA_PASSWORD="your-password"
export JIRA_BASE_URL="https://your-jira-domain.com"
```

### 方式三：使用 .env 文件（仅本地开发）

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

> 注意：环境变量的优先级高于配置文件。如果同时设置了环境变量和配置文件，将优先使用环境变量的值。

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
# 如果项目有活动的 Sprint，会自动添加到当前 Sprint
jira issue create -p PROJECT -s "任务标题" -d "任务描述"

# 创建任务但不添加到 Sprint（保留在 Backlog）
jira issue create -p PROJECT -s "任务标题" --no-sprint

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

# 只列出当前活动 Sprint 中的任务
jira issue list -p PROJECT --current-sprint

# 查看某个任务的所有子任务
jira issue list -p PROJECT --parent PROJECT-123

# 按状态筛选
jira issue list -p PROJECT -s "In Progress"

# 按指派人筛选
jira issue list -p PROJECT -a username

# 组合筛选：当前 Sprint 中我的任务
jira issue list -p PROJECT --current-sprint -a username

# 组合筛选：当前 Sprint 中进行中的任务
jira issue list -p PROJECT --current-sprint -s "In Progress"

# 组合筛选：某个任务下我的进行中子任务
jira issue list -p PROJECT --parent PROJECT-123 -a username -s "In Progress"

# 显示所有任务（包括已完成）
jira issue list -p PROJECT --all

# 限制结果数
jira issue list -p PROJECT -l 20

# 本地开发
pnpm run dev issue list -p PROJECT
```

**提示**: 列表会显示序号，方便计数和沟通，例如"第3个任务"。

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

### 删除任务

```bash
# 交互式删除（显示信息后等待回车确认）
jira issue delete PROJECT-123

# 跳过确认直接删除
jira issue delete PROJECT-123 -y

# 本地开发
pnpm run dev issue delete PROJECT-123
```

⚠️ **警告**：删除任务是不可逆的操作！默认会显示任务信息并等待你按回车确认，使用 `-y` 参数可以跳过确认直接删除。

### 将任务添加到当前 Sprint

```bash
# 自动添加到当前活动的 sprint（全局安装）
jira issue add-to-current-sprint PROJECT-123

# 指定 Board ID
jira issue add-to-current-sprint PROJECT-123 -b 1

# 指定 Sprint ID
jira issue add-to-current-sprint PROJECT-123 -s 10

# 本地开发
pnpm run dev issue add-to-current-sprint PROJECT-123
```

### 将任务从当前 Sprint 中移出

```bash
# 全局安装后
jira issue remove-from-current-sprint PROJECT-123

# 本地开发
pnpm run dev issue remove-from-current-sprint PROJECT-123
```

### 将任务设置为子任务

将一个独立任务变成另一个任务的子任务。

⚠️ **注意**：由于 Jira API 限制，此操作会创建新的子任务并删除原任务（任务 Key 会改变，但内容会完整保留）。

```bash
# 将 PROJECT-124 设置为 PROJECT-123 的子任务（全局安装）
jira issue set-parent PROJECT-124 -p PROJECT-123 --auto-convert

# 本地开发
pnpm run dev issue set-parent PROJECT-124 -p PROJECT-123 --auto-convert
```

成功输出示例：
```
正在将任务 CR-5722 设置为 CR-5710 的子任务...
正在将任务转换为子任务（会创建新任务并删除原任务）...
正在创建新的子任务...
新子任务已创建: CR-5723
正在删除原任务 CR-5722...

✅ 任务已成功转换为子任务

重要提示:
  原任务: CR-5722 (已删除)
  新子任务: CR-5723
  新子任务链接: http://jira.weyatech.cn:8083/browse/CR-5723
  父任务: CR-5710

所有内容（标题、描述、评论等）已复制到新子任务

💡 提示: 使用 jira issue view CR-5723 查看新子任务信息
```

### 将子任务变成独立任务

移除子任务的父任务关联，使其变成独立任务。

⚠️ **注意**：由于 Jira API 限制，此操作会创建新的独立任务并删除原子任务（任务 Key 会改变，但内容会完整保留）。

```bash
# 将子任务变成独立任务（全局安装）
jira issue remove-parent PROJECT-124 --auto-convert

# 本地开发
pnpm run dev issue remove-parent PROJECT-124 --auto-convert
```

成功输出示例：
```
正在将子任务 CR-5721 变成独立任务...
正在将子任务转换为独立任务（会创建新任务并删除原子任务）...
正在创建新的独立任务...
新任务已创建: CR-5722
正在删除原子任务 CR-5721...

✅ 子任务已成功转换为独立任务

重要提示:
  原子任务: CR-5721 (已删除)
  新任务: CR-5722
  新任务链接: http://jira.weyatech.cn:8083/browse/CR-5722

所有内容（标题、描述、评论等）已复制到新任务

💡 提示: 使用 jira issue view CR-5722 查看新任务信息
```

### 给任务添加标识（flag）

给任务添加标识，通常用于标记任务被阻塞或需要特别关注。

**实现方式**：通过添加 `FLAGGED` 标签来标记任务，这样更通用、兼容所有 Jira 实例。

```bash
# 添加标识（全局安装）
jira issue add-flag PROJECT-123

# 添加标识并说明原因
jira issue add-flag PROJECT-123 -m "等待外部依赖"

# 本地开发
pnpm run dev issue add-flag PROJECT-123 -m "需要技术评审"
```

成功输出示例：
```
正在给任务 CR-5723 添加标识...
✅ 任务 CR-5723 已添加标识 🚩
   原因: 测试 flag 功能
```

添加标识后，任务会：
- 在标签列表中显示 `FLAGGED` 标签
- 如果提供了原因，会添加一条带 🚩 图标的评论说明

### 移除任务的标识（flag）

移除任务的标识（移除 `FLAGGED` 标签）。

```bash
# 移除标识（全局安装）
jira issue remove-flag PROJECT-123

# 本地开发
pnpm run dev issue remove-flag PROJECT-123
```

### 查看项目列表

```bash
# 全局安装后
jira projects

# 本地开发
pnpm run dev projects
```

### 查看可分配用户列表

```bash
# 查看项目中可分配的用户（全局安装）
jira assignees -p PROJECT

# 查看某个任务可分配的用户
jira assignees -i PROJECT-123

# 限制最大结果数
jira assignees -p PROJECT -m 20

# 本地开发
pnpm run dev assignees -p PROJECT
```

### 配置管理

```bash
# 设置配置
jira config set account your-username
jira config set password your-password
jira config set baseUrl https://your-jira-domain.com

# 查看所有配置
jira config get

# 查看单个配置项
jira config get account

# 查看配置命令帮助
jira config --help
```

配置会保存在 `~/.jira-easy-cli/config.json` 文件中。

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

### 创建子任务

⚠️ **注意**：创建子任务时必须指定子任务类型（如 `Sub-task` 或 `Subtask`），否则会显示友好的错误提示。

```bash
# 创建子任务（必须指定子任务类型）
jira issue create -p PROJECT -s "设计登录界面" -d "设计用户登录页面的UI" --parent PROJECT-123 -t Sub-task

# 创建子任务的完整示例
jira issue create -p CR -s "编写单元测试" -d "为登录功能编写单元测试" --parent CR-5710 -t Sub-task
```

成功输出示例：
```
正在创建子任务...
✅ 子任务创建成功！
   Key: CR-5712
   ID: 42577
   父任务: CR-5710
   链接: http://jira.weyatech.cn:8083/browse/CR-5712
```

如果忘记指定子任务类型，会显示友好的错误提示：
```
正在创建子任务...
错误: 请求失败: 创建子任务时必须指定子任务类型！

当前任务类型: Task
父任务: CR-5710

请使用 -t 参数指定子任务类型，例如：
  -t Sub-task
  -t Subtask
  -t 子任务

完整示例：
  jira issue create -p CR -s "测试错误提示" --parent CR-5710 -t Sub-task
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

创建新任务。默认情况下，如果项目有活动的 Sprint，会自动将任务添加到当前 Sprint。

选项：
- `-p, --project <project>` - 项目 Key（必需）
- `-s, --summary <summary>` - 任务标题（必需）
- `-d, --description <description>` - 任务描述（可选）
- `-t, --issue-type <type>` - 任务类型（可选，默认：Task）
- `--priority <priority>` - 优先级（可选）
- `-a, --assignee <assignee>` - 指派人（可选）
- `-l, --labels <labels>` - 标签，逗号分隔（可选）
- `--parent <parent>` - 父任务 Key，用于创建子任务（可选）
- `--no-sprint` - 不自动添加到当前活动的 Sprint，任务保留在 Backlog（可选）

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

### `jira issue delete <issueKey>`

删除任务。

参数：
- `<issueKey>` - 任务 Key（必需），例如：PROJECT-123

选项：
- `-y, --yes` - 跳过确认，直接删除（可选，默认：false）

⚠️ **警告**：删除操作不可逆！默认会显示任务信息并等待回车确认，使用 `-y` 参数可以跳过确认直接删除。

### `jira issue add-to-current-sprint <issueKey>`

将任务添加到当前活动的 Sprint。

参数：
- `<issueKey>` - 任务 Key（必需），例如：PROJECT-123

选项：
- `-b, --board <boardId>` - Board ID（可选，如不指定将自动查找项目的第一个 Board）
- `-s, --sprint <sprintId>` - Sprint ID（可选，如不指定将使用当前活动的 Sprint）

### `jira issue remove-from-current-sprint <issueKey>`

将任务从当前 Sprint 中移出。

参数：
- `<issueKey>` - 任务 Key（必需），例如：PROJECT-123

### `jira issue set-parent <issueKey>`

将任务设置为另一个任务的子任务。

参数：
- `<issueKey>` - 任务 Key（必需），例如：PROJECT-124

选项：
- `-p, --parent <parent>` - 父任务 Key（必需）
- `--auto-convert` - 自动转换（会创建新子任务并删除原任务）

⚠️ **重要**：由于 Jira API 限制，需要使用 `--auto-convert` 参数。此操作会创建新的子任务并删除原任务，任务 Key 会改变，但所有内容（标题、描述、评论等）会完整保留。

### `jira issue remove-parent <issueKey>`

将子任务变成独立任务（移除父任务关联）。

参数：
- `<issueKey>` - 任务 Key（必需），例如：PROJECT-124

选项：
- `--auto-convert` - 自动转换（会创建新任务并删除原子任务）

⚠️ **重要**：由于 Jira API 限制，需要使用 `--auto-convert` 参数。此操作会创建新的独立任务并删除原子任务，任务 Key 会改变，但所有内容（标题、描述、评论等）会完整保留。

### `jira issue add-flag <issueKey>`

给任务添加标识（flag），标记为需要特别关注或被阻塞。

参数：
- `<issueKey>` - 任务 Key（必需），例如：PROJECT-123

选项：
- `-m, --message <message>` - 说明原因（可选）

💡 **实现说明**：
- 通过添加 `FLAGGED` 标签来标记任务，这是最通用和兼容的方式
- 添加标识后，任务的标签列表中会显示 `FLAGGED`
- 如果提供了原因，会自动添加一条带 🚩 图标的评论
- 便于团队在任务列表或看板上快速识别需要关注的任务

### `jira issue remove-flag <issueKey>`

移除任务的标识（flag）。

参数：
- `<issueKey>` - 任务 Key（必需），例如：PROJECT-123

### `jira projects`

列出所有可用的项目。

### `jira assignees`

列出可分配的用户。

选项：
- `-p, --project <project>` - 项目 Key（可选，与 `-i` 二选一）
- `-i, --issue <issue>` - 任务 Key（可选，与 `-p` 二选一）
- `-m, --max-results <number>` - 最大结果数（可选，默认：50）

注意：必须指定项目 Key 或任务 Key 其中之一。

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
