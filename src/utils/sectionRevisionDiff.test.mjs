import test from 'node:test'
import assert from 'node:assert/strict'
import {sectionRevisionDiff} from './sectionRevisionDiff.js'
test('line changes preserve repeated lines and original markdown',()=>{
 const before='段落\n| 项目 | 要求 |\n|---|---|\n| A | 旧 |\n段落'
 const after='段落\n| 项目 | 要求 |\n|---|---|\n| A | 新 |\n段落'
 const rows=sectionRevisionDiff(before,after)
 assert.deepEqual(rows.filter(r=>r.kind!=='added').map(r=>r.text).join('\n'),before)
 assert.deepEqual(rows.filter(r=>r.kind!=='removed').map(r=>r.text).join('\n'),after)
 assert.equal(rows.filter(r=>r.kind==='added').length,1)
 assert.equal(rows.filter(r=>r.kind==='removed').length,1)
})
test('unchanged and long chapter comparisons remain bounded',()=>{
 assert.ok(sectionRevisionDiff('相同','相同').every(r=>r.kind==='same'))
 const rows=sectionRevisionDiff('旧\n'.repeat(600),'新\n'.repeat(600))
 assert.equal(rows.filter(r=>r.kind==='removed').length,600)
 assert.equal(rows.filter(r=>r.kind==='added').length,600)
})
