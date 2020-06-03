/**
 * 测试公用的一些工具方法
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * 删除目录（包括内容）
 * @param {string} dirname 目录路径
 */
function delDirSync (dirname: string): void {
  let files = [];
  if (fs.existsSync(dirname)) {
    files = fs.readdirSync(dirname);
    files.forEach((file) => {
      const curPath = path.resolve(dirname, file);
      if (fs.statSync(curPath).isDirectory()) {
        delDirSync(curPath); // 递归删除文件夹
      } else {
        fs.unlinkSync(curPath); // 删除文件
      }
    });
    fs.rmdirSync(dirname);
  }
}

/**
 * 将目录内容打成一个快照
 * @param {string} dirname 目录的绝对路径
 */
function readDir2snapshot (dirname: string): string {
  const snapshot: string[] = [];

  function run (prefix: string): void {
    const files = fs.readdirSync(path.join(dirname, prefix));

    for (let i = 0; i < files.length; i++) {
      const relativeFilepath = path.join(prefix, files[i]);
      const absoluteFilepath = path.join(dirname, relativeFilepath);
      const stat = fs.statSync(absoluteFilepath);

      if (stat.isFile()) {
        snapshot.push(`## ${absoluteFilepath.slice(absoluteFilepath.indexOf('dm-cli'))} ##`);
        snapshot.push(fs.readFileSync(absoluteFilepath, 'utf-8'));
      }

      if (stat.isDirectory()) {
        run(relativeFilepath);
      }
    }
  }

  run('');

  return snapshot.join('\n');
}

export {
  delDirSync,
  readDir2snapshot
}
