/**
 * MockApp 类
 * 包括 mock-app 的一些配置和操作方法
 */
import * as md5 from 'md5';
import * as path from 'path';
import * as fs from 'fs';

class MockApp {
  // mock app 项目路径
  path: string = path.resolve(__dirname, '../__mocks__/app');

  // 垃圾桶路径，存放一些测试过程中临时删除的文件
  _trash: string = path.resolve(this.path, '../.trash');

  /**
   * 丢弃文件
   * @param {string[]} files 要丢弃的文件列表，绝对路径
   */
  dropfiles (files: string[]): void {
    files.forEach((file: string) => {
      const trashFile = path.resolve(this._trash, md5(file));
      if (fs.existsSync(file) && !fs.existsSync(trashFile)) {
        fs.renameSync(file, trashFile);
      }
    });
  }

  /**
   * 恢复文件
   * @param {string[]} files 要恢复的文件列表，绝对路径
   */
  resumefiles (files: string[]): void {
    files.forEach((file: string) => {
      const trashFile = path.resolve(this._trash, md5(file));
      if (fs.existsSync(trashFile) && !fs.existsSync(file)) {
        fs.renameSync(trashFile, file);
      }
    });
  }

  /**
   * 对 mock app 的绝对路径作虚掩
   * @param {string} content
   */
  fakeBase (content: string): string {
    return content.replace(new RegExp(path.resolve(this.path, '../../../../'), 'g'), `{root}`);
  }
}

export default new MockApp();
