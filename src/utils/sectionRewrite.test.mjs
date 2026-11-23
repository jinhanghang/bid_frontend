import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {parse,compileScript} from '@vue/compiler-sfc'
import {JSDOM} from 'jsdom'
import {buildSectionRewritePayload,sectionRewriteSource} from './sectionRewrite.js'
const dom=new JSDOM('<html><body></body></html>',{url:'https://rewrite.test'})
for(const key of ['window','document','Element','HTMLElement','SVGElement','Node','Event'])globalThis[key]=dom.window[key]
const {createApp,h,ref,nextTick}=await import('vue')
const node={id:'section-a',title:'当前节',targetWordCount:1204,writingDirection:'评分响应',knowledgeIds:['kb-a'],section:{content:'原文\n\n| 项目 | 措施 |\n| --- | --- |\n| 现场 | 检查 |'}}
test('rewrite preserves exact source for conflict detection and carries explicit instructions and config',()=>{
 const payload=buildSectionRewritePayload(node,sectionRewriteSource(node),'补充验收动作',1500)
 assert.equal(payload.action,'REWRITE');assert.equal(payload.previewOnly,true);assert.equal(payload.sourceContent,node.section.content)
 assert.equal(payload.rewriteInstruction,'补充验收动作');assert.equal(payload.targetWordCount,1500);assert.equal(payload.writingDirection,'评分响应');assert.equal(payload.knowledgeIds,'["kb-a"]')
 assert.throws(()=>buildSectionRewritePayload(node,'x','',149),/目标字数/)
 assert.throws(()=>buildSectionRewritePayload(node,'x','',20001),/目标字数/)
})
const source=await readFile(new URL('../components/TechnicalSectionRevisionDialog.vue',import.meta.url),'utf8')
const {descriptor}=parse(source)
let compiled=compileScript(descriptor,{id:'rewrite-dialog-test',inlineTemplate:true}).content
compiled=compiled.replace(/import \{ElMessage,ElMessageBox\} from 'element-plus'/,"const {ElMessage,ElMessageBox}=globalThis.__rewriteMessages")
compiled=compiled.replace(/import SectionRevisionCompare from '.\/SectionRevisionCompare.vue'/,"const SectionRevisionCompare={props:['before','after'],template:'<div class=\"compare\">{{ before }} → {{ after }}</div>'}")
compiled=compiled.replace(/from '@\/utils\/sectionRewrite'/,`from '${new URL('./sectionRewrite.js',import.meta.url).href}'`)
compiled=compiled.replace(/from '@\/utils\/historySectionOrder'/,`from '${new URL('./historySectionOrder.js',import.meta.url).href}'`)
compiled=compiled.replace(/import \{([^}]+)\} from '@\/api\/bidProject'/,'const {$1}=globalThis.__rewriteApi')
// Import from a temporary module beside node_modules so Vue resolves normally.
const {writeFile,unlink}=await import('node:fs/promises')
const temp=new URL('../../.rewrite-dialog-test.mjs',import.meta.url)
await writeFile(temp,compiled)
let draft=null,calls=[],release=null
const messages=[]
globalThis.__rewriteMessages={ElMessage:{success:x=>messages.push(x),warning:x=>messages.push(x)},ElMessageBox:{confirm:async()=>{}}}
globalThis.__rewriteApi={
 getTechnicalRewriteDraft:async()=>draft,
 adoptTechnicalRewriteDraft:async(...args)=>{calls.push(['adopt',...args])},discardTechnicalRewriteDraft:async()=>{draft=null},
 restoreTechnicalContentVersion:async()=>{},listTechnicalSectionVersions:async()=>[],listBidProjectTechnicalVersions:async()=>[],getBidProjectTechnicalVersion:async()=>{},
 streamBidProjectTechnicalSection:async(project,id,payload,handlers)=>{calls.push(['generate',project,id,payload]);handlers.onMessage('生成内容');await new Promise(resolve=>release=resolve);draft={id:'draft-a',content:'修改后的新稿',requirement:payload.rewriteInstruction}}
}
const Component=(await import(temp.href)).default
await unlink(temp)
const pass={setup:(_,ctx)=>()=>h('div',ctx.slots.default?.())}
const button={props:['disabled','loading'],emits:['click'],setup:(props,ctx)=>()=>h('button',{disabled:props.disabled || props.loading,onClick:e=>ctx.emit('click',e)},ctx.slots.default?.())}
const input={props:['modelValue'],emits:['update:modelValue'],setup:(props,ctx)=>()=>h('textarea',{value:props.modelValue,onInput:e=>ctx.emit('update:modelValue',e.target.value)})}
function mount(){
 const host=document.createElement('div');document.body.append(host);const api=ref(),project=ref('project-a');let updates=0
 const app=createApp({setup:()=>()=>h(Component,{ref:api,projectId:project.value,node,outlines:[node],onUpdated:()=>updates++})})
 app.directive('loading',{})
 app.component('el-dialog',{props:['modelValue'],setup:(p,c)=>()=>p.modelValue?h('div',[c.slots.default?.(),c.slots.footer?.()]):null})
 app.component('el-button',button);app.component('el-input',input);app.component('el-input-number',input)
 app.component('el-alert',{props:['title'],setup:p=>()=>h('div',{class:'alert'},p.title)})
 for(const name of ['el-tabs','el-tab-pane','el-checkbox','el-empty'])app.component(name,pass)
 app.mount(host);return {api,project,host,app,get updates(){return updates},close(){app.unmount();host.remove()}}
}
async function settle(){for(let i=0;i<6;i++){await Promise.resolve();await nextTick()}}
function click(f,text){const el=[...f.host.querySelectorAll('button')].find(x=>x.textContent===text);assert.ok(el,`missing button ${text}`);el.click()}
test('outline-selected node opens rewrite, shortcut reaches API, candidate requires explicit adoption',async()=>{
 draft=null;calls=[];const f=mount();await f.api.value.openRewrite(node);await settle()
 click(f,'补充实施细节');await settle();assert.match(f.host.querySelectorAll('textarea')[1].value,/责任岗位/)
 click(f,'生成新稿');await settle();assert.match(f.host.textContent,/正在生成新稿/);assert.match(f.host.textContent,/生成内容/)
 assert.equal(calls[0][3].previewOnly,true);assert.match(calls[0][3].rewriteInstruction,/交付成果/);assert.equal(node.section.content.startsWith('原文'),true)
 release();await settle();assert.match(f.host.querySelector('.compare').textContent,/原文/);assert.match(f.host.querySelector('.compare').textContent,/修改后的新稿/)
 assert.equal(calls.filter(x=>x[0]==='adopt').length,0)
 click(f,'采用新稿');await settle();assert.deepEqual(calls.at(-1),['adopt','project-a','section-a','draft-a']);f.close()
})
test('identical draft is visibly flagged and cannot be adopted',async()=>{
 draft={id:'same',content:node.section.content};const f=mount();await f.api.value.openRewrite(node);await settle()
 assert.match(f.host.textContent,/完全一致/);assert.equal([...f.host.querySelectorAll('button')].find(x=>x.textContent==='采用新稿').disabled,true);f.close()
})
test('changing projects while generating does not display old candidate in the new project',async()=>{
 draft=null;const f=mount();await f.api.value.openRewrite(node);click(f,'生成新稿');await settle();const count=f.updates
 f.project.value='project-b';await settle();release();await settle();assert.equal(f.host.textContent,'');assert.equal(f.updates,count);f.close()
})
test('outline entry routes existing content to review and empty content to first generation; cancelled edit stays put',async()=>{
 const page=await readFile(new URL('../views/bid/project/index.vue',import.meta.url),'utf8')
 assert.match(page,/@section-generate="openTechnicalSectionAction"/)
 const body=page.match(/async function openTechnicalSectionAction\(node\) \{([\s\S]*?)\n\}/)[1]
 let first=0,review=0,cancel=false
 const selected={value:null},editing={value:false}
 const fn=new Function('sectionRewriteSource','openTechnicalSectionDialog','isTechnicalRunningByBackend','hasOtherAiTaskRunning','ElMessage','selectTechnicalLeaf','selectedTechnicalLeaf','technicalSectionContentEditMode','nextTick','technicalRevisions',`return async function(node){${body}}`)(sectionRewriteSource,()=>first++,{value:false},{value:false},{warning(){}},async n=>{if(!cancel){selected.value=n;editing.value=false}},selected,editing,nextTick,{value:{openRewrite(n){assert.equal(n,node);review++}}})
 await fn(node);assert.equal(review,1);assert.equal(first,0)
 await fn({id:'empty',section:{content:''}});assert.equal(first,1)
 cancel=true;editing.value=true;await fn(node);assert.equal(review,1,'must not open rewrite over uncommitted edits')
})
