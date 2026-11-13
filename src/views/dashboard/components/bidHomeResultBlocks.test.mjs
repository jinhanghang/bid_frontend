import { strict as assert } from 'node:assert'
import { buildHomeResultBlocks } from './bidHomeResultBlocks.js'

const title = '施工方案（暗标）（满分8分）'
const rules = '第一档：措施完整，得6-8分；第二档：措施一般，得3-6（不含）分。'
const source = { text: [title, rules].join('\t'), tableCells: ['2.2.4', '技术部分', title, rules], scoreKind: 'DETAIL' }
const blocks = buildHomeResultBlocks({ code: 'SCORE', content: source.text, sources: [source] })
assert.deepEqual(blocks[1].items[0], {
  title: '施工方案（暗标）', points: '8', rules: ['第一档：措施完整，得6-8分；', '第二档：措施一般，得3-6（不含）分。']
})
