
import { create } from '../../dist/index';
import { Context } from '../../dist/impl/context.impl';
import * as fs from 'fs';
import * as utils from '../utils';
import inquirer = require('inquirer');

// 前置 mock
jest.mock('inquirer');
jest.mock('../../dist/common/log');

process.exit = jest.fn() as never;

/**
 * 清除之前的测试记录
 */
function clearAll (): void {
  utils.delDirSync('./page_base');
  utils.delDirSync('./component_base');
};

describe('dm new', () => {
  // 清除上一次的测试记录
  beforeAll(clearAll);
  afterAll(clearAll);

  describe('错误的执行目录', () => {
    test('新建页面', async () => {
      await create({
        type: 'page',
        name: 'page_base'
      });

      expect((process.exit as unknown as jest.Mock).mock.calls[0][0]).toBe(1);
    });
  });

  describe('正确的执行目录', () => {
    // 新增 app.json，用于标识在小程序环境
    beforeAll(() => {
      fs.writeFileSync('./app.json', '{}', 'utf-8');
    });

    afterAll(() => {
      fs.unlinkSync('./app.json');
    });

    afterEach(() => {
      Context.destoryInstance()
    })

    test('新建页面', async () => {
      await create({
        type: 'page',
        name: 'page_base'
      });

      expect(fs.existsSync('./page_base/page_base.wxss')).toBeTruthy();
      expect(fs.existsSync('./page_base/page_base.js')).toBeTruthy();
      expect(fs.existsSync('./page_base/page_base.json')).toBeTruthy();
      expect(fs.existsSync('./page_base/page_base.wxml')).toBeTruthy();
    });

    test('新建组件', async () => {
      await create({
        type: 'component',
        name: 'component_base'
      });

      expect(fs.existsSync('./component_base/component_base.wxss')).toBeTruthy();
      expect(fs.existsSync('./component_base/component_base.js')).toBeTruthy();
      expect(fs.existsSync('./component_base/component_base.json')).toBeTruthy();
      expect(fs.existsSync('./component_base/component_base.wxml')).toBeTruthy();
    });

    test('没有指定 type 参数', async () => {
      // 模拟 type 参数为 page
      (inquirer.prompt as unknown as jest.Mock).mockImplementationOnce(() => Promise.resolve({ type: 'page' }));

      await create({
        name: 'page_base'
      });

      expect(fs.existsSync('./page_base/page_base.wxss')).toBeTruthy();
      expect(fs.existsSync('./page_base/page_base.js')).toBeTruthy();
      expect(fs.existsSync('./page_base/page_base.json')).toBeTruthy();
      expect(fs.existsSync('./page_base/page_base.wxml')).toBeTruthy();
    });

    test('没有指定页面/组件名称', async () => {
      // 模拟 name 参数为 component_base
      (inquirer.prompt as unknown as jest.Mock).mockImplementationOnce(() => Promise.resolve({ name: 'component_base' }));

      await create({
        type: 'component'
      });

      expect(fs.existsSync('./component_base/component_base.wxss')).toBeTruthy();
      expect(fs.existsSync('./component_base/component_base.js')).toBeTruthy();
      expect(fs.existsSync('./component_base/component_base.json')).toBeTruthy();
      expect(fs.existsSync('./component_base/component_base.wxml')).toBeTruthy();
    });

    test('新建的页面已存在', async () => {
      await create({
        type: 'page',
        name: 'page_base'
      });

      expect((process.exit as unknown as jest.Mock).mock.calls[0][0]).toBe(1);
    });

    test('新建的组件已存在', async () => {
      await create({
        type: 'component',
        name: 'component_base'
      });

      expect((process.exit as unknown as jest.Mock).mock.calls[0][0]).toBe(1);
    });

    test('新建类型错误', async () => {
      await create({
        type: '__component',
        name: 'component_base'
      });

      expect((process.exit as unknown as jest.Mock).mock.calls[0][0]).toBe(1);
    });
  });
});
