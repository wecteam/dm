import { IOpts } from '../interfaces'
import { Command } from 'commander';
import * as path from 'path';
import log, { LogLevel } from '../common/log';

export function parseOpts (cli: Command): Partial<IOpts> {
  const opts: Partial<IOpts> = cli.opts();

  // version 默认为 function 传参时变为string
  if (typeof opts.version === 'function') {
    opts.version = undefined
  }

  // cli.name 默认为 function 传参时变为string
  if (typeof cli.name === 'function') {
    opts.name = undefined;
  }

  if (opts['output.build']) {
    opts.output = {
      build: path.resolve(opts['output.build'])
    }
    delete opts['output.build']
  } else if (opts['output.audit']) {
    opts.output = {
      build: path.resolve(opts['output.audit'])
    }
    delete opts['output.audit']
  } else if (opts['output.preview']) {
    opts.output = {
      build: path.resolve(opts['output.preview'])
    }
    delete opts['output.preview']
  } else if (opts['output.upload']) {
    opts.output = {
      build: path.resolve(opts['output.upload'])
    }
    delete opts['output.upload']
  }

  for (const key in opts) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    if (typeof opts[key] === 'undefined') delete opts[key];
  }

  if (opts.debug) {
    log.setLevel(LogLevel.debug);
  }

  log.debug('opts:', opts)

  return opts
}
