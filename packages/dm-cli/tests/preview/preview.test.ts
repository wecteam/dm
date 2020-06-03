import * as cp from 'child_process';
import * as fs from 'fs';
import { IOpts, build, preview } from '../../dist/index';
import { Context } from '../../dist/impl/context.impl';
import log from '../../dist/common/log';
import { mockApp } from '../__mocks__';
import * as utils from '../utils';
import inquirer = require('inquirer');
process.exit = jest.fn() as never;

// 前置 mock
jest.mock('child_process');
jest.mock('inquirer');
jest.mock('../../dist/processes/build');
jest.mock('../../dist/common/log');
process.cwd = jest.fn(() => mockApp.path);

// 命令参数
const opts: IOpts = { action: 'preview' };

// 初始化 context
beforeAll(() => {
  Context.getInstance(opts);
})

afterAll(() => {
  const ctx = Context.getInstance(opts);
  const distPath = ctx.dist;
  // 删除dist目录
  utils.delDirSync(distPath);
})

// 每个用例执行后，终止 log
afterEach(log.done);

describe('dm preview', () => {
  const spawnParams = '';
  beforeEach(() => {
    // mock

    (cp.exec as unknown as jest.Mock).mockImplementationOnce((_1, callback) => callback(null, { stdout: '', stderr: '' }));

    (build as unknown as jest.Mock).mockImplementationOnce(() => {
      const ctx = Context.getInstance(opts);
      const distPath = ctx.dist;
      // 创建dist目录
      if (!fs.existsSync(distPath)) fs.mkdirSync(distPath);

      return Promise.resolve();
    });
  })

  describe('无dist目录', () => {
    beforeEach(() => {
      const ctx = Context.getInstance(opts);
      const distPath = ctx.dist;
      // 删除dist目录
      utils.delDirSync(distPath);
    })

    afterAll(() => {
      mockApp.resumefiles([`${mockApp.path}/project.config.json`]);
    })

    test('源项目已存在 project.config.json 文件', async () => {
      await preview();

      expect(spawnParams).toMatchSnapshot();
    });

    test('源项目无 project.config.json 文件', async () => {
      // 删除工具配置文件
      log.log(fs.existsSync(`${mockApp.path}/project.config.json`));
      mockApp.dropfiles([`${mockApp.path}/project.config.json`]);
      log.log(fs.existsSync(`${mockApp.path}/project.config.json`));

      await preview();

      expect(spawnParams).toMatchSnapshot();
    });
  })

  describe('有dist目录', () => {
    beforeEach(() => {
      const ctx = Context.getInstance(opts);
      const distPath = ctx.dist;
      // 删除dist目录
      if (!fs.existsSync(distPath)) fs.mkdirSync(distPath);
    })

    test('允许重新打包并覆盖原dist目录', async () => {
      // 模拟询问答案 true
      (inquirer.prompt as unknown as jest.Mock).mockImplementationOnce(() => Promise.resolve({ flag: true }));

      await preview();

      expect(spawnParams).toMatchSnapshot();
    });

    test('拒绝重新打包并覆盖原dist目录', async () => {
      // 模拟询问答案 true
      (inquirer.prompt as unknown as jest.Mock).mockImplementationOnce(() => Promise.resolve({ flag: false }));

      await preview();

      expect(spawnParams).toMatchSnapshot();
    });
  });
});
