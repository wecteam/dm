/**
 * 工作流接口
 * @author chenxiaoqiang12
 */

export interface IWorkNode {
  execute(): void;
}

export interface IWorkList extends IWorkNode {
  workList: IWorkNode[];
  add(work: IWorkNode): void;
}
