const scoreGroups = [
  ['DETAIL', '评分明细'],
  ['PRICE', '报价计算规则'],
  ['TIE', '同分排序'],
  ['', '其他评分原文']
]

export function buildHomeResultBlocks(category) {
  if (!category || category.edited || !Array.isArray(category.sources) || !category.sources.length) return []
  // 展示的来源必须与当前内容一致，避免旧来源覆盖人工修改或其他版本的结果。
  if (category.sources.map(source => source.text).join('\n\n') !== category.content) return []

  if (category.code === 'SCORE' && category.sources.some(source => source.scoreKind)) {
    return scoreGroups.flatMap(([kind, title]) => {
      const sources = category.sources.filter(source => kind
        ? source.scoreKind === kind
        : !scoreGroups.some(([known]) => known && known === source.scoreKind))
      return sources.length ? [{ kind: 'heading', title }, ...buildSourceBlocks(sources, kind === 'DETAIL')] : []
    })
  }
  const blocks = buildSourceBlocks(category.sources)
  return blocks.some(block => block.kind === 'sourceTable') ? blocks : []
}

function scoreDetail(cells) {
  if (!Array.isArray(cells) || cells.length < 2) return null
  const criteria = cells.at(-1)?.trim()
  const label = cells.at(-2)?.trim()
  if (!criteria || !label) return null
  const match = label.match(/^(.+?)\s*[（(]\s*(?:满分|最高)\s*(\d+(?:\.\d+)?)\s*分\s*[）)]$/u)
  if (!match) return null
  const rules = criteria.split(/(?=第[一二三四五六七八九十\d]+档\s*[：:])/u).map(rule => rule.trim()).filter(Boolean)
  return { title: match[1].trim(), points: match[2], rules }
}

function buildSourceBlocks(sources, scoringDetails = false) {
  const blocks = []
  for (const source of sources) {
    const cells = source.tableCells
    const detail = scoringDetails ? scoreDetail(cells) : null
    if (detail) {
      if (blocks.at(-1)?.kind !== 'scoreDetails') blocks.push({ kind: 'scoreDetails', items: [] })
      blocks.at(-1).items.push(detail)
      continue
    }
    const isTable = Array.isArray(cells) && cells.length > 1 && cells.every(cell => typeof cell === 'string')
    const kind = isTable ? 'sourceTable' : 'text'
    const previous = blocks.at(-1)
    if (previous?.kind !== kind || (isTable
        && (previous.blockIndex !== source.blockIndex || previous.columns.length !== cells.length))) {
      blocks.push({
        kind,
        blockIndex: source.blockIndex,
        columns: isTable ? cells.map((_, index) => `原文第 ${index + 1} 列`) : undefined,
        items: []
      })
    }
    blocks.at(-1).items.push(isTable ? cells : source.text)
  }
  return blocks
}
