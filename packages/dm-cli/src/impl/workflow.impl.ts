/**
 * 组合模式工作流
 * @author chenxiaoqiang12
 */

import { IWorkList, IWorkNode } from '../interfaces'

export class WorkList implements IWorkList {
  workList: IWorkNode[] = [];
  add (work: IWorkNode): void {
    this.workList.push(work);
  }
  async execute (): Promise<void> {
    for (const work of this.workList) {
      await work.execute();
    }
  }
}

/**
 * 将函数处理成工作节点
 * @param fun
 */
export function workNodeDecorate (fun: Function): IWorkNode {
  const workNode: IWorkNode = {
    execute: async () => {
      await fun();
    }
  }
  return workNode
}
