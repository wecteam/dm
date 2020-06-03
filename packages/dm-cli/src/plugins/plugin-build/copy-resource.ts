import { IContext } from '../../interfaces';
import gulp = require('gulp')

/** 拷贝图片等一些不能通过依赖分析获取的文件 */
export async function copyResource (ctx: IContext): Promise<void> {
  const log = ctx.log;
  const cwd = ctx.cwd;
  const distPath = ctx.dist
  // 图片资源需要手动拷贝，无法做依赖分析
  const copyImg = (): NodeJS.ReadWriteStream => {
    return gulp.src([`${cwd}/**/*.{png,jpg,gif}`, `!${cwd}/node_modules/**`])
      .pipe(gulp.dest(distPath))
      .on('end', function () {
        log.log('图片拷贝完成');
      });
  }

  // 需要额外打包的目录
  const copyInclude = (): NodeJS.ReadWriteStream | Promise<void> => {
    const include = ctx.opts.include;
    log.debug('include:', `${cwd}/${include}`);
    if (include) {
      return gulp.src([`${cwd}/${include}`], { base: cwd })
        .pipe(gulp.dest(distPath))
        .on('end', function () {
          log.log(include, '拷贝完成')
        });
    } else {
      return Promise.resolve()
    }
  }

  return new Promise((resolve) => {
    gulp.parallel(copyImg, copyInclude)(() => {
      resolve();
    })
  })
}
