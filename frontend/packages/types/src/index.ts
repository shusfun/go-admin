export type ClientType = "admin" | "mobile-user";

export interface ApiDebugInfo {
  error?: string;
  stack?: string;
}

export interface ApiEnvelope<T> {
  code: number;
  data: T;
  msg: string;
  debug?: ApiDebugInfo;
}

export interface LoginPayload {
  username: string;
  password: string;
  code?: string;
  uuid?: string;
}

export interface LoginResult {
  code: number;
  token: string;
  expire: string;
  msg?: string;
}

export interface CaptchaResponse {
  code: number;
  data: string;
  id: string;
  msg: string;
}

export interface RoleSummary {
  roleId: number;
  roleName: string;
  roleKey: string;
}

export interface PostSummary {
  postId: number;
  postName: string;
  postCode: string;
}

export interface ImageVariant {
  path: string;
  size: number;
}

export interface ImageAsset {
  path: string;
  size: number;
  variants?: ImageVariant[];
}

export interface ProfileUser {
  userId: number;
  username: string;
  nickName: string;
  deptId: number;
  roleId: number;
  phone: string;
  email: string;
  avatar: ImageAsset | null;
  remark: string;
}

export interface ProfileResponse {
  user: ProfileUser;
  roles: RoleSummary[];
  posts: PostSummary[];
}

export interface UpdateProfilePayload {
  nickName: string;
  phone: string;
  email: string;
  remark: string;
}

export interface InfoResponse {
  roles: string[];
  permissions: string[];
  buttons: string[];
  introduction: string;
  avatar: ImageAsset | null;
  userName: string;
  userId: number;
  deptId: number;
  name: string;
  code: number;
}

export interface RawMenuItem {
  menuId: number;
  menuName: string;
  title: string;
  icon: string;
  path: string;
  paths: string;
  menuType: string;
  action: string;
  permission: string;
  parentId: number;
  noCache: boolean;
  breadcrumb: string;
  component: string;
  sort: number;
  visible: string;
  isFrame: string;
  children?: RawMenuItem[];
}

export interface SysMenuRecord extends RawMenuItem {
  apis?: number[];
  sysApi?: SysApiRecord[];
  createdAt?: string;
}

export interface AppMenuNode {
  id: number;
  title: string;
  icon: string;
  path: string;
  fullPath: string;
  menuType: string;
  permission: string;
  hidden: boolean;
  breadcrumb: string;
  component: string;
  children: AppMenuNode[];
}

export interface AppSession {
  token: string;
  expireAt: string;
  tenantCode: string;
  clientType: ClientType;
}

export interface TenantContext {
  tenantCode: string;
  host: string;
}

export type OpsTaskType = "deploy_backend" | "deploy_frontend" | "deploy_all" | "restart_backend";

export type OpsTaskStatus = "queued" | "running" | "success" | "failed" | "cancelled";

export interface CommitInfo {
  hash: string;
  message: string;
}

export interface RepoPendingCommits {
  count: number;
  recent: CommitInfo[];
  commits: CommitInfo[];
}

export interface OpsPendingCommits {
  backend: RepoPendingCommits;
  frontend: RepoPendingCommits;
}

export interface OpsLastDeploy {
  id: number;
  type: OpsTaskType;
  status: OpsTaskStatus;
  finishedAt: string;
}

export interface OpsRunningTask {
  id: number;
  type: OpsTaskType;
  status: OpsTaskStatus;
  step: number;
  totalSteps: number;
  stepName: string;
}

export interface OpsEnvironmentItem {
  key: string;
  name: string;
  enabled: boolean;
  domain: string;
  confirmName: boolean;
  status: "healthy" | "unhealthy" | "disabled";
  lastDeploy: OpsLastDeploy | null;
  pendingCommits: OpsPendingCommits;
  runningTask: OpsRunningTask | null;
  actions: OpsTaskType[];
}

