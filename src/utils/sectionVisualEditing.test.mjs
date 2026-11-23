import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {JSDOM} from 'jsdom'
import {parse,compileScript} from '@vue/compiler-sfc'
import {visualContentToMarkdown,sanitizeEditorPaste,insertImageAtEditorRange} from './sectionVisualEditing.js'
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://editor.test'})
for(const key of ['window','document','Element','HTMLElement','SVGElement','Node','Event','CompositionEvent'])globalThis[key]=dom.window[key]
const vue=await import('vue')
const {createApp,h,nextTick}=vue
function root(html){const el=document.createElement('div');el.innerHTML=html;return el}

test('edited headings, tables, lists and internal image references keep their formats',()=>{
 const doc=root('<h3>检查节点</h3><p>责任岗位 <strong>设计负责人</strong></p><div><table><thead><tr><th>项目</th><th style="text-align:right">措施</th></tr></thead><tbody><tr><td>接口 | 管线</td><td>复核<br>验收</td></tr></tbody></table></div><ol start="3"><li>步骤一<ul><li>子步骤</li></ul></li></ol><figure data-image-source="![现场图](aibid-file://abc?width=680&amp;align=center)"><img src="blob:temporary"></figure>')
 const md=visualContentToMarkdown(doc)
 assert.match(md,/### 检查节点/);assert.match(md,/\*\*设计负责人\*\*/)
 assert.match(md,/\| 接口 \\\| 管线 \| 复核<br>验收 \|/)
 assert.match(md,/\| --- \| ---: \|/)
 assert.match(md,/3\. 步骤一\n  - 子步骤/)
 assert.ok(md.includes('![现场图](aibid-file://abc?width=680&align=center)'));assert.ok(!md.includes('blob:'))
})
test('clipboard drops unsafe elements and styles without flattening a table',()=>{
 const clean=sanitizeEditorPaste('<script>bad()</script><p onclick="bad()" style="color:red">原文<a href="javascript:bad()">链接</a></p><table><tr><td>A</td><td>B</td></tr></table><img src=x onerror=bad()><figure data-image-source="evil">标注</figure>',document)
 assert.ok(clean.includes('<table>'));assert.ok(clean.includes('原文'));assert.ok(!/script|onclick|onerror|javascript|style=|data-image-source|<img/i.test(clean))
 assert.match(visualContentToMarkdown(root(clean)),/\| A \| B \|/)
})
async function compileComponent(path,replacements={}){
 const source=await readFile(new URL(path,import.meta.url),'utf8'),{descriptor}=parse(source)
 let content=compileScript(descriptor,{id:'visual-edit-test',inlineTemplate:true}).content
 for(const [from,to] of Object.entries({vue:import.meta.resolve('vue'),...replacements})) content=content.replaceAll(`'${from}'`,JSON.stringify(to)).replaceAll(`"${from}"`,JSON.stringify(to))
 return 'data:text/javascript;base64,'+Buffer.from(content).toString('base64')
}
const previewUrl=await compileComponent('../components/SectionContentPreview.vue',{
 '@/utils/sectionContentBlocks':new URL('./sectionContentBlocks.js',import.meta.url).href,
 '@/api/file':'data:text/javascript,export async function downloadFileBlob(){throw new Error("test image unavailable")}'
})
const editorUrl=await compileComponent('../components/SectionVisualEditor.vue',{
 './SectionContentPreview.vue':previewUrl,
 '@/utils/sectionVisualEditing':new URL('./sectionVisualEditing.js',import.meta.url).href
})
const Editor=(await import(editorUrl)).default

test('actual Vue editor edits rendered table cells, keeps caret DOM, and defers Chinese composition',async()=>{
 const host=document.createElement('div');document.body.append(host)
 const markdown='### 分区踏勘\n\n原始正文。\n\n| 项目 | 要求 |\n|---|---|\n| 屋面 | 检查 |\n\n![现场图](aibid-file://abc?width=680)'
 let saved=markdown,emits=0,ref
 const app=createApp({render:()=>h(Editor,{ref:v=>ref=v,modelValue:saved,'onUpdate:modelValue':v=>{saved=v;emits++}})})
 app.component('el-button',{render:()=>h('button')});app.mount(host);await nextTick();await nextTick()
 const editing=host.querySelector('[contenteditable=true]')
 assert.ok(editing);assert.equal(host.querySelector('h3').textContent,'分区踏勘');assert.equal(host.querySelectorAll('table').length,1)
 assert.equal(host.querySelector('figure').getAttribute('contenteditable'),'false');assert.equal(saved,markdown);assert.equal(emits,0)
 ref.flush();assert.equal(saved,markdown,'Saving an unedited view retains the original Markdown byte for byte')
 const cell=host.querySelector('tbody td');cell.textContent='已复核屋面';cell.dispatchEvent(new window.Event('input',{bubbles:true}));await nextTick()
 assert.ok(saved.includes('| 已复核屋面 | 检查 |'));assert.ok(saved.includes('aibid-file://abc?width=680'));assert.equal(host.querySelector('tbody td'),cell)
 editing.dispatchEvent(new window.CompositionEvent('compositionstart',{bubbles:true}));cell.textContent='中文输入';cell.dispatchEvent(new window.Event('input',{bubbles:true}));assert.ok(!saved.includes('中文输入'))
 editing.dispatchEvent(new window.CompositionEvent('compositionend',{bubbles:true}));assert.ok(saved.includes('中文输入'))
 ref.focus(true);assert.ok(document.activeElement===editing)
 app.unmount();host.remove()
})

test('image caret insertion splits a paragraph and keeps inline formats and following text',()=>{
 const editor=root('<div class="section-content-renderer"><p><strong>前文后文</strong></p><p>下一段</p></div>')
 const range=document.createRange();range.setStart(editor.querySelector('strong').firstChild,2);range.collapse(true)
 const image='![现场](aibid-file://img?width=680&align=center)'
 const md=insertImageAtEditorRange(editor,range,image,'原文')
 assert.ok(md.indexOf('**前文**')<md.indexOf(image));assert.ok(md.indexOf(image)<md.indexOf('**后文**'));assert.ok(md.endsWith('下一段'))
 assert.equal(editor.querySelector('strong').textContent,'前文后文','Insertion planning never mutates the original DOM')
})
test('without a valid caret images append at the end; table carets keep the complete table',()=>{
 const image='![现场](aibid-file://img)'
 assert.equal(insertImageAtEditorRange(root('<p>原文</p>'),null,image,'原文\n'),'原文\n\n'+image+'\n')
 const editor=root('<div class="section-content-renderer"><table><tr><th>列名</th></tr><tr><td>完整表格</td></tr></table><p>后续正文</p></div>')
 const range=document.createRange();range.setStart(editor.querySelector('td').firstChild,2);range.collapse(true)
 const md=insertImageAtEditorRange(editor,range,image,'')
 assert.ok(md.includes('| 完整表格 |'));assert.ok(md.indexOf('| 完整表格 |')<md.indexOf(image));assert.ok(md.indexOf(image)<md.indexOf('后续正文'))
 const other=document.createRange();other.selectNodeContents(root('<p>其他章节</p>'))
 assert.ok(insertImageAtEditorRange(editor,other,image,'当前章节').startsWith('当前章节\n\n'))
})
test('Vue editor remembers the caret through picker focus and puts the next image after the last one',async()=>{
 const host=document.createElement('div');document.body.append(host);let ref,saved='第一段正文。\n\n最后一段。'
 const app=createApp({render:()=>h(Editor,{ref:v=>ref=v,modelValue:saved,'onUpdate:modelValue':v=>saved=v})});app.component('el-button',{render:()=>h('button')})
 app.mount(host);await nextTick()
 const selection=window.getSelection(),range=document.createRange();range.setStart(host.querySelector('p span').firstChild,3);range.collapse(true);selection.removeAllRanges();selection.addRange(range);ref.rememberSelection()
 const picker=document.createElement('input');document.body.append(picker);picker.focus();selection.removeAllRanges()
 const first='![第一张](aibid-file://first)',second='![第二张](aibid-file://second)'
 await ref.insertImage(first);await nextTick();await ref.insertImage(second);await nextTick()
 assert.ok(saved.indexOf('第一段')<saved.indexOf(first));assert.ok(saved.indexOf(first)<saved.indexOf(second));assert.ok(saved.indexOf(second)<saved.indexOf('正文。'));assert.ok(saved.endsWith('最后一段。'))
 assert.equal(host.querySelectorAll('figure').length,2)
 app.unmount();host.remove();picker.remove();selection.removeAllRanges()
})
