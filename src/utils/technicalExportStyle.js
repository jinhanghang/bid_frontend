export const exportFonts = ['宋体', '仿宋', '黑体', '楷体', '微软雅黑', 'Arial', 'Times New Roman']
export const exportSizes = [
  ['一号', 26], ['小一', 24], ['二号', 22], ['小二', 18], ['三号', 16], ['小三', 15],
  ['四号', 14], ['小四', 12], ['五号', 10.5], ['小五', 9], ['六号', 7.5]
]
export const alignments = [{ value: 'left', label: '左对齐' }, { value: 'center', label: '居中' }, { value: 'right', label: '右对齐' }, { value: 'justify', label: '两端对齐' }]
export const numberingKinds = [
  { value: 'arabic', label: '阿拉伯数字' }, { value: 'chapter', label: '第一章' },
  { value: 'section', label: '第一节' }, { value: 'chinese', label: '一、' }, { value: 'parenthesized', label: '（一）' }
]
const clone = value => JSON.parse(JSON.stringify(value || {}))
const valueOf = (rules, key) => rules?.[key]?.value
const flag = value => typeof value === 'boolean' ? value : Boolean(value?.enabled)

function font(value = {}) {
  return {
    name: value.name || '',
    sizePt: value.sizePt || exportSizes.find(([name]) => name === value.sizeName)?.[1] || null,
    bold: Boolean(value.bold), italic: Boolean(value.italic), underline: Boolean(value.underline),
    color: '#' + String(value.color || '000000').replace('#', '')
  }
}

function fontRule(form) {
  return { name: form.name, sizePt: form.sizePt, bold: form.bold, italic: form.italic,
    underline: form.underline, plain: !form.bold && !form.italic && !form.underline, color: form.color.replace('#', '') }
}

export function readExportStyle(rules = {}) {
  const body = font(valueOf(rules, 'bodyFont'))
  const paragraph = clone(valueOf(rules, 'paragraph'))
  const quote = rules.paragraph?.quote || ''
  if (!paragraph.alignment) {
    if (quote.includes('左对齐')) paragraph.alignment = 'left'
    else if (quote.includes('两端对齐')) paragraph.alignment = 'justify'
    else if (quote.includes('居中')) paragraph.alignment = 'center'
  }
  if (quote.includes('不得有空格') && paragraph.removeSpaces == null) paragraph.removeSpaces = true
  if ((quote.includes('不设置空行') || quote.includes('不得有空行')) && paragraph.allowEmptyParagraphs == null) paragraph.allowEmptyParagraphs = false
  const headingBase = valueOf(rules, 'headingFont') || valueOf(rules, 'bodyFont') || {}
  const headingStyles = valueOf(rules, 'headingStyles') || []
  const numbering = valueOf(rules, 'numbering') || {}
  const levels = numbering.levels || []
  const paper = valueOf(rules, 'paper')
  return {
    paper: typeof paper === 'string' ? paper : paper?.size || '',
    orientation: paper?.orientation || 'portrait',
    margins: { topCm: null, bottomCm: null, leftCm: null, rightCm: null, ...clone(valueOf(rules, 'margins')) },
    body,
    paragraph: {
      alignment: paragraph.alignment || '', firstLineChars: paragraph.firstLineChars ?? null,
      lineType: paragraph.lineSpacingPt ? 'fixed' : 'multiple',
      lineValue: paragraph.lineSpacingPt || paragraph.lineSpacingMultiple || null,
      beforePt: paragraph.beforePt ?? 0, afterPt: paragraph.afterPt ?? 0,
      removeSpaces: Boolean(paragraph.removeSpaces), allowEmptyParagraphs: paragraph.allowEmptyParagraphs !== false
    },
    headings: Array.from({ length: 9 }, (_, index) => ({
      ...font({ ...headingBase, ...headingStyles[index] }),
      firstLineChars: headingStyles[index]?.firstLineChars ?? paragraph.firstLineChars ?? 0,
      alignment: headingStyles[index]?.alignment || paragraph.alignment || 'left',
      wordHeadingLevel: headingStyles[index]?.wordHeadingLevel || index + 1,
      lineType: headingStyles[index]?.lineSpacingPt ? 'fixed' : headingStyles[index]?.lineSpacingMultiple ? 'multiple' : paragraph.lineSpacingPt ? 'fixed' : 'multiple',
      lineValue: headingStyles[index]?.lineSpacingPt || headingStyles[index]?.lineSpacingMultiple || paragraph.lineSpacingPt || paragraph.lineSpacingMultiple || null,
      beforePt: headingStyles[index]?.beforePt ?? paragraph.beforePt ?? 0,
      afterPt: headingStyles[index]?.afterPt ?? paragraph.afterPt ?? 0,
      kind: levels[index]?.kind === 'chinese'
        ? (levels[index]?.format?.includes('章') ? 'chapter' : levels[index]?.format?.includes('节') ? 'section' : levels[index]?.format?.includes('（') ? 'parenthesized' : 'chinese') : 'arabic',
      format: levels[index]?.format || numbering.formats?.[index] || Array.from({ length: index + 1 }, (_, i) => '%' + (i + 1)).join('.'),
      start: levels[index]?.start || 1
    })),
    numbering: !numbering.disabled && Boolean(numbering.numeric || typeof numbering === 'string' && numbering.trim() || numbering.levels?.length),
    table: font(valueOf(rules, 'tableFont') || valueOf(rules, 'bodyFont')),
    tableAlignment: valueOf(rules, 'tableParagraph')?.alignment || paragraph.alignment || 'left',
    colorMode: valueOf(rules, 'color')?.blackOnly ? valueOf(rules, 'color')?.mode || 'grayscale' : 'color',
    headers: flag(valueOf(rules, 'headers')), headerText: valueOf(rules, 'headers')?.text || '',
    footers: flag(valueOf(rules, 'footers')), footerText: valueOf(rules, 'footers')?.text || '',
    pageNumbers: flag(valueOf(rules, 'pageNumbers')),
    cover: flag(valueOf(rules, 'cover')), tableOfContents: flag(valueOf(rules, 'tableOfContents')),
    chapterPageBreak: flag(valueOf(rules, 'chapterPageBreak')),
    blankPages: valueOf(rules, 'blankPages') !== false,
    maxPages: valueOf(rules, 'pageLimit')?.maxPages || null
  }
}

