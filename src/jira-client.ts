import axios, { AxiosInstance } from 'axios';
import { JiraConfig, JiraIssue, CreateIssueOptions, CreateIssueResponse } from './types';

export class JiraClient {
  private client: AxiosInstance;
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;
    const { baseUrl } = config.serviceInfo;
    const { account, password } = config.accountInfo;

    this.client = axios.create({
      baseURL: `${baseUrl}/rest/api/2`,
      auth: {
        username: account,
        password: password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      const response = await this.client.get<JiraIssue>(`/issue/${issueKey}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Jira API 错误: ${error.response.status} - ${error.response.statusText}`
        );
      } else if (error.request) {
        throw new Error('无法连接到 Jira 服务器');
      } else {
        throw new Error(`请求失败: ${error.message}`);
      }
    }
  }

  async searchIssues(jql: string, maxResults: number = 50): Promise<JiraIssue[]> {
    try {
      const response = await this.client.get('/search', {
        params: {
          jql,
          maxResults,
        },
      });
      return response.data.issues;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Jira API 错误: ${error.response.status} - ${error.response.statusText}`
        );
      } else if (error.request) {
        throw new Error('无法连接到 Jira 服务器');
      } else {
        throw new Error(`请求失败: ${error.message}`);
      }
    }
  }

  async createIssue(
    projectKey: string,
    summary: string,
    description: string = '',
    options: CreateIssueOptions = {}
  ): Promise<CreateIssueResponse> {
    try {
      const issueData: any = {
        fields: {
          project: { key: projectKey },
          summary: summary,
          description: description,
          issuetype: { name: options.issueType || 'Task' },
        },
      };

      // 添加优先级
      if (options.priority) {
        issueData.fields.priority = { name: options.priority };
      }

      // 添加指派人
      if (options.assignee) {
        issueData.fields.assignee = { name: options.assignee };
      }

      // 添加标签
      if (options.labels) {
        issueData.fields.labels = options.labels.split(',').map(l => l.trim());
      }

      const response = await this.client.post<CreateIssueResponse>('/issue', issueData);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.errors
          ? JSON.stringify(error.response.data.errors)
          : error.response.statusText;
        throw new Error(
          `Jira API 错误: ${error.response.status} - ${errorMessage}`
        );
      } else if (error.request) {
        throw new Error('无法连接到 Jira 服务器');
      } else {
        throw new Error(`请求失败: ${error.message}`);
      }
    }
  }

  formatIssue(issue: JiraIssue): string {
    const lines: string[] = [];
    lines.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`任务编号: ${issue.key}`);
    lines.push(`任务标题: ${issue.fields.summary}`);
    lines.push(`任务类型: ${issue.fields.issuetype.name}`);
    lines.push(`状态: ${issue.fields.status.name}`);
    lines.push(`优先级: ${issue.fields.priority.name}`);
    lines.push(`创建人: ${issue.fields.creator.displayName} (${issue.fields.creator.name})`);
    
    if (issue.fields.assignee) {
      lines.push(`负责人: ${issue.fields.assignee.displayName} (${issue.fields.assignee.name})`);
    } else {
      lines.push(`负责人: 未分配`);
    }
    
    lines.push(`项目: ${issue.fields.project.name} (${issue.fields.project.key})`);
    
    if (issue.fields.parent) {
      lines.push(`父任务: ${issue.fields.parent.key} - ${issue.fields.parent.fields.summary}`);
    }
    
    if (issue.fields.description) {
      lines.push(`\n描述:`);
      lines.push(issue.fields.description);
    } else {
      lines.push(`\n描述: 无`);
    }
    
    lines.push(`\n创建时间: ${issue.fields.created}`);
    lines.push(`更新时间: ${issue.fields.updated}`);
    
    if (issue.fields.labels && issue.fields.labels.length > 0) {
      lines.push(`标签: ${issue.fields.labels.join(', ')}`);
    }
    
    lines.push(`\n链接: ${this.config.serviceInfo.baseUrl}/browse/${issue.key}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    return lines.join('\n');
  }
}
