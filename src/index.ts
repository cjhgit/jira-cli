import { JiraClient } from './jira-client';
import { JiraConfig } from './types';

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];

  const options: Record<string, string | boolean> = {};
  const positionalArgs: string[] = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      options[key] = value !== undefined ? value : true;
    } else if (arg.startsWith('-')) {
      const key = arg.substring(1);
      options[key] = true;
    } else {
      positionalArgs.push(arg);
    }
  }

  return { command, options, positionalArgs };
}

// 显示帮助信息
function showHelp() {
  console.log(`
Jira 任务管理工具

使用方式:
  npm run query <command> [options]

命令:
  create       创建新任务
  get          获取任务详情
  search       搜索任务

示例:
  # 创建任务
  npm run query create -- --project=PROJECT --summary="任务标题" --description="任务描述"
  npm run query create -- --project=PROJECT --summary="紧急任务" --priority=High --assignee=username

  # 获取任务详情
  npm run query get PROJECT-123

  # 搜索任务
  npm run query search -- --jql="project = PROJECT AND status = 待办"

环境变量:
  JIRA_ACCOUNT   Jira 账号
  JIRA_PASSWORD  Jira 密码
  JIRA_BASE_URL  Jira 服务器地址
`);
}

async function main() {
  // 从环境变量读取配置
  const account = process.env.JIRA_ACCOUNT;
  const password = process.env.JIRA_PASSWORD;
  const baseUrl = process.env.JIRA_BASE_URL;

  // 验证必需的环境变量
  if (!account || !password || !baseUrl) {
    console.error('错误: 缺少必需的环境变量');
    console.error('请设置以下环境变量:');
    console.error('  JIRA_ACCOUNT - Jira 账号');
    console.error('  JIRA_PASSWORD - Jira 密码');
    console.error('  JIRA_BASE_URL - Jira 服务器地址');
    process.exit(1);
  }

  const config: JiraConfig = {
    accountInfo: {
      account,
      password,
    },
    serviceInfo: {
      baseUrl,
    },
  };

  // 解析命令行参数
  const { command, options, positionalArgs } = parseArgs();

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  const jiraClient = new JiraClient(config);

  try {
    switch (command) {
      case 'create':
        if (!options.project || !options.summary) {
          console.error('错误：create 命令需要 --project 和 --summary 参数');
          console.error('示例: npm run query create -- --project=PROJECT --summary="任务标题"');
          process.exit(1);
        }
        
        console.log('正在创建任务...');
        const result = await jiraClient.createIssue(
          options.project as string,
          options.summary as string,
          (options.description as string) || '',
          {
            issueType: options.issueType as string,
            priority: options.priority as string,
            assignee: options.assignee as string,
            labels: options.labels as string,
          }
        );

        console.log('✅ 任务创建成功！');
        console.log(`   Key: ${result.key}`);
        console.log(`   ID: ${result.id}`);
        console.log(`   链接: ${baseUrl}/browse/${result.key}`);
        break;

      case 'get':
        if (positionalArgs.length === 0) {
          console.error('错误：get 命令需要指定任务 Key');
          console.error('示例: npm run query get PROJECT-123');
          process.exit(1);
        }

        const issueKey = positionalArgs[0];
        console.log(`正在查询任务: ${issueKey}...`);
        const issue = await jiraClient.getIssue(issueKey);
        console.log(jiraClient.formatIssue(issue));
        break;

      case 'search':
        if (!options.jql) {
          console.error('错误：search 命令需要 --jql 参数');
          console.error('示例: npm run query search -- --jql="project = PROJECT"');
          process.exit(1);
        }

        console.log(`正在搜索: ${options.jql}`);
        const issues = await jiraClient.searchIssues(options.jql as string);
        
        console.log(`\n找到 ${issues.length} 个任务:\n`);
        issues.forEach(issue => {
          console.log(jiraClient.formatIssue(issue));
        });
        break;

      default:
        // 如果第一个参数看起来像任务 Key（包含连字符），尝试作为 get 命令处理
        if (command.includes('-')) {
          console.log(`正在查询任务: ${command}...`);
          const issue = await jiraClient.getIssue(command);
          console.log(jiraClient.formatIssue(issue));
        } else {
          console.error(`未知命令: ${command}`);
          console.error('使用 --help 查看帮助信息');
          process.exit(1);
        }
    }
  } catch (error: any) {
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }
}

main();