export function validateExportStyle(form) {
  if (!form.paper) return '请选择纸张规格'
  if (Object.values(form.margins).some(value => value == null || !Number.isFinite(Number(value)))) return '请填写四个页边距'
  if (!form.body.name || !form.body.sizePt) return '请选择正文字体和字号'
  if (!form.paragraph.alignment || form.paragraph.firstLineChars == null || !form.paragraph.lineValue) return '请补齐正文对齐、首行缩进和行距'
  if (form.headings.some(heading => !heading.name || !heading.sizePt || !heading.lineValue)) return '请补齐各级标题的字体、字号和行距'
  if (!form.table.name || !form.table.sizePt) return '请补齐表格字体和字号'
  return ''
}

export function writeExportStyle(form, original = {}) {
  const rules = clone(original)
  const set = (key, value) => { rules[key] = { ...rules[key], value } }
  delete rules.conflicts
  set('paper', { size: form.paper, orientation: form.orientation })
  set('margins', { ...form.margins })
  const normalizeFont = source => fontRule({ ...source, color: form.colorMode === 'color' ? source.color : '#000000' })
  set('bodyFont', normalizeFont(form.body))
  const paragraph = {
    alignment: form.paragraph.alignment, firstLineChars: form.paragraph.firstLineChars,
    beforePt: form.paragraph.beforePt, afterPt: form.paragraph.afterPt,
    removeSpaces: form.paragraph.removeSpaces, allowEmptyParagraphs: form.paragraph.allowEmptyParagraphs
  }
  paragraph[form.paragraph.lineType === 'fixed' ? 'lineSpacingPt' : 'lineSpacingMultiple'] = form.paragraph.lineValue
  set('paragraph', paragraph)
  set('headingStyles', form.headings.map((heading, index) => ({
    ...clone(valueOf(original, 'headingStyles')?.[index]),
    ...normalizeFont(heading), firstLineChars: heading.firstLineChars,
    alignment: heading.alignment, wordHeadingLevel: heading.wordHeadingLevel,
    beforePt: heading.beforePt, afterPt: heading.afterPt,
    lineSpacingPt: heading.lineType === 'fixed' ? heading.lineValue : undefined,
    lineSpacingMultiple: heading.lineType === 'multiple' ? heading.lineValue : undefined
  })))
  if (form.numbering) {
    set('numbering', {
      numeric: true,
      formats: form.headings.map(heading => heading.format),
      levels: form.headings.map(heading => ({ kind: heading.kind === 'arabic' ? 'arabic' : 'chinese', format: heading.format, start: heading.start }))
    })
  } else {
    set('numbering', { numeric: false, disabled: true })
  }
  set('tableFont', normalizeFont(form.table))
  set('tableParagraph', { ...clone(valueOf(original, 'tableParagraph')), alignment: form.tableAlignment })
  set('headers', form.headers ? { enabled: true, text: form.headerText } : false)
  set('footers', form.footers ? { enabled: true, text: form.footerText } : false)
  for (const key of ['pageNumbers', 'cover', 'tableOfContents', 'chapterPageBreak', 'blankPages']) set(key, form[key])
  set('pageLimit', { maxPages: form.maxPages || 0, scope: '技术标' })
  set('color', { blackOnly: form.colorMode !== 'color', mode: form.colorMode })
  return rules
}

