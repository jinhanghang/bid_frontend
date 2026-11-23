import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {projectEntryRoute} from './projectEntry.js'
test('body-ready/partial/running cards bypass parsing; parse and outline projects retain their entry',()=>{
 for(const status of ['CONTENT_READY','CONTENT_PARTIAL','CONTENT_GENERATING','EXPORTED','GENERATED','COMPLETED'])assert.deepEqual(projectEntryRoute({id:'project-a',status}),{path:'/ai-bid/workbench',query:{projectId:'project-a',doc:'TECHNICAL_SOLUTION'}})
 for(const status of ['PARSE_READY','OUTLINE_READY','PARSING','DRAFT','FAILED'])assert.equal(projectEntryRoute({id:'project-a',status}).query.step,'parse')
})
const source=await readFile(new URL('../views/bid/project/composables/useBidProjectPage.js',import.meta.url),'utf8')
const body=source.match(/async function loadBodyEntry\(\) \{([\s\S]*?)\n\}/)[1]
function fixture(existing=true){
 let projectResolve,solutionResolve,entered=0,hydrated=0
 const calls=[],state={value:''},active={value:''},selected={value:null}
 const fn=new Function('bodyEntryState','selectProject','bodyEntryProjectId','openDocumentByType','activeDoc','technicalGeneratedView','selectedProject','loadTechnicalSolution','hydrateTechnicalSolutionForm',`return async function(){${body}}`)(state,()=>{calls.push('workflow');selected.value={id:'a'};return new Promise(r=>projectResolve=r)},'a',async()=>{entered++;active.value='TECHNICAL_SOLUTION'},active,{value:true},selected,()=>{calls.push('detail');return new Promise(r=>solutionResolve=()=>r(existing?{id:'solution-a'}:null))},()=>hydrated++)
 return {fn,calls,state,active,selected,finishProject:()=>projectResolve(),finishSolution:()=>solutionResolve(),get entered(){return entered},get hydrated(){return hydrated}}
}
test('existing body starts independent reads together and skips enter/refetch',async()=>{
 const f=fixture();const pending=f.fn();assert.deepEqual(f.calls,['workflow','detail']);assert.equal(f.state.value,'loading')
 f.finishSolution();await Promise.resolve();assert.equal(f.state.value,'loading')
 f.finishProject();await pending;assert.equal(f.state.value,'ready');assert.equal(f.entered,0);assert.equal(f.hydrated,1);assert.equal(f.active.value,'TECHNICAL_SOLUTION')
})
test('uninitialized solution keeps the initialization fallback',async()=>{
 const f=fixture(false);const pending=f.fn();f.finishProject();f.finishSolution();await pending;assert.equal(f.entered,1);assert.equal(f.state.value,'ready')
})
test('stale project response cannot activate a different project',async()=>{
 const f=fixture();const pending=f.fn();f.selected.value={id:'b'};f.finishProject();f.finishSolution();await pending;assert.equal(f.active.value,'');assert.equal(f.entered,0)
})
test('dashboard recent and list actions use direct status-aware entry',async()=>{
 const page=await readFile(new URL('../views/dashboard/index.vue',import.meta.url),'utf8')
 assert.match(page,/function openRecentProject\(item\) \{ return router.replace\(projectEntryRoute\(item\)\) \}/)
 assert.match(page,/function openProjectFromList\(item\).*return openRecentProject\(item\)/)
})
