
/**
 * 代理接口，在使用时，用于区分是需要具体实现，还是只需要类型定义
 */
import { Context } from '../impl/context.impl'

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface IContext extends Context{}
