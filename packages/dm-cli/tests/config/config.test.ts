/* eslint-disable @typescript-eslint/no-var-requires */
import chalk from 'chalk';
import * as fs from 'fs';
import { config, homeConfigPath, errMsg } from '../../dist/index';

// 前置 mock
jest.mock('../../dist/common/log');

let configJSONBak: any;

beforeAll(() => {
  if (fs.existsSync(homeConfigPath)) {
    configJSONBak = require(homeConfigPath);
  }
});

afterAll(() => {
  if (configJSONBak) {
    fs.writeFileSync(homeConfigPath, JSON.stringify(configJSONBak, null, 2));
  }
});

describe('正常测试', () => {
  test('dm config set', () => {
    const args = ['set', 'wxcli', '/path/to/cli'];
    const msg = config(args);
    const rcJSON = require(homeConfigPath);
    expect(rcJSON.wxcli).toBe('/path/to/cli');
    expect(msg).toBe(chalk.green(`设置成功：wxcli=/path/to/cli`));
  })

  test('dm config get', () => {
    const args = ['get', 'wxcli'];
    const msg = config(args);
    const rcJSON = require(homeConfigPath);
    expect(rcJSON.wxcli).toBe(msg);
  })

  test('dm config delete', () => {
    const args = ['delete', 'wxcli'];
    const msg = config(args);
    const rcJSON = require(homeConfigPath);
    expect(rcJSON.wxcli).toBe(undefined);
    expect(msg).toBe(chalk.green(`删除key：wxcli`));
  })

  test('dm config list', () => {
    const args = ['list'];
    const msg = config(args);
    const rcJSON = require(homeConfigPath);
    expect(msg).toBe(rcJSON);
  })
})

describe('异常测试', () => {
  test('dm config 没有指定cmd', () => {
    const args: string[] = [];
    const msg = config(args);
    expect(msg).toBe(chalk.red(errMsg));
  })

  test('dm config 指定了一个不存在的cmd', () => {
    const args = ['notexists'];
    const msg = config(args);
    expect(msg).toBe(chalk.red(errMsg));
  })

  test('dm config set 没有指定key', () => {
    const args = ['set'];
    const msg = config(args);
    expect(msg).toBe(chalk.red(errMsg));
  })

  test('dm config set 没有指定value', () => {
    const args = ['set', 'wxcli'];
    const msg = config(args);
    expect(msg).toBe(chalk.red(errMsg));
  })

  test('dm config get 没有指定key', () => {
    const args = ['get'];
    const msg = config(args);
    const rcJSON = require(homeConfigPath);
    expect(msg).toBe(rcJSON);
  })

  test('dm config get 指定了一个不存在的key', () => {
    const args = ['get', 'notexists'];
    const msg = config(args);
    expect(msg).toBe(undefined);
  })

  test('dm config delete 没有指定key', () => {
    const args = ['delete'];
    const msg = config(args);
    expect(msg).toBe(chalk.red(errMsg));
  })
})
