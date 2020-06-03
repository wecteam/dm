import log from '../common/log';
import * as path from 'path';

/* 顶点结构类型 */
type VexNodeType = 'npm'|'file'|'var';
/* 顶点结构类型 */
type DepType = 'require' | 'import';

/** 顶点结构 */
class VexNode {
  /** 顶点标识,确保顶点唯一性 */
  private _key: string;
  /** 顶点类型 */
  private _type: string;
  /** 入弧链表头，即进入该顶点的弧的链表头 */
  firstin?: ArcBox;
  /** 出弧链表头，即从该顶点出去的弧的链表头 */
  firstout?: ArcBox;
  constructor (key: string, type: VexNodeType) {
    this._key = key;
    this._type = type;
  }
  /** 供外部获取 key */
  get key (): string {
    return this._key;
  }
  /** 供外部获取 type */
  get type (): string {
    return this._type;
  }
}

/**
 * 文件类型顶点
 */
class FileVexNode extends VexNode {
  /** 文件绝对路径 */
  private _filepath: string;
  /** 文件名 */
  private _filename: string;
  /** 文件大小 */
  size?: number;
  /** 最后修改人 */
  author?: string;
  /** 最后修改时间 */
  date?: string;
  /** 导出方式 */
  exportType?: 'export' | 'exportDefault' | 'cjs';
  constructor (filepath: string) {
    super(`file|${filepath}`, 'file');
    this._filepath = filepath;
    this._filename = path.basename(filepath)
  }
  /** 供外部获取 filepath */
  get filepath (): string {
    return this._filepath;
  }
  /** 供外部获取 filename */
  get filename (): string {
    return this._filename;
  }
}

/**
 * 变量类型顶点,即模块导出的函数、常量、类等
 */
class VarVexNode extends VexNode {
  /** 变量名 */
  private _name: string;
  /** 变量所在模块路径 */
  private _filepath: string
  constructor (name: string, filepath: string) {
    super(`var|${name}|${filepath}`, 'var');
    this._filepath = filepath;
    this._name = name;
  }

  /** 供外部获取 name */
  get name (): string {
    return this._name;
  }
  /** 供外部获取 filepath */
  get filepath (): string {
    return this._filepath;
  }
}

/**
 * npm包类型顶点
 */
class NpmVexNode extends VexNode {
  /** 包名 */
  private _name: string
  constructor (name: string) {
    super(`npm|${name}`, 'npm');
    this._name = name;
  }
  /** 供外部获取 name */
  get name (): string {
    return this._name;
  }
}

/** 弧结构 */
class ArcBox {
  /** 弧标识,确保弧唯一性 */
  private _key: string;
  /** 弧起点在顶点列表的索引 */
  private _tailvexIndex: number;
  /** 弧终点在顶点列表的索引 */
  private _headvexIndex: number;
  /** 入弧链表头，指向终点相同的下一条弧 */
  headlink?: ArcBox;
  /** 出弧链表头，指向起点相同的下一条弧 */
  taillink?: ArcBox;
  /** 弧信息 */
  depType?: DepType; // 依赖方式
  constructor (key: string, tailvexIndex: number, headvexIndex: number, depTye?: DepType) {
    this._key = key;
    this._tailvexIndex = tailvexIndex;
    this._headvexIndex = headvexIndex;
    this.depType = depTye;
  }
  get key (): string {
    return this._key;
  }
  get tailvexIndex (): number {
    return this._tailvexIndex;
  }
  get headvexIndex (): number {
    return this._headvexIndex;
  }
}

/**
 * 十字链表，存储依赖关系图
 */
class DepsGraph {
  /** 顶点列表 */
  private vexList: VexNode[] = [];
  /** 顶点key存储 */
  private vexKeyMap: Record<string, number> = {};
  /** 弧列表 */
  private arcList: ArcBox[] = [];
  /** 弧key存储 */
  private arcKeyMap: Record<string, number> = {};

  /** 格式化输出图的依赖关系 */
  toString (): string {
    let s = '';
    this.vexList.forEach(vex => {
      s += `\n${vex.key} -> `;
      let firstout = vex.firstout;
      if (!firstout) {
        s += 'null '
      }
      while (firstout) {
        s += `${this.vexList[firstout.headvexIndex].key}、`;
        firstout = firstout.taillink;
      }
      s = s.substr(0, s.length - 1)
      s += `\n${vex.key} <- `;
      let firstin = vex.firstin;

      if (!firstin) {
        s += 'null '
      }
      while (firstin) {
        s += `${this.vexList[firstin.tailvexIndex].key}、`;
        firstin = firstin.headlink;
      }
      s = s.substr(0, s.length - 1)
    })
    return s;
  }

