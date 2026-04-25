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
      const response = await this.client.get<JiraIssue>(`/issue/${issueKey}`, {
        params: {
          expand: 'names',
          fields: '*all'
        }
      });
      
      // 尝试使用 Agile API 获取 sprint 信息
      try {
        const agileClient = axios.create({
          baseURL: `${this.config.serviceInfo.baseUrl}/rest/agile/1.0`,
          auth: {
            username: this.config.accountInfo.account,
            password: this.config.accountInfo.password,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const sprintResponse = await agileClient.get(`/issue/${issueKey}`, {
          params: {
            fields: 'sprint'
          }
        });
        
        // 将 sprint 信息合并到 issue 中
        if (sprintResponse.data?.fields?.sprint) {
          (response.data.fields as any).sprint = sprintResponse.data.fields.sprint;
        }
      } catch (sprintError) {
        // 如果获取 sprint 信息失败，忽略错误继续
      }
      
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

  async updateIssue(issueKey: string, fields: Record<string, any>): Promise<void> {
    try {
      await this.client.put(`/issue/${issueKey}`, { fields });
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

  async updateComment(issueKey: string, commentId: string, body: string): Promise<JiraComment> {
    try {
      const response = await this.client.put<JiraComment>(`/issue/${issueKey}/comment/${commentId}`, {
        body
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

  async addIssueToSprint(issueKey: string, sprintId: number): Promise<void> {
    try {
      const agileClient = axios.create({
        baseURL: `${this.config.serviceInfo.baseUrl}/rest/agile/1.0`,
        auth: {
          username: this.config.accountInfo.account,
          password: this.config.accountInfo.password,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await agileClient.post(`/sprint/${sprintId}/issue`, {
        issues: [issueKey]
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

  async removeIssueFromSprint(issueKey: string): Promise<void> {
    try {
      const agileClient = axios.create({
        baseURL: `${this.config.serviceInfo.baseUrl}/rest/agile/1.0`,
        auth: {
          username: this.config.accountInfo.account,
          password: this.config.accountInfo.password,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 使用 Agile API 将 issue 移回 backlog
      await agileClient.post('/backlog/issue', {
        issues: [issueKey]
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

  async getActiveSprints(boardId: number): Promise<any[]> {
    try {
      const agileClient = axios.create({
        baseURL: `${this.config.serviceInfo.baseUrl}/rest/agile/1.0`,
        auth: {
          username: this.config.accountInfo.account,
          password: this.config.accountInfo.password,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await agileClient.get(`/board/${boardId}/sprint`, {
        params: {
          state: 'active'
        }
      });

      return response.data.values || [];
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

  async getBoardsForProject(projectKey: string): Promise<any[]> {
    try {
      const agileClient = axios.create({
        baseURL: `${this.config.serviceInfo.baseUrl}/rest/agile/1.0`,
        auth: {
          username: this.config.accountInfo.account,
          password: this.config.accountInfo.password,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await agileClient.get('/board', {
        params: {
          projectKeyOrId: projectKey
        }
      });

      return response.data.values || [];
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
      // 验证：如果指定了父任务，必须使用子任务类型
      if (options.parent) {
        const issueType = options.issueType || 'Task';
        const isSubtaskType = issueType.toLowerCase().includes('sub');
        
        if (!isSubtaskType) {
          throw new Error(
            `创建子任务时必须指定子任务类型！\n\n` +
            `当前任务类型: ${issueType}\n` +
            `父任务: ${options.parent}\n\n` +
            `请使用 -t 参数指定子任务类型，例如：\n` +
            `  -t Sub-task\n` +
            `  -t Subtask\n` +
            `  -t 子任务\n\n` +
            `完整示例：\n` +
            `  jira issue create -p ${projectKey} -s "${summary}" --parent ${options.parent} -t Sub-task`
          );
        }
      }

      const issueData: any = {
        fields: {
          project: { key: projectKey },
          summary: summary,
          description: description,
          issuetype: { name: options.issueType || 'Task' },
        },
      };

      // 添加父任务（用于创建子任务）
      if (options.parent) {
        issueData.fields.parent = { key: options.parent };
      }

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
    
    // 显示 Sprint 信息
    const sprintField = (issue.fields as any).sprint || issue.fields.customfield_10006;
    
    if (sprintField) {
      // sprint 可能是对象（单个）或数组（多个）
      if (Array.isArray(sprintField)) {
        const activeSprint = sprintField.find((s: any) => s.state === 'active');
        const futureSprint = sprintField.find((s: any) => s.state === 'future');
        
        if (activeSprint) {
          lines.push(`Sprint: ${activeSprint.name} (活动中)`);
        } else if (futureSprint) {
          lines.push(`Sprint: ${futureSprint.name} (未开始)`);
        } else {
          const lastSprint = sprintField[sprintField.length - 1];
          lines.push(`Sprint: ${lastSprint.name} (${lastSprint.state === 'closed' ? '已完成' : lastSprint.state})`);
        }
      } else if (sprintField.id && sprintField.name) {
        // sprint 是单个对象
        const stateText = sprintField.state === 'active' ? '活动中' :
                         sprintField.state === 'future' ? '未开始' :
                         sprintField.state === 'closed' ? '已完成' : sprintField.state;
        lines.push(`Sprint: ${sprintField.name} (${stateText})`);
      } else {
        lines.push(`Sprint: Backlog`);
      }
    } else {
      lines.push(`Sprint: Backlog`);
    }
    
    if (issue.fields.parent) {
      lines.push(`父任务: ${issue.fields.parent.key} - ${issue.fields.parent.fields.summary}`);
    }
    
    if (issue.fields.subtasks && issue.fields.subtasks.length > 0) {
      lines.push(`子任务 (${issue.fields.subtasks.length}):`);
      issue.fields.subtasks.forEach((subtask: any) => {
        const status = subtask.fields.status.name;
        lines.push(`  - ${subtask.key}: ${subtask.fields.summary} [${status}]`);
      });
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