export function setHeadingKind(heading, index) {
  heading.format = {
    chapter: '第%' + (index + 1) + '章', section: '第%' + (index + 1) + '节',
    chinese: '%' + (index + 1) + '、', parenthesized: '（%' + (index + 1) + '）',
    arabic: Array.from({ length: index + 1 }, (_, i) => '%' + (i + 1)).join('.')
  }[heading.kind]
}

export function commonExportStyle() {
  return readExportStyle({
    paper: { value: { size: 'A4' } }, margins: { value: { topCm: 2.54, bottomCm: 2.54, leftCm: 3.18, rightCm: 3.18 } },
    bodyFont: { value: { name: '宋体', sizePt: 12, plain: true } },
    tableFont: { value: { name: '宋体', sizePt: 10.5, plain: true } },
    headingFont: { value: { name: '宋体', sizePt: 14, bold: true } },
    paragraph: { value: { alignment: 'justify', firstLineChars: 2, lineSpacingMultiple: 1.5, beforePt: 0, afterPt: 0 } },
    numbering: { value: { numeric: true } }, pageNumbers: { value: true }, chapterPageBreak: { value: true }
  })
}

// Defaults are project-independent suggestions, never evidence from the tender.
// Retain explicit false/zero values and the original source/quote metadata.
export function initialExportStyle(rules = {}) {
  const defaults = writeExportStyle(commonExportStyle())
  const merge = (fallback, actual) => {
    if (actual == null || actual === '') return clone(fallback)
    if (Array.isArray(actual) || typeof actual !== 'object') return actual
    const result = clone(fallback)
    for (const [key, value] of Object.entries(actual)) {
      result[key] = value == null || value === '' ? result[key] :
        (typeof value === 'object' && !Array.isArray(value) ? merge(result[key] || {}, value) : value)
    }
    return result
  }
  const resolved = merge(defaults, rules)
  // A fixed line height and a multiplier are mutually exclusive.
  if (valueOf(rules, 'paragraph')?.lineSpacingPt) delete resolved.paragraph.value.lineSpacingMultiple
  // Infer alignment and spacing restrictions from the original quote before filling gaps.
  const sourceForm = readExportStyle(rules)
  if (sourceForm.paragraph.alignment) resolved.paragraph.value.alignment = sourceForm.paragraph.alignment
  if (rules.paragraph?.quote?.includes('不得有空格')) resolved.paragraph.value.removeSpaces = true
  if (/不设置空行|不得有空行/.test(rules.paragraph?.quote || '')) resolved.paragraph.value.allowEmptyParagraphs = false
  // Do not mask a parsed Chinese size with the default numeric size.
  for (const key of ['bodyFont', 'headingFont', 'tableFont']) {
    const actual = valueOf(rules, key)
    if (actual?.sizeName && !actual.sizePt && resolved[key]?.value) delete resolved[key].value.sizePt
  }
  // Parsed common heading/body rules must also apply to levels without an override.
  {
    const inherited = { ...resolved.bodyFont.value, ...(rules.bodyFont?.value ? {} : { name: '宋体', sizePt: 14, bold: true }), ...valueOf(rules, 'headingFont') }
    resolved.headingStyles.value = Array.from({ length: 9 }, (_, index) => ({
      ...inherited,
      alignment: resolved.paragraph.value.alignment,
      firstLineChars: resolved.paragraph.value.firstLineChars,
      beforePt: resolved.paragraph.value.beforePt,
      afterPt: resolved.paragraph.value.afterPt,
      ...(resolved.paragraph.value.lineSpacingPt
        ? { lineSpacingPt: resolved.paragraph.value.lineSpacingPt }
        : { lineSpacingMultiple: resolved.paragraph.value.lineSpacingMultiple }),
      ...(valueOf(rules, 'headingStyles')?.[index] || {})
    }))
  }
  for (const [index, heading] of resolved.headingStyles.value.entries()) {
    const override = valueOf(rules, 'headingStyles')?.[index]
    if (override?.lineSpacingMultiple && !override.lineSpacingPt) delete heading.lineSpacingPt
    if (heading.lineSpacingPt) delete heading.lineSpacingMultiple
    if (heading.sizeName) {
      const size = exportSizes.find(([name]) => name === heading.sizeName)?.[1]
      if (size) heading.sizePt = size
    }
  }
  return readExportStyle(resolved)
}
