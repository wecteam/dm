import { IContext } from '@wecteam/dm-cli';
import uglify from 'gulp-uglify-es';
import stripComments = require('gulp-strip-comments')
import imagemin = require('gulp-imagemin')

/** 压缩js、wxml、图片 */
export async function minify (ctx: IContext): Promise<void> {
  const gulp = ctx.gulp;
  const log = ctx.log
  log.start('压缩');
  const distPath = ctx.dist;
  const minifyJs = (): NodeJS.ReadWriteStream => {
    return gulp.src(`${distPath}/**/*.js`)
      .pipe(uglify({
        compress: false,
        mangle: false
      }))
      .pipe(gulp.dest(file => file.base))
      .on('end', () => {
        ctx.log.log('js压缩完成')
      })
  }
  const minifyImage = (): NodeJS.ReadWriteStream => {
    return gulp.src(`${distPath}/**/*{.png,.jpg,.gif}`)
      .pipe(imagemin())
      .pipe(gulp.dest(file => file.base))
      .on('end', () => {
        log.log('图片压缩完成')
      })
  }
  const minifyWxml = (): NodeJS.ReadWriteStream => {
    return gulp.src(`${distPath}/**/*.wxml`)
      .pipe(stripComments())
      .pipe(gulp.dest(file => file.base))
      .on('end', () => {
        log.log('wxml压缩完成')
      })
  }
  return new Promise((resolve) => {
    gulp.parallel(minifyJs, minifyImage, minifyWxml)(() => {
      resolve();
    })
  })
}
