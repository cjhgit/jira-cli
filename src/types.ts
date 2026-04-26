export interface JiraConfig {
  accountInfo: {
    account: string;
    password: string;
  };
  serviceInfo: {
    baseUrl: string;
  };
}

export interface JiraIssueType {
  self: string;
  id: string;
  description: string;
  iconUrl: string;
  name: string;
  subtask: boolean;
  avatarId: number;
}

export interface JiraUser {
  self: string;
  name: string;
  key: string;
  emailAddress: string;
  displayName: string;
  active: boolean;
  timeZone: string;
}

export interface JiraStatus {
  self: string;
  description: string;
  iconUrl: string;
  name: string;
  id: string;
  statusCategory: {
    self: string;
    id: number;
    key: string;
    colorName: string;
    name: string;
  };
}

export interface JiraPriority {
  self: string;
  iconUrl: string;
  name: string;
  id: string;
}

export interface JiraProject {
  self: string;
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

export interface JiraParentIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: JiraStatus;
    priority: JiraPriority;
    issuetype: JiraIssueType;
  };
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  boardId?: number;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
}

export interface JiraAttachment {
  self: string;
  id: string;
  filename: string;
  author: JiraUser;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}

export interface JiraIssueFields {
  issuetype: JiraIssueType;
  parent?: JiraParentIssue;
  components: any[];
  timespent: number | null;
  timeoriginalestimate: number | null;
  description: string | null;
  project: JiraProject;
  fixVersions: any[];
  aggregatetimespent: number | null;
  resolution: any;
  resolutiondate: string | null;
  workratio: number;
  summary: string;
  lastViewed: string | null;
  watches: {
    self: string;
    watchCount: number;
    isWatching: boolean;
  };
  creator: JiraUser;
  subtasks: any[];
  created: string;
  priority: JiraPriority;
  labels: string[];
  updated: string;
  status: JiraStatus;
  assignee: JiraUser | null;
  reporter: JiraUser;
  attachment?: JiraAttachment[];
  customfield_10006?: JiraSprint | JiraSprint[];  // Sprint 字段（可能是单个对象或数组）
  sprint?: JiraSprint;  // Agile API 返回的 sprint 字段
}

export interface JiraIssue {
  expand: string;
  id: string;
  self: string;
  key: string;
  fields: JiraIssueFields;
}

export interface CreateIssueOptions {
  issueType?: string;
  priority?: string;
  assignee?: string;
  labels?: string;
  parent?: string;
  attachments?: string[];
}

export interface CreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
}

export interface JiraTransitionsResponse {
  transitions: JiraTransition[];
}

export interface JiraComment {
  self: string;
  id: string;
  author: JiraUser;
  body: string;
  created: string;
  updated: string;
}

export interface JiraSearchResult {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface ListIssuesOptions {
  status?: string;
  assignee?: string;
  reporter?: string;
  all?: boolean;
  limit?: number;
  currentSprint?: boolean;
  parent?: string;
}

export interface JiraAssignableUser {
  self: string;
  name: string;
  key: string;
  emailAddress: string;
  displayName: string;
  active: boolean;
}
