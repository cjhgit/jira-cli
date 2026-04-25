#!/usr/bin/env node

import { Command } from 'commander';
import { JiraClient } from './jira-client';
import { JiraConfig } from './types';

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

const program = new Command();

program
  .name('jira')
  .description('Jira 任务管理命令行工具')
  .version('1.0.0');

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
      
      console.log(`正在查询任务: ${issueKey}...`);
      const issue = await jiraClient.getIssue(issueKey);
      console.log(jiraClient.formatIssue(issue));
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

program.parse();
