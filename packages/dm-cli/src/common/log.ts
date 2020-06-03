/* eslint-disable @typescript-eslint/no-explicit-any */
import chalk from 'chalk'
import ora = require('ora')

type ColorRange = 'white' | 'blue' | 'yellow' | 'red';
type LogFunLevel = '_log' | '_warn' | '_error';
export const enum LogLevel {
  debug = 1,
  log,
  warn,
  error
}
export class Log {
  /** 日志系统初始化时间 */
  private startTime = Date.now();
  /** 日志级别 */
  private level = LogLevel.log;
  /** ora 实例 */
  private spinner?: ora.Ora;
  /** 日志标题 */
  private title?: string;
  private _log = console.log;
  private _warn = console.warn;
  private _error = console.error;

  private output (funLevel: LogFunLevel, color: ColorRange, ...args: string[]): void {
    if (this.spinner) {
      this.spinner.text = chalk[color](`[${this.title}]`)
      this.spinner.render()
      this[funLevel](...args, this.time())
    } else {
      this[funLevel](...args)
    }
  }
  private time (): string {
    return chalk.white(((Date.now() - this.startTime) / 1000).toFixed(1) + 's')
  }
  setLevel (level: LogLevel): void {
    this.level = level;
  }
  zero (): void {
    this.startTime = Date.now()
  }
  debug (...args: any[]): void {
    if (this.level <= 1) {
      let color: ColorRange = 'white';
      if (['white', 'blue', 'yellow', 'red'].indexOf(args[0]) !== -1) {
        color = args.shift();
      }
      args.unshift('debug >>> ');
      this.output('_log', color, ...args)
    }
  }
  log (...args: any[]): void {
    if (this.level <= 2) {
      this.output('_log', 'blue', ...args)
    }
  }
  warn (...args: any[]): void {
    if (this.level <= 3) {
      this.output('_warn', 'yellow', ...args)
    }
  }
  error (...args: any[]): void {
    this.output('_error', 'red', ...args)
    this.spinner && this.spinner.stop()
  }
  done (): void {
    this.spinner && this.spinner.succeed([chalk.blue(`[${this.title}]`), this.time()].join(' '))
  }
  start (title: string, manual = false): void {
    if (this.spinner && !manual) this.done()
    this.title = title
    this.spinner = ora({ text: chalk.blue(`[${title}]`), stream: process.stdout }).start()
  }
}
const log = new Log()

console.log = function (...args: string[]): void {
  log.log(...args)
}
console.warn = function (...args: string[]): void {
  log.warn(...args)
}
console.error = function (...args: string[]): void {
  log.error(...args)
}

export default log
