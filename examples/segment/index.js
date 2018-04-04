'use strict';

const { hook } = require('fc-helper');
// 载入模块
const Segment = require('segment');
// 创建实例
const segment = new Segment();
// 使用默认的识别模块及字典，载入字典文件需要1秒，仅初始化时执行一次即可
segment.useDefault();

exports.doSegment = hook(async function (ctx) {
  const args = JSON.parse(ctx.req.body);

  // 开始分词
  ctx.type = 'application/json';
  ctx.body = segment.doSegment(...args);
});
