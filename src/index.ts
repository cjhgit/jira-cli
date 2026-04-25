#!/usr/bin/env node

import { Command } from 'commander';
import { JiraClient } from './jira-client';
import { JiraConfig } from './types';
import * as readline from 'readline';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

function getVersion(): string {
  try {
    const packageJsonPath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return '1.0.0'; // fallback version
  }
}

interface ConfigFile {
  account?: string;
  password?: string;
  baseUrl?: string;
}

function getConfigDir(): string {
  return join(homedir(), '.jira-easy-cli');
}

function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

function readConfigFile(): ConfigFile {
  try {
    const configPath = getConfigPath();
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    // 配置文件不存在或读取失败，返回空对象
  }
  return {};
}

function writeConfigFile(config: ConfigFile): void {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

function getJiraConfig(): JiraConfig {
  // 优先从环境变量读取
  let account = process.env.JIRA_ACCOUNT;
  let password = process.env.JIRA_PASSWORD;
  let baseUrl = process.env.JIRA_BASE_URL;

  // 如果环境变量不存在，从配置文件读取
  if (!account || !password || !baseUrl) {
    const config = readConfigFile();
    account = account || config.account;
    password = password || config.password;
    baseUrl = baseUrl || config.baseUrl;
  }

  if (!account || !password || !baseUrl) {
    console.error('错误: 缺少必需的配置');
    console.error('请使用以下任一方式配置:');
    console.error('\n1. 通过命令设置配置:');
    console.error('  jira config set account <your-account>');
    console.error('  jira config set password <your-password>');
    console.error('  jira config set baseUrl <your-jira-url>');
    console.error('\n2. 或设置环境变量:');
    console.error('  export JIRA_ACCOUNT=<your-account>');
    console.error('  export JIRA_PASSWORD=<your-password>');
    console.error('  export JIRA_BASE_URL=<your-jira-url>');
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
  .option('--parent <parent>', '父任务 Key（用于创建子任务）')
  .option('--no-sprint', '不自动添加到当前活动的 Sprint')
  .action(async (options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);
      
      const isSubtask = !!options.parent;
      console.log(isSubtask ? '正在创建子任务...' : '正在创建任务...');
      
      const result = await jiraClient.createIssue(
        options.project,
        options.summary,
        options.description,
        {
          issueType: options.issueType,
          priority: options.priority,
          assignee: options.assignee,
          labels: options.labels,
          parent: options.parent,
        }
      );

      console.log(isSubtask ? '✅ 子任务创建成功！' : '✅ 任务创建成功！');
      console.log(`   Key: ${result.key}`);
      console.log(`   ID: ${result.id}`);
      if (isSubtask) {
        console.log(`   父任务: ${options.parent}`);
      }
      console.log(`   链接: ${config.serviceInfo.baseUrl}/browse/${result.key}`);

      // 自动添加到当前活动的 Sprint（除非指定了 --no-sprint）
      // commander.js 将 --no-sprint 转换为 options.sprint = false
      if (options.sprint !== false && !isSubtask) {
        try {
          console.log('\n正在查找当前活动的 Sprint...');
          
          // 查找项目的 Board
          const boards = await jiraClient.getBoardsForProject(options.project);
          
          if (boards.length === 0) {
            console.log('💡 提示: 项目没有 Board，任务保留在 Backlog');
            return;
          }

          const boardId = boards[0].id;
          
          // 查找活动的 Sprint
          const sprints = await jiraClient.getActiveSprints(boardId);
          
          if (sprints.length === 0) {
            console.log('💡 提示: 没有活动的 Sprint，任务保留在 Backlog');
            return;
          }

          const sprintId = sprints[0].id;
          const sprintName = sprints[0].name;
          
          // 添加到 Sprint
          await jiraClient.addIssueToSprint(result.key, sprintId);
          console.log(`✅ 已自动添加到 Sprint: ${sprintName}`);
          console.log(`💡 提示: 使用 --no-sprint 参数可以跳过自动添加到 Sprint`);
        } catch (sprintError: any) {
          // 如果添加到 Sprint 失败，只是显示提示，不影响任务创建
          console.log(`💡 提示: 无法自动添加到 Sprint，任务保留在 Backlog`);
        }
      }
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
  .option('--parent <parent>', '查看指定任务的子任务')
  .option('--current-sprint', '只显示当前活动 Sprint 中的任务', false)
  .option('--all', '显示所有任务（包括已完成）', false)
  .option('-l, --limit <limit>', '最大结果数', '50')
  .action(async (options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);
      
      let filterDesc = `项目 ${options.project}`;
      if (options.parent) {
        filterDesc = `任务 ${options.parent} 的子任务`;
      } else if (options.currentSprint) {
        filterDesc = `项目 ${options.project} 当前 Sprint 中`;
      }
      console.log(`正在查询${filterDesc}的任务...`);
      
      const issues = await jiraClient.listIssues(options.project, {
        status: options.status,
        assignee: options.assignee,
        reporter: options.reporter,
        parent: options.parent,
        currentSprint: options.currentSprint,
        all: options.all,
        limit: parseInt(options.limit),
      });
      
      if (issues.length === 0) {
        console.log('📋 没有找到匹配的任务');
        return;
      }

      console.log(`\n📋 找到 ${issues.length} 个任务\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('序号  Key          状态            优先级        摘要');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      issues.forEach((issue, index) => {
        const no = String(index + 1).padEnd(5);
        const key = issue.key.padEnd(12);
        const status = (issue.fields.status?.name || 'N/A').padEnd(14);
        const priority = (issue.fields.priority?.name || 'N/A').padEnd(12);
        const summary = truncate(issue.fields.summary || '', 40);
        console.log(`${no} ${key} ${status} ${priority} ${summary}`);
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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

issueCommand
  .command('add-to-current-sprint <issueKey>')
  .description('将任务添加到当前活动的 sprint')
  .option('-b, --board <boardId>', 'Board ID（可选，如不指定将自动查找）')
  .option('-s, --sprint <sprintId>', 'Sprint ID（可选，如不指定将使用当前活动的 sprint）')
  .action(async (issueKey: string, options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);

      console.log(`正在获取任务 ${issueKey} 的信息...`);
      const issue = await jiraClient.getIssue(issueKey);
      const projectKey = issue.fields.project.key;

      let sprintId: number;

      if (options.sprint) {
        sprintId = parseInt(options.sprint);
      } else {
        // 如果没有指定 sprint，需要找到当前活动的 sprint
        let boardId: number;

        if (options.board) {
          boardId = parseInt(options.board);
        } else {
          // 如果没有指定 board，查找项目的第一个 board
          console.log(`正在查找项目 ${projectKey} 的 Board...`);
          const boards = await jiraClient.getBoardsForProject(projectKey);
          
          if (boards.length === 0) {
            throw new Error(`项目 ${projectKey} 没有找到 Board，请先创建 Scrum Board`);
          }

          boardId = boards[0].id;
          console.log(`找到 Board: ${boards[0].name} (ID: ${boardId})`);
        }

        // 查找活动的 sprint
        console.log(`正在查找活动的 Sprint...`);
        const sprints = await jiraClient.getActiveSprints(boardId);

        if (sprints.length === 0) {
          throw new Error(`Board ${boardId} 没有活动的 Sprint，请先创建并启动一个 Sprint`);
        }

        sprintId = sprints[0].id;
        console.log(`找到活动的 Sprint: ${sprints[0].name} (ID: ${sprintId})`);
      }

      console.log(`正在将任务 ${issueKey} 添加到 Sprint ${sprintId}...`);
      await jiraClient.addIssueToSprint(issueKey, sprintId);
      console.log(`✅ 任务 ${issueKey} 已成功添加到 Sprint`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('remove-from-current-sprint <issueKey>')
  .description('将任务从当前 sprint 中移出')
  .action(async (issueKey: string) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);

      console.log(`正在将任务 ${issueKey} 从 Sprint 中移出...`);
      await jiraClient.removeIssueFromSprint(issueKey);
      console.log(`✅ 任务 ${issueKey} 已从 Sprint 中移出`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('set-parent <issueKey>')
  .description('将任务设置为另一个任务的子任务')
  .requiredOption('-p, --parent <parent>', '父任务 Key')
  .option('--auto-convert', '自动转换（创建新子任务并删除原任务）', false)
  .action(async (issueKey: string, options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);

      console.log(`正在将任务 ${issueKey} 设置为 ${options.parent} 的子任务...`);
      const result = await jiraClient.setParent(issueKey, options.parent, { autoConvert: options.autoConvert });
      
      if (result.newKey) {
        console.log(`\n✅ 任务已成功转换为子任务`);
        console.log(`\n重要提示:`);
        console.log(`  原任务: ${issueKey} (已删除)`);
        console.log(`  新子任务: ${result.newKey}`);
        console.log(`  新子任务链接: ${config.serviceInfo.baseUrl}/browse/${result.newKey}`);
        console.log(`  父任务: ${options.parent}`);
        console.log(`\n所有内容（标题、描述、评论等）已复制到新子任务`);
        console.log(`\n💡 提示: 使用 jira issue view ${result.newKey} 查看新子任务信息`);
      } else {
        console.log(`✅ 任务 ${issueKey} 已成功设置为 ${options.parent} 的子任务`);
        
        const issue = await jiraClient.getIssue(issueKey);
        console.log(`\n任务信息:`);
        console.log(`  Key: ${issue.key}`);
        console.log(`  标题: ${issue.fields.summary}`);
        console.log(`  父任务: ${issue.fields.parent?.key} - ${issue.fields.parent?.fields.summary}`);
        console.log(`\n💡 提示: 使用 jira issue view ${issueKey} 查看完整任务信息`);
      }
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('remove-parent <issueKey>')
  .description('将子任务变成独立任务（移除父任务关联）')
  .option('--auto-convert', '自动转换（创建新任务并删除原子任务）', false)
  .action(async (issueKey: string, options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);

      console.log(`正在将子任务 ${issueKey} 变成独立任务...`);
      const result = await jiraClient.removeParent(issueKey, { autoConvert: options.autoConvert });
      
      if (result.newKey) {
        console.log(`\n✅ 子任务已成功转换为独立任务`);
        console.log(`\n重要提示:`);
        console.log(`  原子任务: ${issueKey} (已删除)`);
        console.log(`  新任务: ${result.newKey}`);
        console.log(`  新任务链接: ${config.serviceInfo.baseUrl}/browse/${result.newKey}`);
        console.log(`\n所有内容（标题、描述、评论等）已复制到新任务`);
        console.log(`\n💡 提示: 使用 jira issue view ${result.newKey} 查看新任务信息`);
      } else {
        console.log(`✅ 任务 ${issueKey} 已成功变成独立任务`);
        
        const issue = await jiraClient.getIssue(issueKey);
        console.log(`\n任务信息:`);
        console.log(`  Key: ${issue.key}`);
        console.log(`  标题: ${issue.fields.summary}`);
        console.log(`  类型: ${issue.fields.issuetype.name}`);
        console.log(`\n💡 提示: 使用 jira issue view ${issueKey} 查看完整任务信息`);
      }
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('add-flag <issueKey>')
  .description('给任务添加标识（flag），标记为需要特别关注')
  .option('-m, --message <message>', '说明原因（可选）')
  .action(async (issueKey: string, options) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);

      console.log(`正在给任务 ${issueKey} 添加标识...`);
      await jiraClient.addFlag(issueKey, options.message);
      console.log(`✅ 任务 ${issueKey} 已添加标识 🚩`);
      if (options.message) {
        console.log(`   原因: ${options.message}`);
      }
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

issueCommand
  .command('remove-flag <issueKey>')
  .description('移除任务的标识（flag）')
  .action(async (issueKey: string) => {
    try {
      const config = getJiraConfig();
      const jiraClient = new JiraClient(config);

      console.log(`正在移除任务 ${issueKey} 的标识...`);
      await jiraClient.removeFlag(issueKey);
      console.log(`✅ 任务 ${issueKey} 的标识已移除`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

const configCommand = program
  .command('config')
  .description('管理配置');

configCommand
  .command('set <key> <value>')
  .description('设置配置项（account, password, baseUrl）')
  .action((key: string, value: string) => {
    try {
      const validKeys = ['account', 'password', 'baseUrl'];
      if (!validKeys.includes(key)) {
        console.error(`错误: 无效的配置项 "${key}"`);
        console.error(`有效的配置项: ${validKeys.join(', ')}`);
        process.exit(1);
      }

      const config = readConfigFile();
      config[key as keyof ConfigFile] = value;
      writeConfigFile(config);

      console.log(`✅ 配置已保存`);
      console.log(`   ${key} = ${key === 'password' ? '******' : value}`);
      console.log(`   配置文件: ${getConfigPath()}`);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

configCommand
  .command('get [key]')
  .description('查看配置（不指定 key 则显示所有配置）')
  .action((key?: string) => {
    try {
      const config = readConfigFile();
      
      if (key) {
        const validKeys = ['account', 'password', 'baseUrl'];
        if (!validKeys.includes(key)) {
          console.error(`错误: 无效的配置项 "${key}"`);
          console.error(`有效的配置项: ${validKeys.join(', ')}`);
          process.exit(1);
        }

        const value = config[key as keyof ConfigFile];
        if (value) {
          console.log(`${key} = ${key === 'password' ? '******' : value}`);
        } else {
          console.log(`${key} 未设置`);
        }
      } else {
        console.log('当前配置:');
        console.log(`  配置文件: ${getConfigPath()}`);
        console.log('');
        console.log(`  account = ${config.account || '未设置'}`);
        console.log(`  password = ${config.password ? '******' : '未设置'}`);
        console.log(`  baseUrl = ${config.baseUrl || '未设置'}`);
        
        // 显示环境变量覆盖情况
        const hasEnvOverride = process.env.JIRA_ACCOUNT || process.env.JIRA_PASSWORD || process.env.JIRA_BASE_URL;
        if (hasEnvOverride) {
          console.log('\n💡 提示: 检测到环境变量，将优先使用环境变量的值');
        }
      }
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
