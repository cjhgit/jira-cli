import axios, { AxiosInstance } from 'axios';
import { 
  JiraConfig, 
  JiraIssue, 
  CreateIssueOptions, 
  CreateIssueResponse,
  JiraTransitionsResponse,
  JiraComment,
  JiraSearchResult,
  ListIssuesOptions,
  JiraProject,
  JiraAssignableUser
} from './types';

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
      const response = await this.client.get<JiraSearchResult>('/search', {
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

  async listIssues(projectKey: string, options: ListIssuesOptions = {}): Promise<JiraIssue[]> {
    try {
      let jql = `project = "${projectKey}"`;

      if (options.status) {
        jql += ` AND status = "${options.status}"`;
      }

      if (options.assignee) {
        jql += ` AND assignee = "${options.assignee}"`;
      }

      if (options.reporter) {
        jql += ` AND reporter = "${options.reporter}"`;
      }

      // 默认只显示未完成的任务
      if (!options.all) {
        jql += ' AND resolution = Unresolved';
      }

      jql += ' ORDER BY updated DESC';

      const maxResults = options.limit || 50;

      const response = await this.client.get<JiraSearchResult>('/search', {
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

  async updateStatus(issueKey: string, targetStatus: string): Promise<void> {
    try {
      // 1. 获取可用的转换
      const response = await this.client.get<JiraTransitionsResponse>(`/issue/${issueKey}/transitions`);
      
      // 2. 查找目标状态对应的转换
      const transition = response.data.transitions.find(t =>
        t.to.name.toLowerCase() === targetStatus.toLowerCase() ||
        t.name.toLowerCase() === targetStatus.toLowerCase()
      );

      if (!transition) {
        const availableTransitions = response.data.transitions
          .map(t => `"${t.to.name}"`)
          .join(', ');
        const transitionDetails = response.data.transitions
          .map(t => `  - "${t.to.name}" (转换名称: ${t.name})`)
          .join('\n');
        throw new Error(
          `找不到到 "${targetStatus}" 状态的转换。\n\n` +
          `可用的目标状态: ${availableTransitions}\n\n` +
          `使用方法: jira issue update-status ${issueKey} -s "状态名称"\n\n` +
          `详细信息:\n${transitionDetails}`
        );
      }

      // 3. 执行转换
      await this.client.post(`/issue/${issueKey}/transitions`, {
        transition: { id: transition.id }
      });
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Jira API 错误: ${error.response.status} - ${error.response.statusText}`
        );
      } else if (error.request) {
        throw new Error('无法连接到 Jira 服务器');
      } else {
        throw error;
      }
    }
  }

  async addComment(issueKey: string, commentBody: string): Promise<JiraComment> {
    try {
      const response = await this.client.post<JiraComment>(`/issue/${issueKey}/comment`, {
        body: commentBody
      });
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

  async assignIssue(issueKey: string, assignee: string): Promise<void> {
    try {
      await this.client.put(`/issue/${issueKey}`, {
        fields: {
          assignee: { name: assignee }
        }
      });
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

  async deleteIssue(issueKey: string): Promise<void> {
    try {
      await this.client.delete(`/issue/${issueKey}`);
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

  async updateDescription(issueKey: string, description: string): Promise<void> {
    try {
      await this.client.put(`/issue/${issueKey}`, {
        fields: {
          description: description
        }
      });
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

  async deleteComment(issueKey: string, commentId: string): Promise<void> {
    try {
      await this.client.delete(`/issue/${issueKey}/comment/${commentId}`);
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

  async getComments(issueKey: string): Promise<JiraComment[]> {
    try {
      const response = await this.client.get<{ comments: JiraComment[] }>(`/issue/${issueKey}/comment`);
      return response.data.comments;
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

  async listProjects(): Promise<JiraProject[]> {
    try {
      const response = await this.client.get<JiraProject[]>('/project');
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

  async listAssignableUsers(projectKey?: string, issueKey?: string, maxResults: number = 50): Promise<JiraAssignableUser[]> {
    try {
      const params: any = {
        maxResults,
      };

      if (projectKey) {
        params.project = projectKey;
      } else if (issueKey) {
        params.issueKey = issueKey;
      } else {
        throw new Error('必须指定项目 Key 或任务 Key');
      }

      const response = await this.client.get<JiraAssignableUser[]>('/user/assignable/search', {
        params,
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Jira API 错误: ${error.response.status} - ${error.response.statusText}`
        );
      } else if (error.request) {
        throw new Error('无法连接到 Jira 服务器');
      } else {
        throw error;
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

  formatIssue(issue: JiraIssue, comments?: JiraComment[]): string {
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
    
    if (comments && comments.length > 0) {
      lines.push(`\n评论 (${comments.length}):`);
      lines.push('────────────────────────────────────────');
      comments.forEach((comment, index) => {
        const author = comment.author.displayName;
        const created = new Date(comment.created).toLocaleString('zh-CN');
        lines.push(`#${index + 1} (ID: ${comment.id}) ${author} - ${created}`);
        lines.push(`   ${comment.body}`);
        lines.push('────────────────────────────────────────');
      });
    } else {
      lines.push(`\n评论: 无`);
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
