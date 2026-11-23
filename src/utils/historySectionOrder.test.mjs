import test from 'node:test'
import assert from 'node:assert/strict'
import {orderHistoricalSections} from './historySectionOrder.js'
const outlines=[{id:'b',parentId:'root',sortNo:2},{id:'root',parentId:'0',sortNo:1},{id:'a',parentId:'root',sortNo:1},{id:'b2',parentId:'b',sortNo:2},{id:'a1',parentId:'a',sortNo:1},{id:'b1',parentId:'b',sortNo:1}]
test('historical tree traversal beats database IDs, parent IDs and completion sequence',()=>{
 const sections=['b2','b1','a1'].map(outlineId=>({outlineId,content:outlineId}))
 const snapshot={outlines,sections},before=JSON.stringify(snapshot)
 assert.deepEqual(orderHistoricalSections(snapshot).map(x=>x.outlineId),['a1','b1','b2'])
 assert.equal(JSON.stringify(snapshot),before,'never mutate saved data or content')
})
test('snapshot order takes precedence over a moved current directory',()=>{
 assert.deepEqual(orderHistoricalSections({outlines,sections:[{outlineId:'b1'},{outlineId:'a1'}]},[{id:'b1',sortNo:1},{id:'a1',sortNo:2}]).map(x=>x.outlineId),['a1','b1'])
})
test('nested old trees, missing nodes, numeric title fallback and partial histories keep all sections',()=>{
 const sections=[{outlineId:'unknown2',title:'1.10 节'},{outlineId:'b'},{outlineId:'unknown1',title:'1.2 节'},{outlineId:'a'}]
 const result=orderHistoricalSections({outlines:[{id:'root',children:[{id:'b',sortNo:2},{id:'a',sortNo:1}]}],sections})
 assert.deepEqual(result.map(x=>x.outlineId),['a','b','unknown1','unknown2']);assert.equal(result.length,sections.length)
 assert.deepEqual(orderHistoricalSections({sections},[{id:'b',sortNo:1},{id:'a',sortNo:2}]).map(x=>x.outlineId),['b','a','unknown1','unknown2'])
})
test('cycles, absent sort values and a single section never lose content',()=>{
 const result=orderHistoricalSections({outlines:[{id:'a',parentId:'b'},{id:'b',parentId:'a'}],sections:[{outlineId:'b'},{outlineId:'a'}]})
 assert.equal(result.length,2);assert.deepEqual(new Set(result.map(x=>x.outlineId)),new Set(['a','b']))
 const one={outlineId:'a',content:'保留'};assert.equal(orderHistoricalSections({outlines,sections:[one]})[0],one)
})
