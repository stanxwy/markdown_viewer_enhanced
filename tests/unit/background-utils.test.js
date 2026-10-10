/**
 * 单元测试：background.js 工具函数
 * 覆盖：isMarkdownUrl, isTextContentType, DEFAULT_SETTINGS
 */

const {
  DEFAULT_SETTINGS,
  isMarkdownUrl,
  isTextContentType,
  parseDirListing,
  normalizeDirUrl,
} = require('../../background.js');

// =====================================================
//  BT-background.1 isMarkdownUrl 函数测试
// =====================================================
describe('BT-background.1 isMarkdownUrl', () => {
  test('1.1 识别 .md 文件', () => {
    expect(isMarkdownUrl('file:///C:/docs/readme.md')).toBe(true);
  });

  test('1.2 识别 .markdown 文件', () => {
    expect(isMarkdownUrl('file:///docs/test.markdown')).toBe(true);
  });

  test('1.3 识别 .mdc 文件', () => {
    expect(isMarkdownUrl('file:///docs/test.mdc')).toBe(true);
  });

  test('1.4 识别 HTTP 协议的 .md', () => {
    expect(isMarkdownUrl('https://example.com/readme.md')).toBe(true);
  });

  test('1.5 识别带查询参数的 .md', () => {
    expect(isMarkdownUrl('https://example.com/readme.md?v=1')).toBe(true);
  });

  test('1.6 排除 .html 文件', () => {
    expect(isMarkdownUrl('https://example.com/index.html')).toBe(false);
  });

  test('1.7 排除 .js 文件', () => {
    expect(isMarkdownUrl('https://example.com/app.js')).toBe(false);
  });

  test('1.8 空 URL 返回 false', () => {
    expect(isMarkdownUrl('')).toBe(false);
  });

  test('1.9 null 返回 false', () => {
    expect(isMarkdownUrl(null)).toBe(false);
  });

  test('1.10 undefined 返回 false', () => {
    expect(isMarkdownUrl(undefined)).toBe(false);
  });

  test('1.11 大小写不敏感', () => {
    expect(isMarkdownUrl('file:///test.MD')).toBe(true);
    expect(isMarkdownUrl('file:///test.Markdown')).toBe(true);
  });
});

// =====================================================
//  BT-background.2 isTextContentType 函数测试
// =====================================================
describe('BT-background.2 isTextContentType', () => {
  test('2.1 识别 text/plain', () => {
    expect(isTextContentType('text/plain')).toBe(true);
  });

  test('2.2 识别 text/markdown', () => {
    expect(isTextContentType('text/markdown')).toBe(true);
  });

  test('2.3 识别 text/x-markdown', () => {
    expect(isTextContentType('text/x-markdown')).toBe(true);
  });

  test('2.4 排除 text/html', () => {
    expect(isTextContentType('text/html')).toBe(false);
  });

  test('2.5 排除 application/json', () => {
    expect(isTextContentType('application/json')).toBe(false);
  });

  test('2.6 null 返回 false', () => {
    expect(isTextContentType(null)).toBe(false);
  });

  test('2.7 空字符串返回 false', () => {
    expect(isTextContentType('')).toBe(false);
  });
});

// =====================================================
//  BT-background.3 DEFAULT_SETTINGS 完整性测试
// =====================================================
describe('BT-background.3 DEFAULT_SETTINGS', () => {
  test('3.1 包含所有必需设置项', () => {
    const requiredKeys = [
      'theme', 'codeTheme', 'fontSize', 'lineHeight',
      'showToc', 'tocPosition', 'enableMermaid', 'enableMathJax',
      'autoDetect', 'maxWidth', 'fontFamily', 'showLineNumbers',
    ];
    requiredKeys.forEach(key => {
      expect(DEFAULT_SETTINGS).toHaveProperty(key);
    });
  });

  test('3.2 与 content.js 的 DEFAULT_SETTINGS 一致', () => {
    const contentModule = require('../../content/content.js');
    // 两个模块的默认设置应该一致
    expect(DEFAULT_SETTINGS.theme).toBe(contentModule.DEFAULT_SETTINGS.theme);
    expect(DEFAULT_SETTINGS.fontSize).toBe(contentModule.DEFAULT_SETTINGS.fontSize);
    expect(DEFAULT_SETTINGS.enableMermaid).toBe(contentModule.DEFAULT_SETTINGS.enableMermaid);
    expect(DEFAULT_SETTINGS.showToc).toBe(contentModule.DEFAULT_SETTINGS.showToc);
  });
});

