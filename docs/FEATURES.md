# 功能清单

## 已实现功能 ✅

### 1. 查看项目列表 (projects)
```bash
jira projects
```
- 列出所有可用的 Jira 项目
- 显示项目 Key 和名称

### 2. 列出任务 (issue list)
```bash
jira issue list -p PROJECT
```
- 列出指定项目的任务
- 支持按状态筛选 (`-s, --status`)
- 支持按指派人筛选 (`-a, --assignee`)
- 支持按报告人筛选 (`-r, --reporter`)
- 支持显示所有任务包括已完成 (`--all`)
- 支持限制结果数 (`-l, --limit`)
- 默认只显示未完成的任务

### 3. 查看任务详情 (issue view)
```bash
jira issue view PROJECT-123
```
- 查看指定任务的详细信息
- 显示任务类型、状态、优先级
- 显示创建人、负责人、项目信息
- 显示任务描述和时间信息
- 显示任务链接

### 4. 创建任务 (issue create)
```bash
jira issue create -p PROJECT -s "标题" -d "描述"
```
- 创建新的 Jira 任务
- 支持设置任务类型 (`-t, --issue-type`)
- 支持设置优先级 (`--priority`)
- 支持指派人 (`-a, --assignee`)
- 支持添加标签 (`-l, --labels`)
- 返回创建的任务 Key 和链接

### 5. 更新任务状态 (issue update-status)
```bash
jira issue update-status PROJECT-123 -s "In Progress"
```
- 更新任务状态
- 自动查找可用的状态转换
- 如果状态不可用，显示所有可用的转换选项
- 支持状态名称和转换名称

### 6. 添加评论 (issue add-comment)
```bash
jira issue add-comment PROJECT-123 -c "评论内容"
```
- 为任务添加评论
- 返回评论 ID

### 7. 指派任务 (issue assign)
```bash
jira issue assign PROJECT-123 -a username
```
- 将任务指派给指定用户
- 使用用户名（username）进行指派

### 8. 搜索任务 (issue search)
```bash
jira issue search -j "project = PROJECT AND status = 待办"
```
- 使用 JQL 语句搜索任务
- 支持复杂的查询条件
- 支持限制结果数 (`-m, --max-results`)

## 参考实现来源

功能实现参考了 `.tmp/jira-task/index.js` 文件，该文件包含了完整的 Node.js 原生实现。

## 技术实现

### API 端点使用

- `GET /rest/api/2/project` - 获取项目列表
- `GET /rest/api/2/search` - 搜索和列出任务
- `GET /rest/api/2/issue/{issueKey}` - 获取任务详情
- `POST /rest/api/2/issue` - 创建任务
- `GET /rest/api/2/issue/{issueKey}/transitions` - 获取可用的状态转换
- `POST /rest/api/2/issue/{issueKey}/transitions` - 执行状态转换
- `POST /rest/api/2/issue/{issueKey}/comment` - 添加评论
- `PUT /rest/api/2/issue/{issueKey}` - 更新任务（用于指派）

### 类型定义

新增了以下 TypeScript 类型：
- `JiraTransition` - 状态转换
- `JiraTransitionsResponse` - 转换响应
- `JiraComment` - 评论
- `JiraSearchResult` - 搜索结果
- `ListIssuesOptions` - 列表查询选项

## 使用示例

### 完整工作流示例

```bash
# 1. 查看所有项目
jira projects

# 2. 创建新任务
jira issue create -p MYPROJ -s "实现登录功能" -d "需要实现用户名密码登录" --priority High

# 3. 列出项目中的任务
jira issue list -p MYPROJ

# 4. 查看任务详情
jira issue view MYPROJ-123

# 5. 指派任务
jira issue assign MYPROJ-123 -a johndoe

# 6. 更新状态为进行中
jira issue update-status MYPROJ-123 -s "In Progress"

# 7. 添加进度评论
jira issue add-comment MYPROJ-123 -c "已完成 50%"

# 8. 更新状态为完成
jira issue update-status MYPROJ-123 -s "Done"

# 9. 查看已完成的任务
jira issue list -p MYPROJ -s "Done" --all
```

## 注意事项

1. 所有命令都需要配置环境变量：
   - `JIRA_ACCOUNT` - Jira 用户名
   - `JIRA_PASSWORD` - Jira 密码
   - `JIRA_BASE_URL` - Jira 服务器地址

2. 状态转换的可用性取决于 Jira 工作流配置

3. 用户名（username）和显示名称（displayName）是不同的，指派时使用 username

4. JQL 语法需要遵循 Jira 的 JQL 规范
