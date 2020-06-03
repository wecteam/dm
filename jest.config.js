// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  testEnvironment: 'node', /* 测试环境 */
  clearMocks: true,
  moduleFileExtensions: ['js', 'jsx', 'ts'], /* 文件扩展名 */
  transform: {
    '.ts': 'ts-jest' /* ts转换 */
  },
  testPathIgnorePatterns: ['\\unpass\\.test\\.js$'], /* 忽略文件 */
  collectCoverage: true, /* 执行覆盖率统计 */
  coverageDirectory: 'coverage', /* 覆盖率报告生成目录 */
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'] /* 覆盖率统计忽略目录 */
};
