#!/usr/bin/env node

import { Command } from 'commander';
import { JiraClient } from './jira-client';
import { JiraConfig } from './types';
import * as readline from 'readline';
import { readFileSync } from 'fs';
import { join } from 'path';

function getVersion(): string {
  try {
    const packageJsonPath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return '1.0.0'; // fallback version
  }
}

function getJiraConfig(): JiraConfig {
  const account = process.env.JIRA_ACCOUNT;
  const password = process.env.JIRA_PASSWORD;
  const baseUrl = process.env.JIRA_BASE_URL;

  if (!account || !password || !baseUrl) {
    console.error('错误: 缺少必需的环境变量');
    console.error('请设置以下环境变量:');
    console.error('  JIRA_ACCOUNT - Jira 账号');
    console.error('  JIRA_PASSWORD - Jira 密码');
    console.error('  JIRA_BASE_URL - Jira 服务器地址');
    process.exit(1);
  }

  return {
    accountInfo: { account, password },
    serviceInfo: { baseUrl },
  };
}

function waitForConfirmation(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(message, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
    });
  });
}

const program = new Command();

program
  .name('jira')
  .description('Jira 任务管理命令行工具')
  .version(getVersion());

const issueCommand = program
  .command('issue')
  .description('管理 Jira 任务');

