# 快速开始指南

## 安装和配置

### 1. 安装依赖
```bash
pnpm install
```

### 2. 配置环境变量
创建 `.env` 文件：
```bash
JIRA_ACCOUNT=your-username
JIRA_PASSWORD=your-password
JIRA_BASE_URL=https://your-jira-domain.com
```

### 3. 编译项目
```bash
pnpm run build
```

### 4. 全局安装（可选）
```bash
pnpm link --global
```

## 常用命令速查

### 查看项目列表
```bash
jira projects
```

### 列出任务
```bash
# 列出项目所有未完成任务
jira issue list -p PROJECT

# 按状态筛选
jira issue list -p PROJECT -s "In Progress"

# 查看我的任务
jira issue list -p PROJECT -a your-username
```

### 创建任务
```bash
# 基本创建
jira issue create -p PROJECT -s "任务标题"

# 完整创建
jira issue create -p PROJECT -s "任务标题" -d "详细描述" \
  --priority High -a username -l "bug,urgent"
```

### 查看任务
```bash
jira issue view PROJECT-123
```

### 更新任务状态
```bash
jira issue update-status PROJECT-123 -s "In Progress"
```

### 添加评论
```bash
jira issue add-comment PROJECT-123 -c "这是评论内容"
```

### 指派任务
```bash
jira issue assign PROJECT-123 -a username
```

### 搜索任务
```bash
# 搜索我创建的未完成任务
jira issue search -j "project = PROJECT AND reporter = currentUser() AND resolution = Unresolved"

# 搜索高优先级任务
jira issue search -j "project = PROJECT AND priority = High"
```

## 完整工作流示例

```bash
# 1. 查看所有项目
jira projects

# 2. 列出项目任务
jira issue list -p MYPROJ

# 3. 创建新任务
jira issue create -p MYPROJ -s "实现用户登录" --priority High

# 假设创建的任务是 MYPROJ-123

# 4. 指派给自己
jira issue assign MYPROJ-123 -a myusername

# 5. 开始工作
jira issue update-status MYPROJ-123 -s "In Progress"

# 6. 添加进度评论
jira issue add-comment MYPROJ-123 -c "已完成基本登录界面"

# 7. 查看任务详情
jira issue view MYPROJ-123

# 8. 完成任务
jira issue update-status MYPROJ-123 -s "Done"
```

## 常见 JQL 查询

```bash
# 我的未完成任务
jira issue search -j "assignee = currentUser() AND resolution = Unresolved"

# 今天更新的任务
jira issue search -j "updated >= startOfDay()"

# 高优先级 Bug
jira issue search -j "type = Bug AND priority = High"

# 特定项目的进行中任务
jira issue search -j "project = MYPROJ AND status = 'In Progress'"

# 最近一周创建的任务
jira issue search -j "created >= -1w"
```

## 本地开发

如果还没有全局安装，可以使用 `pnpm run dev` 命令：

```bash
# 替代 jira 命令
pnpm run dev projects
pnpm run dev issue list -p PROJECT
pnpm run dev issue view PROJECT-123
```

## 故障排查

### 1. 认证失败
- 检查 `.env` 文件中的用户名和密码是否正确
- 确保 JIRA_BASE_URL 格式正确（不要以 / 结尾）

### 2. 找不到项目
- 使用 `jira projects` 查看所有可用项目
- 确保使用的是项目 Key（大写），不是项目名称

### 3. 状态转换失败
- 使用 `jira issue view PROJECT-123` 查看当前状态
- 状态转换取决于 Jira 工作流配置
- 错误信息会显示所有可用的状态转换

### 4. 指派失败
- 确保使用的是用户名（username），不是显示名称
- 用户必须有权限访问该项目

## 获取帮助

```bash
# 查看主命令帮助
jira --help

# 查看子命令帮助
jira issue --help

# 查看具体命令帮助
jira issue create --help
jira issue list --help
```

## 更多信息

- 查看 [README.md](README.md) 了解完整文档
- 查看 [FEATURES.md](FEATURES.md) 了解所有功能
- 查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新
