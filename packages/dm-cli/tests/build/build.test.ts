// build需要引用目标路径，否则会找不到loader
import { build, IOpts } from '../../dist/index'
import { MockLog, mockApp } from '../__mocks__';
import { exec } from 'child_process'
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import * as utils from '../utils';
import log from '../../dist/common/log';

const execPromise = util.promisify(exec);

jest.mock('../../dist/common/log');

const mockLog = new MockLog(log as any);
const appDir = mockApp.path;

describe('build', () => {
  let opts: IOpts = { action: 'build' };
  beforeEach(() => {
    // 重置opt
    opts = { action: 'build' };
  })

  beforeAll(() => {
    utils.delDirSync(path.resolve(appDir, '../dist'))
  })

  describe('异常检测', () => {
    // test('非小程序目录', async () => {
    //   process.exit = jest.fn() as never;

    //   await build(opts);
    //   expect((process.exit as unknown as jest.Mock).mock.calls[0][0]).toBe(1);
    //   expect(mockLog.collection().toMatchOnce(/有找到app.js或app.json文件/)).toBeTruthy();
    // })
  })

  describe('常规检测', () => {
    beforeEach(() => {
      opts.cwd = appDir
    })

    test('普通编译', async () => {
      mockLog._log.log(appDir);
      const dist = path.resolve(appDir, '../dist/dm-build');
      opts.output = {
        build: dist
      };
      await build(opts);

      // 检查目录
      expect(fs.existsSync(dist)).toBeTruthy();

      // 检查页面
      expect(fs.existsSync(path.resolve(dist, 'pages/index/index.js'))).toBeTruthy();
      expect(fs.existsSync(path.resolve(dist, 'pages/sub1/index/index.js'))).toBeTruthy();

      // 检查多app编译
      expect(fs.readFileSync(path.resolve(dist, 'app.js'), 'utf8').includes('《小程序A》')).toBeTruthy();
      expect(fs.readFileSync(path.resolve(dist, 'app.js'), 'utf8').includes('《小程序B》')).toBeFalsy();

      // 检查条件编译
      expect(fs.readFileSync(path.resolve(dist, 'app.wxss'), 'utf8').includes('.xcxa')).toBeTruthy();
      expect(fs.readFileSync(path.resolve(dist, 'app.wxss'), 'utf8').includes('.xcxb')).toBeFalsy();
      expect(fs.readFileSync(path.resolve(dist, 'app.wxss'), 'utf8').includes('.h5')).toBeFalsy();

      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.wxml'), 'utf8').includes('《小程序A》')).toBeTruthy();
      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.wxml'), 'utf8').includes('《小程序B》')).toBeFalsy();
      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.wxml'), 'utf8').includes('h5')).toBeFalsy();

      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.js'), 'utf8').includes('《小程序A》')).toBeTruthy();
      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.js'), 'utf8').includes('《小程序B》')).toBeFalsy();
      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.js'), 'utf8').includes('《h5》')).toBeFalsy();

      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.json'), 'utf8').includes('nav-bar-a/index')).toBeTruthy();
      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.json'), 'utf8').includes('nav-bar-b/index')).toBeFalsy();
    })

    test('单页抽取', async () => {
      mockLog._log.log(appDir);
      const dist = path.resolve(appDir, '../dist/dm-build-sin');

      // await build(opts); //  多次调用 ctx无法更新
      await execPromise(`node "${path.resolve(__dirname, '../../bin/dm-build')}" -p "pages/index/index" -d "${dist}" --cwd "${appDir}"`);
      // 检查目录
      expect(fs.existsSync(dist)).toBeTruthy();

      // 检查页面
      expect(fs.existsSync(path.resolve(dist, 'pages/index/index.js'))).toBeTruthy();
      expect(fs.existsSync(path.resolve(dist, 'pages/sub1'))).toBeFalsy();
      expect(fs.existsSync(path.resolve(dist, 'pages/sub2'))).toBeFalsy();
      expect(fs.existsSync(path.resolve(dist, 'pages/sub3'))).toBeFalsy();
      expect(fs.existsSync(path.resolve(dist, 'pages/sub-b'))).toBeFalsy();
    })

    test('-a b -t h5', async () => {
      mockLog._log.log(appDir);
      let dist = path.resolve(appDir, '../dist/dm-build-app');

      // await build(opts);
      await execPromise(`node "${path.resolve(__dirname, '../../bin/dm-build')}" -a b -t h5 -d "${dist}" --cwd "${appDir}"`);

      dist = path.resolve(appDir, '../dist/dm-build-app-b')
      // 检查目录
      expect(fs.existsSync(dist)).toBeTruthy();

      // 检查页面
      expect(fs.existsSync(path.resolve(dist, 'pages/index/index.js'))).toBeTruthy();
      expect(fs.existsSync(path.resolve(dist, 'pages/sub-b'))).toBeTruthy();
      expect(fs.existsSync(path.resolve(dist, 'pages/sub1'))).toBeFalsy()
      expect(fs.existsSync(path.resolve(dist, 'pages/sub2'))).toBeFalsy()
      expect(fs.existsSync(path.resolve(dist, 'pages/sub3'))).toBeFalsy()

      // 检查多app编译
      expect(fs.readFileSync(path.resolve(dist, 'app.js'), 'utf8').includes('《小程序B》')).toBeTruthy();
      expect(fs.readFileSync(path.resolve(dist, 'app.js'), 'utf8').includes('《小程序A》')).toBeFalsy();

      // 检查条件编译
      expect(fs.readFileSync(path.resolve(dist, 'app.wxss'), 'utf8').includes('.xcxb')).toBeTruthy();
      expect(fs.readFileSync(path.resolve(dist, 'app.wxss'), 'utf8').includes('.xcxa')).toBeFalsy();
      expect(fs.readFileSync(path.resolve(dist, 'app.wxss'), 'utf8').includes('.h5')).toBeTruthy();

      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.wxml'), 'utf8').includes('《小程序B》')).toBeTruthy();
      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.wxml'), 'utf8').includes('《小程序A》')).toBeFalsy();
      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.wxml'), 'utf8').includes('《h5》')).toBeTruthy();

      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.js'), 'utf8').includes('《小程序B》')).toBeTruthy();
      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.js'), 'utf8').includes('《小程序A》')).toBeFalsy();
      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.js'), 'utf8').includes('《h5》')).toBeTruthy();

      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.json'), 'utf8').includes('nav-bar-b/index')).toBeTruthy();
      expect(fs.readFileSync(path.resolve(dist, 'pages/index/index.json'), 'utf8').includes('nav-bar-a/index')).toBeFalsy();
    })
  })
})
