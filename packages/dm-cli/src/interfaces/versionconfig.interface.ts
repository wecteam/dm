
export interface IVersionInfo {
  /** 错误级别 */
  bug_level: 'warning' | 'error';
  /** 描述 */
  desc: string;
  /** 最大版本号 */
  max_version: 'string';
  /** 最小版本号 */
  min_version: 'string';
}