issueCommand
  .command('view <issueKey>')
  .description('查看任务详情')
  .action(async (issueKey: string) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);
      
      const issue = await jiraClient.getIssue(issueKey);
      const comments = await jiraClient.getComments(issueKey);
      console.log(jiraClient.formatIssue(issue, comments));
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('create')
  .description('创建新任务')
  .requiredOption('-p, --project <project>', '项目 Key')
  .requiredOption('-s, --summary <summary>', '任务标题')
  .option('-d, --description <description>', '任务描述', '')
  .option('-t, --issue-type <type>', '任务类型', 'Task')
  .option('--priority <priority>', '优先级')
  .option('-a, --assignee <assignee>', '指派人')
  .option('-l, --labels <labels>', '标签（逗号分隔）')
  .action(async (options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);
      
      console.log('正在创建任务...');
      const result = await jiraClient.createIssue(
        options.project,
        options.summary,
        options.description,
        {
          issueType: options.issueType,
          priority: options.priority,
          assignee: options.assignee,
          labels: options.labels,
        }
      );

      console.log('✅ 任务创建成功！');
      console.log(`   Key: ${result.key}`);
      console.log(`   ID: ${result.id}`);
      console.log(`   链接: ${config.serviceInfo.baseUrl}/browse/${result.key}`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('search')
  .description('搜索任务')
  .requiredOption('-j, --jql <jql>', 'JQL 查询语句')
  .option('-m, --max-results <number>', '最大结果数', '50')
  .action(async (options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);
      
      console.log(`正在搜索: ${options.jql}`);
      const issues = await jiraClient.searchIssues(
        options.jql,
        parseInt(options.maxResults)
      );
      
      console.log(`\n找到 ${issues.length} 个任务:\n`);
      issues.forEach(issue => {
        console.log(jiraClient.formatIssue(issue));
      });
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('list')
  .description('列出项目中的任务')
  .requiredOption('-p, --project <project>', '项目 Key')
  .option('-s, --status <status>', '按状态筛选')
  .option('-a, --assignee <assignee>', '按指派人筛选')
  .option('-r, --reporter <reporter>', '按报告人筛选')
  .option('--all', '显示所有任务（包括已完成）', false)
  .option('-l, --limit <limit>', '最大结果数', '50')
  .action(async (options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);
      
      console.log(`正在查询项目 ${options.project} 的任务...`);
      const issues = await jiraClient.listIssues(options.project, {
        status: options.status,
        assignee: options.assignee,
        reporter: options.reporter,
        all: options.all,
        limit: parseInt(options.limit),
      });
      
      if (issues.length === 0) {
        console.log('📋 没有找到匹配的任务');
        return;
      }

      console.log(`\n📋 找到 ${issues.length} 个任务\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Key          状态            优先级        摘要');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      issues.forEach(issue => {
        const key = issue.key.padEnd(12);
        const status = (issue.fields.status?.name || 'N/A').padEnd(14);
        const priority = (issue.fields.priority?.name || 'N/A').padEnd(12);
        const summary = truncate(issue.fields.summary || '', 40);
        console.log(`${key} ${status} ${priority} ${summary}`);
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('update-status <issueKey>')
  .description('更新任务状态')
  .requiredOption('-s, --status <status>', '目标状态')
  .action(async (issueKey: string, options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);
      
      console.log(`正在更新任务 ${issueKey} 的状态...`);
      await jiraClient.updateStatus(issueKey, options.status);
      console.log(`✅ 任务 ${issueKey} 状态已更新为: ${options.status}`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('add-comment <issueKey>')
  .description('添加评论到任务')
  .requiredOption('-c, --comment <comment>', '评论内容')
  .action(async (issueKey: string, options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);
      
      console.log(`正在添加评论到 ${issueKey}...`);
      const comment = await jiraClient.addComment(issueKey, options.comment);
      console.log(`✅ 评论已添加到 ${issueKey}`);
      console.log(`   评论ID: ${comment.id}`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('assign <issueKey>')
  .description('指派任务给用户')
  .requiredOption('-a, --assignee <assignee>', '指派人用户名')
  .action(async (issueKey: string, options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);

      console.log(`正在指派任务 ${issueKey}...`);
      await jiraClient.assignIssue(issueKey, options.assignee);
      console.log(`✅ 任务 ${issueKey} 已指派给: ${options.assignee}`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('edit <issueKey>')
  .description('修改任务（标题、描述、优先级、标签、任务类型）')
  .option('-s, --summary <summary>', '任务标题')
  .option('-d, --description <description>', '任务描述')
  .option('-p, --priority <priority>', '优先级')
  .option('-l, --labels <labels>', '标签（逗号分隔）')
  .option('-t, --issue-type <type>', '任务类型')
  .action(async (issueKey: string, options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);

      const fields: Record<string, any> = {};

      if (options.summary) fields.summary = options.summary;
      if (options.description) fields.description = options.description;
      if (options.priority) fields.priority = { name: options.priority };
      if (options.labels) fields.labels = options.labels.split(',').map((l: string) => l.trim());
      if (options.issueType) fields.issuetype = { name: options.issueType };

      if (Object.keys(fields).length === 0) {
        console.error('错误: 请至少指定一个要修改的字段');
        process.exit(1);
      }

      await jiraClient.updateIssue(issueKey, fields);

      const updated: string[] = [];
      if (options.summary) updated.push(`标题: ${options.summary}`);
      if (options.description) updated.push(`描述: ${options.description}`);
      if (options.priority) updated.push(`优先级: ${options.priority}`);
      if (options.labels) updated.push(`标签: ${options.labels}`);
      if (options.issueType) updated.push(`任务类型: ${options.issueType}`);

      console.log(`✅ 任务 ${issueKey} 已更新:`);
      updated.forEach(item => console.log(`   ${item}`));
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('edit-comment <issueKey>')
  .description('修改任务评论')
  .requiredOption('-c, --comment-id <commentId>', '评论 ID')
  .requiredOption('-t, --text <text>', '新的评论内容')
  .action(async (issueKey: string, options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);

      console.log(`正在修改任务 ${issueKey} 的评论 ${options.commentId}...`);
      const comment = await jiraClient.updateComment(issueKey, options.commentId, options.text);
      console.log(`✅ 评论已修改`);
      console.log(`   评论ID: ${comment.id}`);
      console.log(`   新内容: ${options.text}`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('delete-comment <issueKey>')
  .description('删除任务评论')
  .requiredOption('-c, --comment-id <commentId>', '评论 ID')
  .option('-y, --yes', '跳过确认，直接删除', false)
  .action(async (issueKey: string, options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);

      if (!options.yes) {
        const confirmed = await waitForConfirmation(`确认删除任务 ${issueKey} 的评论 ${options.commentId}？(按回车确认，Ctrl+C 取消): `);
        if (!confirmed) {
          console.log('已取消删除');
          return;
        }
      }

      await jiraClient.deleteComment(issueKey, options.commentId);
      console.log(`✅ 评论 ${options.commentId} 已删除`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('update-description <issueKey>')
  .description('修改任务描述')
  .requiredOption('-d, --description <description>', '新的描述内容')
  .action(async (issueKey: string, options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);

      console.log(`正在修改任务 ${issueKey} 的描述...`);
      await jiraClient.updateDescription(issueKey, options.description);
      console.log(`✅ 任务 ${issueKey} 的描述已更新`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('delete <issueKey>')
  .description('删除任务')
  .option('-y, --yes', '跳过确认，直接删除', false)
  .action(async (issueKey: string, options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);
      
      console.log(`正在获取任务 ${issueKey} 的信息...`);
      const issue = await jiraClient.getIssue(issueKey);
      console.log(`\n即将删除任务:`);
      console.log(`  Key: ${issue.key}`);
      console.log(`  标题: ${issue.fields.summary}`);
      console.log(`  状态: ${issue.fields.status.name}`);
      console.log(`\n⚠️  警告: 删除任务是不可逆的操作！`);
      
      // 如果使用了 -y 参数，直接删除
      if (!options.yes) {
        const confirmed = await waitForConfirmation('\n确认删除？(按回车确认，Ctrl+C 取消): ');
        if (!confirmed) {
          console.log('已取消删除');
          return;
        }
      }
      
      console.log(`\n正在删除任务 ${issueKey}...`);
      await jiraClient.deleteIssue(issueKey);
      console.log(`✅ 任务 ${issueKey} 已成功删除`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('projects')
  .description('列出所有项目')
  .action(async () => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);
      
      console.log('正在获取项目列表...');
      const projects = await jiraClient.listProjects();
      
      console.log('\n📁 可用的项目列表:\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Key          名称');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      projects.forEach(project => {
        const key = project.key.padEnd(12);
        console.log(`${key} ${project.name}`);
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('assignees')
  .description('列出可分配的用户')
  .option('-p, --project <project>', '项目 Key')
  .option('-i, --issue <issue>', '任务 Key')
  .option('-m, --max-results <number>', '最大结果数', '50')
  .action(async (options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);

      if (!options.project && !options.issue) {
        console.error('错误: 必须指定项目 Key (-p) 或任务 Key (-i)');
        process.exit(1);
      }

      const context = options.project 
        ? `项目 ${options.project}` 
        : `任务 ${options.issue}`;
      
      console.log(`正在获取 ${context} 的可分配用户列表...`);
      const users = await jiraClient.listAssignableUsers(
        options.project,
        options.issue,
        parseInt(options.maxResults)
      );

      if (users.length === 0) {
        console.log('👥 没有找到可分配的用户');
        return;
      }

      console.log(`\n👥 找到 ${users.length} 个可分配的用户\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('用户名                显示名称                      邮箱');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      users.forEach(user => {
        const username = user.name.padEnd(20);
        const displayName = truncate(user.displayName, 28).padEnd(28);
        const email = user.emailAddress || 'N/A';
        const status = user.active ? '' : ' (已禁用)';
        console.log(`${username} ${displayName} ${email}${status}`);
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`\n💡 提示: 使用用户名（第一列）来分配任务，例如: jira issue assign PROJECT-123 -a ${users[0].name}`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

function truncate(str: string, maxLength: number): string {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
}

program.parse();