// =====================================================
//  BT-background.4 parseDirListing 函数测试
//  样本取自 Chrome 154 实际返回的 file:// 目录索引页（已实测抓取）
// =====================================================
describe('BT-background.4 parseDirListing', () => {
  const REAL_LISTING = [
    '<!DOCTYPE html>',
    '<html dir="ltr" lang="en">',
    '<script>function addRow(name, url, isdir, size, sizeStr, mtime, mtimeStr) {}</script>',
    '<script>addRow("sub","sub",1,0,"0 B",1791609372,"10/10/26, 1:16:12 PM");</script>',
    '<script>addRow("a.md","a.md",0,9,"9 B",1791609372,"10/10/26, 1:16:12 PM");</script>',
    '<script>addRow("b.md","b.md",0,3,"3 B",1791609372,"10/10/26, 1:16:12 PM");</script>',
    '<script>addRow("readme.txt","readme.txt",0,5,"5 B",1791609372,"10/10/26, 1:16:12 PM");</script>',
    '<script>addRow("中文 文档.md","%E4%B8%AD%E6%96%87%20%E6%96%87%E6%A1%A3.md",0,3,"3 B",1791609372,"10/10/26, 1:16:12 PM");</script>',
    '</html>',
  ].join('\n');

  test('4.1 解析出全部条目', () => {
    expect(parseDirListing(REAL_LISTING)).toHaveLength(5);
  });

  test('4.2 区分子目录与文件', () => {
    const entries = parseDirListing(REAL_LISTING);
    expect(entries[0]).toEqual({ name: 'sub', href: 'sub', isDir: true, size: 0 });
    expect(entries[1].isDir).toBe(false);
  });

  test('4.3 中文文件名按 URL 编码解码', () => {
    const entries = parseDirListing(REAL_LISTING);
    expect(entries[4].name).toBe('中文 文档.md');
  });

  test('4.4 保留原始 URL 编码的 href（用于拼访问 URL）', () => {
    const entries = parseDirListing(REAL_LISTING);
    expect(entries[4].href).toBe('%E4%B8%AD%E6%96%87%20%E6%96%87%E6%A1%A3.md');
  });

  test('4.5 解析文件大小', () => {
    const entries = parseDirListing(REAL_LISTING);
    expect(entries[1].size).toBe(9);
  });

  test('4.6 空输入返回空数组', () => {
    expect(parseDirListing('')).toEqual([]);
    expect(parseDirListing(null)).toEqual([]);
  });

  test('4.7 索引页格式变化（无 addRow 行）时返回空数组', () => {
    expect(parseDirListing('<html><body>new format</body></html>')).toEqual([]);
  });
});

// =====================================================
//  BT-background.5 normalizeDirUrl 函数测试
// =====================================================
describe('BT-background.5 normalizeDirUrl', () => {
  test('5.1 补齐结尾斜杠', () => {
    expect(normalizeDirUrl('file:///D:/docs')).toBe('file:///D:/docs/');
  });

  test('5.2 已有结尾斜杠时保持不变', () => {
    expect(normalizeDirUrl('file:///D:/docs/')).toBe('file:///D:/docs/');
  });

  test('5.3 去掉查询串与 hash', () => {
    expect(normalizeDirUrl('file:///D:/docs?v=1#top')).toBe('file:///D:/docs/');
  });

  test('5.4 非 file:// 协议返回空串', () => {
    expect(normalizeDirUrl('https://example.com/docs')).toBe('');
  });

  test('5.5 空值返回空串', () => {
    expect(normalizeDirUrl('')).toBe('');
    expect(normalizeDirUrl(null)).toBe('');
  });
});
