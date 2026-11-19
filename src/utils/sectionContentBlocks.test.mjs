import test from 'node:test'
import assert from 'node:assert/strict'
import {parseSectionContent,splitTableCells} from './sectionContentBlocks.js'
const text = segments => segments.map(segment => segment.children ? text(segment.children) : segment.text || '').join('')
test('saved technical Markdown becomes one complete table, including empty lines between rows',()=>{
 const source='**表格 9-1 沿河高水位段风险清单与支护控制要点表**\n\n| 区段/对象 | 主要风险表现 | 设计控制动作 | 检查节点 | 交付成果 |\n\n|---|---|---|---|---|\n\n| 严家河左岸管道沟槽 | 河水侧向渗入 | 明确先撑后挖 | 勘察外业验收 | 分区段风险清单 |\n\n| 严家河右岸管道沟槽 | 汛期水位上涨 | 设置防汛封堵 | 检查井复核 | 支护控制要点 |\n\n正文继续。'
 const blocks=parseSectionContent(source),tables=blocks.filter(block=>block.type==='table')
 assert.equal(tables.length,1);assert.equal(tables[0].headers.length,5);assert.equal(tables[0].rows.length,2)
 assert.equal(text(tables[0].rows[1][0]),'严家河右岸管道沟槽')
 assert.equal(blocks.at(-1).type,'text');assert.equal(text(blocks.at(-1).segments),'正文继续。')
 assert.ok(!blocks.some(block=>block.type==='text' && text(block.segments).includes('|---|')))
})
test('tables retain escaped pipes, code pipes, cell alignment and all cell data',()=>{
 assert.deepEqual(splitTableCells('| a\\|b | ``c|d`` |'),['a|b','``c|d``'])
 const table=parseSectionContent('左 | 中 | 右\n:--- | :---: | ---:\n**执行** | `A|B` | 数值\n完整 | 行 | 多出的单元格 | 保留')[0]
 assert.deepEqual(table.alignments.slice(0,3),['left','center','right'])
 assert.equal(table.headers.length,4);assert.equal(text(table.rows[1][3]),'保留')
 assert.equal(table.rows[0][0][0].type,'bold');assert.equal(table.rows[0][1][0].type,'code')
})
test('headings, ordered/nested lists, quotations, fenced code and original image coordinates survive',()=>{
 const blocks=parseSectionContent('### 实施措施\n3. 首项\n   - 检查记录\n4. 次项\n\n> 引用要求\n\n```text\n| 按源码保留 |\n```\n![现场照片](aibid-file://file123?width=420&align=left&imageId=asset123)')
 assert.equal(blocks[0].tag,'h3');assert.equal(blocks[1].type,'list');assert.equal(blocks[1].start,3)
 assert.equal(blocks[1].items.length,2);assert.equal(blocks[1].items[0].children[0].ordered,false)
 assert.equal(blocks.find(block=>block.type==='quote').segments[0].text,'引用要求')
 assert.equal(blocks.find(block=>block.type==='code').text,'| 按源码保留 |')
 const image=blocks.at(-1);assert.equal(image.type,'image');assert.equal(image.fileId,'file123');assert.equal(image.width,'420');assert.equal(image.align,'left');assert.equal(image.lineIndex,10)
})
test('incomplete streaming table stays readable until its divider arrives',()=>{
 const partial=parseSectionContent('| 区段 | 措施 |\n|--')
 assert.equal(partial.some(block=>block.type==='table'),false)
 assert.equal(parseSectionContent('| 区段 | 措施 |\n|---|---|')[0].type,'table')
})
