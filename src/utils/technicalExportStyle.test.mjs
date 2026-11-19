import test from 'node:test'
import assert from 'node:assert/strict'
import {readExportStyle,writeExportStyle,commonExportStyle,validateExportStyle,setHeadingKind,initialExportStyle} from './technicalExportStyle.js'
test('parsed tender values remain the initial values and edits never mutate evidence',()=>{
 const source={bodyFont:{value:{name:'仿宋',sizePt:16}},paragraph:{value:{lineSpacingPt:25,firstLineChars:2},quote:'文字左对齐，不得有空格'},margins:{value:{topCm:2}},conflicts:{value:['待核对']}}
 const original=JSON.stringify(source),form=readExportStyle(source)
 assert.equal(form.body.name,'仿宋');assert.equal(form.body.sizePt,16);assert.equal(form.margins.topCm,2);assert.equal(form.margins.rightCm,null);assert.equal(form.paragraph.alignment,'left')
 form.body.name='宋体';form.paragraph.lineType='multiple';form.paragraph.lineValue=1.5;form.numbering=false
 const final=writeExportStyle(form,source)
 assert.equal(final.bodyFont.value.name,'宋体');assert.equal(final.paragraph.value.lineSpacingMultiple,1.5);assert.equal(final.paragraph.value.lineSpacingPt,undefined)
 assert.equal(final.numbering.value.disabled,true);assert.equal(final.paragraph.quote,source.paragraph.quote);assert.equal(final.conflicts,undefined);assert.equal(JSON.stringify(source),original)
})
test('missing values require explicit input, common preset and edited heading survive roundtrip',()=>{
 assert.equal(readExportStyle({}).body.name,'');assert.ok(validateExportStyle(readExportStyle({})))
 const form=commonExportStyle();assert.equal(validateExportStyle(form),'')
 form.headings[0].lineType='fixed';form.headings[0].lineValue=28;form.headings[0].beforePt=6;form.headings[0].name='黑体';form.headings[0].sizePt=18;form.headings[0].bold=true;form.headings[0].kind='chapter';setHeadingKind(form.headings[0],0)
 form.colorMode='color';form.headings[0].color='#113355';form.headings[0].start=3
 const final=writeExportStyle(form),again=readExportStyle(final)
 assert.equal(again.headings[0].name,'黑体');assert.equal(again.headings[0].bold,true);assert.equal(again.headings[0].format,'第%1章');assert.equal(again.headings[0].start,3);assert.equal(again.headings[0].color,'#113355');assert.equal(again.headings.length,9)
 assert.equal(final.headingStyles.value[0].plain,false);assert.equal(again.headings[0].lineValue,28);assert.equal(again.headings[0].beforePt,6)
})

test('automatic default is complete and preserves parsed restrictions and evidence',()=>{
 const empty=initialExportStyle({})
 assert.equal(validateExportStyle(empty),'')
 assert.equal(empty.paper,'A4');assert.equal(empty.body.sizePt,12)
 assert.equal(empty.paragraph.lineValue,1.5);assert.equal(empty.pageNumbers,true)
 const rules={bodyFont:{value:{name:'宋体',sizeName:'四号',plain:true}},paragraph:{value:{lineSpacingPt:25},quote:'左对齐，不得有空格'},margins:{value:{topCm:2}},pageNumbers:{value:false},cover:{value:false},tableOfContents:{value:false}}
 const original=JSON.stringify(rules),form=initialExportStyle(rules)
 assert.equal(validateExportStyle(form),'');assert.equal(form.body.sizePt,14)
 assert.equal(form.margins.topCm,2);assert.equal(form.margins.bottomCm,2.54)
 assert.equal(form.pageNumbers,false);assert.equal(form.cover,false);assert.equal(form.tableOfContents,false)
 assert.equal(form.paragraph.alignment,'left');assert.equal(form.paragraph.removeSpaces,true)
 assert.equal(form.headings[0].sizePt,14);assert.equal(form.headings[0].bold,false)
 assert.equal(form.headings[0].lineType,'fixed');assert.equal(form.headings[0].lineValue,25)
 assert.equal(JSON.stringify(rules),original)
 const saved=writeExportStyle(form,rules);saved.bodyFont.value.name='仿宋'
 assert.equal(initialExportStyle(saved).body.name,'仿宋')
 assert.equal(initialExportStyle(saved).headings[0].lineValue,25)
})
