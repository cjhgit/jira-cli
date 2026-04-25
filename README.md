# Jira CLI

Jira 命令行工具，用于查询和管理 Jira 任务。

## 功能特点

- 创建 Jira 任务
- 查询任务详情
- 搜索任务（支持 JQL）
- 支持 TypeScript
- 命令行友好

## 安装

```bash
npm install
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

### 创建任务

```bash
# 创建基本任务
npm run create -- --project=PROJECT --summary="任务标题" --description="任务描述"

# 创建带优先级的任务
npm run create -- --project=PROJECT --summary="紧急任务" --priority=High

# 创建并指派任务
npm run create -- --project=PROJECT --summary="新功能" --assignee=username

# 创建带标签的任务
npm run create -- --project=PROJECT --summary="新任务" --labels="frontend,urgent"

# 创建指定类型的任务
npm run create -- --project=PROJECT --summary="Bug修复" --issueType=Bug
```

### 查询单个任务

```bash
# 使用 get 命令
npm run get PROJECT-123

# 或直接使用 query
npm run query PROJECT-123

# 或直接使用 ts-node
npx ts-node src/index.ts PROJECT-123
```

### 搜索任务（JQL）

```bash
npm run search -- --jql="project = PROJECT AND status = 待办"
npm run search -- --jql="project = PROJECT AND assignee = currentUser()"
```

### 编译为 JavaScript

```bash
npm run build
npm start get PROJECT-123
npm start create -- --project=PROJECT --summary="新任务"
```

## 示例

### 创建任务

```bash
npm run create -- --project=PROJECT --summary="实现用户登录功能" --description="需要实现用户名密码登录" --priority=High --assignee=username
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
npm run query PROJECT-123
```

输出示例：
```
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
npm run search -- --jql="project = PROJECT AND status = 待办"
```

## 开发

项目结构：
- `src/index.ts` - 主入口文件
- `src/jira-client.ts` - Jira API 客户端
- `src/types.ts` - TypeScript 类型定义