  /**
   * 添加顶点
   * @param vex 顶点结构
   * @returns
   */
  addVex (vex: VexNode): number {
    const vexKey = vex.key;
    let vexIndex = this.vexKeyMap[vexKey];
    if (typeof vexIndex === 'undefined') {
      this.vexList.push(vex);
      this.vexKeyMap[vexKey] = vexIndex = this.vexList.length - 1;
    }
    return vexIndex;
  }

  /**
   * 获取单个文件顶点
   * @param filepath 文件绝对路径
   */
  getFileVexNode (filepath: string): FileVexNode {
    const vexKey = `file|${filepath}`;
    const vexIndex = this.vexKeyMap[vexKey];
    return this.vexList[vexIndex] as FileVexNode;
  }

  /**
   * 获取单个npm顶点
   * @param name 包名
   */
  getNpmVexNode (name: string): NpmVexNode {
    const vexKey = `npm|${name}`;
    const vexIndex = this.vexKeyMap[vexKey];
    return this.vexList[vexIndex] as NpmVexNode;
  }

  /**
   * 获取单个npm顶点
   * @param name 变量名
   * @param filepath 变量所在模块路径
   */
  getVarVexNode (name: string, filepath: string): VarVexNode {
    const vexKey = `npm|${name}|${filepath}`;
    const vexIndex = this.vexKeyMap[vexKey];
    return this.vexList[vexIndex] as VarVexNode;
  }

  /**
   * 向图中添加一条弧
   * @param tailvex 弧尾节点，即起点
   * @param headvex 弧首节点，即终点
   * @param depType 依赖方式
   */
  addArc (tailvex: VexNode, headvex: VexNode, depType?: DepType): void {
    const tailvexIndex = this.addVex(tailvex);
    const headvexIndex = this.addVex(headvex);
    const arcKey = `${tailvexIndex}|${headvexIndex}`;
    if (typeof this.arcKeyMap[arcKey] === 'undefined') {
      const arc = new ArcBox(arcKey, tailvexIndex, headvexIndex, depType);
      this.arcList.push(arc);
      this.arcKeyMap[arcKey] = this.arcList.length - 1;

      tailvex = this.vexList[tailvexIndex]; // 始终使用列表中的顶点
      headvex = this.vexList[headvexIndex];

      arc.taillink = tailvex.firstout; // 将起点的出弧链表头保存为当前弧的出弧链表头，即起点相同
      tailvex.firstout = arc; // 将当前弧插入到起点的出弧链表头

      arc.headlink = headvex.firstin // 将终点的入弧链表头保存为当前弧的出弧链表头，即终点相同
      headvex.firstin = arc; // 将当前弧插入到终点的入弧链表头
    } else {
      log.debug('addArc 出现重复弧', tailvex.key, '->', headvex.key)
    }
  }

  /**
   * 获取所有顶点
   */
  getVexList (): VexNode[] {
    return this.vexList;
  }

  /**
   * 获取所有弧线
   */
  getArcList (): ArcBox[] {
    return this.arcList;
  }

  /**
   * 获取所有npm顶点
   */
  getAllNpmVexNodes (): NpmVexNode[] {
    return this.vexList.filter(item => item.type === 'npm') as NpmVexNode[];
  }

  /**
   * 获取所有文件顶点
   */
  getAllFileVexNodes (): FileVexNode[] {
    return this.vexList.filter(item => item.type === 'file') as FileVexNode[];
  }

  /**
   * 获取所有变量顶点
   */
  getAllVarVexNodes (): VarVexNode[] {
    return this.vexList.filter(item => item.type === 'var') as VarVexNode[];
  }

  /**
   * 获取指定顶点的依赖顶点列表 vexNode -> xx
   * @param vexNode 指定顶点
   * @param type 指定类型
   */
  getTailVexNodes<T extends FileVexNode|VarVexNode|NpmVexNode> (vexNode: VexNode, type?: VexNodeType): T[] {
    let firstout = vexNode.firstout;
    let vexNodeList = [];
    while (firstout) {
      vexNodeList.push(this.vexList[firstout.headvexIndex])
      firstout = firstout.taillink;
    }
    if (type) {
      vexNodeList = vexNodeList.filter(item => item.type === type);
    }
    return vexNodeList as T[]
  }

  /**
   * 获取依赖指定顶点的顶点列表 xx -> vexNode
   * @param vexNode 指定顶点
   * @param type 指定类型
   */
  getHeadVexNodes<T extends FileVexNode|VarVexNode|NpmVexNode> (vexNode: VexNode, type?: VexNodeType): T[] {
    let firstin = vexNode.firstin;
    let vexNodeList = [];
    while (firstin) {
      vexNodeList.push(this.vexList[firstin.tailvexIndex])
      firstin = firstin.headlink;
    }
    if (type) {
      vexNodeList = vexNodeList.filter(item => item.type === type);
    }
    return vexNodeList as T[];
  }
}

export { DepsGraph, VexNode, FileVexNode, VarVexNode, NpmVexNode }
