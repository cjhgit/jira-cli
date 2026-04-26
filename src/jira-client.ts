import axios, { AxiosInstance } from 'axios';
import { createWriteStream, createReadStream, existsSync, mkdirSync, statSync } from 'fs';
import { dirname, basename } from 'path';
import FormData from 'form-data';
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

      // 如果需要过滤父任务的子任务
      if (options.parent) {
        jql += ` AND parent = "${options.parent}"`;
      }

      // 如果需要过滤当前 Sprint
      if (options.currentSprint) {
        // 查找项目的 Board
        const boards = await this.getBoardsForProject(projectKey);
        
        if (boards.length === 0) {
          throw new Error(`项目 ${projectKey} 没有找到 Board，无法过滤 Sprint`);
        }

        const boardId = boards[0].id;
        
        // 查找活动的 Sprint
        const sprints = await this.getActiveSprints(boardId);
        
        if (sprints.length === 0) {
          throw new Error(`项目 ${projectKey} 没有活动的 Sprint`);
        }

        const sprintId = sprints[0].id;
        jql += ` AND Sprint = ${sprintId}`;
      }

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
        throw error;
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
        const issueTypeLower = issueType.toLowerCase();
        const isSubtaskType = issueTypeLower.includes('sub') || issueTypeLower.includes('子任务');
        
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

  async setParent(issueKey: string, parentKey: string, options?: { autoConvert?: boolean }): Promise<{ newKey?: string }> {
    try {
      const issue = await this.getIssue(issueKey);
      
      if (issue.fields.parent) {
        throw new Error(
          `任务 ${issueKey} 已经是子任务，其父任务为 ${issue.fields.parent.key}\n` +
          `如需更改父任务，请先使用以下命令移除当前父任务：\n` +
          `  jira issue remove-parent ${issueKey} --auto-convert`
        );
      }
      
      const isSubtaskType = issue.fields.issuetype.subtask;
      
      // 如果不是子任务类型，需要重建任务
      if (!isSubtaskType) {
        if (options?.autoConvert) {
          console.log(`正在将任务转换为子任务（会创建新任务并删除原任务）...`);
          
          // 获取所有评论
          const comments = await this.getComments(issueKey);
          
          // 创建新的子任务
          console.log(`正在创建新的子任务...`);
          const newIssue = await this.createIssue(
            issue.fields.project.key,
            issue.fields.summary,
            issue.fields.description || '',
            {
              issueType: '子任务',
              priority: issue.fields.priority?.name,
              assignee: issue.fields.assignee?.name,
              labels: issue.fields.labels?.join(','),
              parent: parentKey
            }
          );
          
          console.log(`新子任务已创建: ${newIssue.key}`);
          
          // 复制所有评论到新任务
          if (comments.length > 0) {
            console.log(`正在复制 ${comments.length} 条评论...`);
            for (const comment of comments) {
              await this.addComment(
                newIssue.key,
                `[从 ${issueKey} 迁移]\n${comment.body}\n\n原作者: ${comment.author.displayName} (${new Date(comment.created).toLocaleString('zh-CN')})`
              );
            }
          }
          
          // 删除原任务
          console.log(`正在删除原任务 ${issueKey}...`);
          await this.deleteIssue(issueKey);
          
          return { newKey: newIssue.key };
        } else {
          throw new Error(
            `由于 Jira API 限制，无法直接将任务转换为子任务。\n\n` +
            `该命令提供自动转换功能（会创建新子任务并删除原任务）：\n` +
            `  jira issue set-parent ${issueKey} -p ${parentKey} --auto-convert\n\n` +
            `或者手动操作：\n` +
            `1. 在 Jira 网页界面创建一个新的子任务\n` +
            `2. 将原任务的内容复制到新子任务\n` +
            `3. 删除原任务`
          );
        }
      }
      
      // 如果已经是子任务类型，只需要设置父任务
      await this.client.put(`/issue/${issueKey}`, {
        fields: {
          parent: { key: parentKey }
        }
      });
      
      return {};
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
        throw error;
      }
    }
  }

  async removeParent(issueKey: string, options?: { autoConvert?: boolean }): Promise<{ newKey?: string }> {
    try {
      const issue = await this.getIssue(issueKey);
      
      if (!issue.fields.parent) {
        throw new Error(
          `任务 ${issueKey} 不是子任务，无需移除父任务`
        );
      }
      
      const isSubtaskType = issue.fields.issuetype.subtask;
      
      if (isSubtaskType) {
        if (options?.autoConvert) {
          // 自动转换：创建新任务 + 删除旧任务
          console.log(`正在将子任务转换为独立任务（会创建新任务并删除原子任务）...`);
          
          // 获取所有评论
          const comments = await this.getComments(issueKey);
          
          // 创建新的独立任务
          console.log(`正在创建新的独立任务...`);
          const newIssue = await this.createIssue(
            issue.fields.project.key,
            issue.fields.summary,
            issue.fields.description || '',
            {
              issueType: '任务',
              priority: issue.fields.priority?.name,
              assignee: issue.fields.assignee?.name,
              labels: issue.fields.labels?.join(',')
            }
          );
          
          console.log(`新任务已创建: ${newIssue.key}`);
          
          // 复制所有评论到新任务
          if (comments.length > 0) {
            console.log(`正在复制 ${comments.length} 条评论...`);
            for (const comment of comments) {
              await this.addComment(
                newIssue.key,
                `[从 ${issueKey} 迁移]\n${comment.body}\n\n原作者: ${comment.author.displayName} (${new Date(comment.created).toLocaleString('zh-CN')})`
              );
            }
          }
          
          // 删除原子任务
          console.log(`正在删除原子任务 ${issueKey}...`);
          await this.deleteIssue(issueKey);
          
          return { newKey: newIssue.key };
        } else {
          throw new Error(
            `由于 Jira API 限制，无法直接移除子任务的父任务。\n\n` +
            `该命令提供自动转换功能（会创建新任务并删除原子任务）：\n` +
            `  使用 --auto-convert 参数自动转换\n\n` +
            `或者手动操作：\n` +
            `1. 在 Jira 网页界面打开任务: ${this.config.serviceInfo.baseUrl}/browse/${issueKey}\n` +
            `2. 点击右上角"更多"(···)菜单\n` +
            `3. 选择"转换为问题"或"Convert to Issue"\n` +
            `4. 选择目标任务类型（如"任务"或"Task"）\n` +
            `5. 完成转换流程`
          );
        }
      }
      
      // 如果不是子任务类型，尝试移除父任务
      await this.client.put(`/issue/${issueKey}`, {
        update: {
          parent: [{ set: null }]
        }
      });
      
      return {};
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
        throw error;
      }
    }
  }

  async addFlag(issueKey: string, message?: string): Promise<void> {
    try {
      // 使用标签功能来实现 flag，这是最通用和兼容的方式
      const issue = await this.getIssue(issueKey);
      const currentLabels = issue.fields.labels || [];
      
      // 如果已经有 FLAGGED 标签，则不重复添加
      if (currentLabels.includes('FLAGGED')) {
        console.log('提示: 任务已经被标记');
        if (message) {
          await this.addComment(issueKey, `🚩 标记说明: ${message}`);
        }
        return;
      }
      
      // 添加 FLAGGED 标签
      const newLabels = [...currentLabels, 'FLAGGED'];
      
      await this.client.put(`/issue/${issueKey}`, {
        fields: {
          labels: newLabels
        }
      });

      // 如果提供了消息，添加一个评论来说明原因
      if (message) {
        await this.addComment(issueKey, `🚩 标记为需要关注: ${message}`);
      }
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

  async removeFlag(issueKey: string): Promise<void> {
    try {
      // 移除 FLAGGED 标签
      const issue = await this.getIssue(issueKey);
      const currentLabels = issue.fields.labels || [];
      
      // 如果没有 FLAGGED 标签，提示用户
      if (!currentLabels.includes('FLAGGED')) {
        console.log('提示: 任务未被标记');
        return;
      }
      
      // 移除 FLAGGED 标签
      const newLabels = currentLabels.filter(label => label !== 'FLAGGED');
      
      await this.client.put(`/issue/${issueKey}`, {
        fields: {
          labels: newLabels
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

  async downloadAttachment(issueKey: string, attachmentId: string, outputPath: string): Promise<void> {
    try {
      // 获取任务信息以找到附件
      const issue = await this.getIssue(issueKey);
      
      if (!issue.fields.attachment || issue.fields.attachment.length === 0) {
        throw new Error(`任务 ${issueKey} 没有附件`);
      }
      
      // 查找指定的附件
      const attachment = issue.fields.attachment.find(a => a.id === attachmentId || a.filename === attachmentId);
      
      if (!attachment) {
        const availableAttachments = issue.fields.attachment
          .map(a => `  - ${a.filename} (ID: ${a.id})`)
          .join('\n');
        throw new Error(
          `找不到附件 "${attachmentId}"\n\n可用的附件:\n${availableAttachments}`
        );
      }
      
      // 下载附件
      const response = await axios.get(attachment.content, {
        auth: {
          username: this.config.accountInfo.account,
          password: this.config.accountInfo.password,
        },
        responseType: 'stream',
      });
      
      // 确保输出目录存在
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      
      // 将数据写入文件
      const writer = createWriteStream(outputPath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
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

  async uploadAttachment(issueKey: string, filePath: string): Promise<{ id: string; filename: string }> {
    try {
      // 检查文件是否存在
      if (!existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      // 创建 FormData
      const form = new FormData();
      form.append('file', createReadStream(filePath), {
        filename: basename(filePath),
        contentType: 'application/octet-stream',
      });

      // 上传附件
      const response = await axios.post(
        `${this.config.serviceInfo.baseUrl}/rest/api/2/issue/${issueKey}/attachments`,
        form,
        {
          auth: {
            username: this.config.accountInfo.account,
            password: this.config.accountInfo.password,
          },
          headers: {
            'X-Atlassian-Token': 'no-check',
            ...form.getHeaders(),
          },
        }
      );

      if (response.data && response.data.length > 0) {
        return {
          id: response.data[0].id,
          filename: response.data[0].filename,
        };
      }

      throw new Error('上传附件失败：服务器未返回附件信息');
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
    
    if (issue.fields.attachment && issue.fields.attachment.length > 0) {
      lines.push(`附件 (${issue.fields.attachment.length}):`);
      issue.fields.attachment.forEach((attachment: any) => {
        const sizeKB = (attachment.size / 1024).toFixed(2);
        const created = new Date(attachment.created).toLocaleString('zh-CN');
        lines.push(`  - ${attachment.filename}`);
        lines.push(`    大小: ${sizeKB} KB | 类型: ${attachment.mimeType}`);
        lines.push(`    上传者: ${attachment.author.displayName} | 时间: ${created}`);
        lines.push(`    下载链接: ${attachment.content}`);
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
