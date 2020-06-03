
/**
 * 代理接口，在使用时，用于区分是需要具体实现，还是只需要类型定义
 */
import { DepsGraph, FileVexNode, VarVexNode, NpmVexNode } from '../impl/deps-graph.impl'

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface IDepsGraph extends DepsGraph{}
export interface IFileVexNode extends FileVexNode{}
export interface IVarVexNode extends VarVexNode{}
export interface INpmVexNode extends NpmVexNode{}
