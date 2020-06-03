
/**
 * MockLog 类
 * 用于获取当前测试用例输出的log信息
 */
import log from '../../dist/common/log';

/**
 * 类型声明
 */
type ILog = typeof log;

interface ILogCollection extends Array<any> {
  isFlat: boolean;
  flatten: () => ILogCollection;
  toMatchOnce: (pattern: string | RegExp) => boolean;
}

// 需要关注收集的log方法
const logFunc = ['debug', 'log', 'warn', 'error'];

/**
 * log collection 类
 */
class LogCollection extends Array implements ILogCollection {
  /**
   * 数据结构是否已经展平
   */
  isFlat = false;

  /**
   * 将数组结构展平
   */
  flatten (): ILogCollection {
    if (!this.isFlat) {
      const collection = this.splice(0, this.length);

      collection.forEach(item => {
        if (Array.isArray(item)) {
          // 递归执行 flatten
          this.push(...new LogCollection(...item).flatten());
        } else {
          this.push(item.toString());
        }
      })

      this.isFlat = true;
    }

    return this;
  }

  /**
   * 若集合中有一条log满足传入的匹配模式，则返回true，否则返回false
   * @param {string | RegExp} pattern 匹配模式
   */
  toMatchOnce (pattern: string | RegExp): boolean {
    if (!this.isFlat) {
      // 先将结构打平
      this.flatten();
    }

    return this.some(item => new RegExp(pattern).test(item));
  }
}

class MockLog {
  _log: ILog;

  /**
   * MockLog Constructor
   * @param {ILog} log 当前模块引入的 log 对象
   */
  constructor (log: ILog) {
    this._log = log;
  }

  /*
   * 收集本轮的所有 log 信息
   */
  collection (): LogCollection {
    const _log = this._log;
    const logCollection = new LogCollection();

    for (const key of logFunc) {
      if (_log[key as keyof ILog] instanceof Function) {
        logCollection.push((_log[key as keyof ILog] as jest.Mock).mock.calls);
      }
    }

    return logCollection.flatten();
  }
}

export default MockLog;