export interface OpsTaskListItem {
  id: number;
  env: string;
  type: OpsTaskType;
  status: OpsTaskStatus;
  step: number;
  totalSteps: number;
  stepName: string;
  summary: string;
  errMsg: string;
  suggestion: string;
  startedAt: string;
  finishedAt: string;
  createBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface OpsTaskCommits {
  backend: CommitInfo[];
  frontend: CommitInfo[];
}

export interface OpsTaskDetail extends OpsTaskListItem {
  log: string;
  commits: OpsTaskCommits;
}

export interface CreateOpsTaskPayload {
  env: string;
  type: OpsTaskType;
  confirmName?: string;
}

export interface OpsTaskIdResult {
  id: number;
}

export interface OpsTaskCancelResult {
  id: number;
  status: OpsTaskStatus;
}

export interface PagePayload<T> {
  list: T[];
  count: number;
  pageIndex: number;
  pageSize: number;
}

export interface QueryPayload {
  pageIndex?: number;
  pageSize?: number;
  [key: string]: string | number | undefined;
}

export interface DeletePayload {
  ids?: Array<number | string>;
  dictCode?: number;
  dictId?: number;
  id?: number;
  roleId?: number;
  postId?: number;
  userId?: number;
}

export interface SysUserRecord {
  userId: number;
  username: string;
  nickName: string;
  phone: string;
  roleId: number;
  avatar: string;
  sex: string;
  email: string;
  deptId: number;
  postId: number;
  remark: string;
  status: string;
  createdAt?: string;
}

export interface SysRoleRecord {
  roleId: number;
  roleName: string;
  status: string;
  roleKey: string;
  roleSort: number;
  flag: string;
  remark: string;
  admin: boolean;
  dataScope: string;
  menuIds?: number[];
  deptIds?: number[];
}

export interface TreeOptionNode {
  id: number;
  label: string;
  children?: TreeOptionNode[];
}

export interface RoleMenuTreeResponse {
  menus: TreeOptionNode[];
  checkedKeys: number[];
}

export interface RoleDeptTreeResponse {
  depts: TreeOptionNode[];
  checkedKeys: number[];
}

export interface SysPostRecord {
  postId: number;
  postName: string;
  postCode: string;
  sort: number;
  status: number;
  remark: string;
}

export interface SysApiRecord {
  id: number;
  handle: string;
  title: string;
  path: string;
  action: string;
  type: string;
  createdAt?: string;
}

export interface SysConfigRecord {
  id: number;
  configName: string;
  configKey: string;
  configValue: string;
  configType: string;
  isFrontend: string;
  remark: string;
  createdAt?: string;
}

export interface SysDeptRecord {
  deptId: number;
  parentId: number;
  deptPath: string;
  deptName: string;
  sort: number;
  leader: string;
  phone: string;
  email: string;
  status: number;
  children?: SysDeptRecord[];
}

export interface SysDictTypeRecord {
  id: number;
  dictName: string;
  dictType: string;
  status: number;
  remark: string;
  createdAt?: string;
}

export interface SysDictDataRecord {
  dictCode: number;
  dictSort: number;
  dictLabel: string;
  dictValue: string;
  dictType: string;
  cssClass: string;
  listClass: string;
  isDefault: string;
  status: number;
  default: string;
  remark: string;
  createdAt?: string;
}

export interface SysLoginLogRecord {
  id: number;
  username: string;
  status: string;
  ipaddr: string;
  loginLocation: string;
  browser: string;
  os: string;
  platform: string;
  loginTime: string;
  remark: string;
  msg: string;
  createdAt?: string;
}

export interface SysOperaLogRecord {
  id: number;
  title: string;
  businessType: string;
  businessTypes: string;
  method: string;
  requestMethod: string;
  operatorType: string;
  operName: string;
  deptName: string;
  operUrl: string;
  operIp: string;
  operLocation: string;
  operParam: string;
  status: string;
  operTime: string;
  jsonResult: string;
  remark: string;
  latencyTime: string;
  userAgent: string;
  createdAt?: string;
}

export interface SysJobRecord {
  jobId: number;
  jobName: string;
  jobGroup: string;
  jobType: number;
  cronExpression: string;
  invokeTarget: string;
  args: string;
  misfirePolicy: number;
  concurrent: number;
  status: number;
  entryId: number;
  createdAt?: string;
}

export interface SysJobLogRecord {
  id: number;
  jobId: number;
  jobName: string;
  jobGroup: string;
  jobType: number;
  invokeTarget: string;
  cronExpression: string;
  status: number;
  message: string;
  durationMs: number;
  startTime: string;
  endTime: string;
  entryId: number;
  createdAt?: string;
}

export interface ServerMonitorInfo {
  cpuNum?: number;
  cpuUsed?: string;
  goNum?: number;
  goroutineNum?: number;
  hostName?: string;
  ip?: string;
  memTotal?: string;
  memUsed?: string;
  os?: string;
  diskList?: Array<Record<string, string | number>>;
  [key: string]: unknown;
}

export interface OpsStatusEvent {
  status: OpsTaskStatus;
  step: number;
  totalSteps: number;
  stepName: string;
}

export interface OpsLogEvent {
  line: string;
  offset: number;
}

export interface OpsDoneEvent {
  status: OpsTaskStatus;
  summary: string;
  duration: string;
  domain: string;
}

export interface OpsErrorEvent {
  status: OpsTaskStatus;
  step: number;
  stepName: string;
  errMsg: string;
  suggestion: string;
}

export * as generatedTypes from "./generated/model";
