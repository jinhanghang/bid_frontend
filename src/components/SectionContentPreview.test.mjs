import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {parse,compileScript} from '@vue/compiler-sfc'
import {createSSRApp,h} from 'vue'
import {renderToString} from '@vue/server-renderer'
const {descriptor}=parse(await readFile(new URL('./SectionContentPreview.vue',import.meta.url),'utf8'))
let source=compileScript(descriptor,{id:'section-preview-test',inlineTemplate:true}).content
source=source.replace(/from ['"]vue['"]/g,`from ${JSON.stringify(import.meta.resolve('vue'))}`)
 .replace("from '@/utils/sectionContentBlocks'",`from ${JSON.stringify(new URL('../utils/sectionContentBlocks.js',import.meta.url).href)}`)
 .replace("import { downloadFileBlob } from '@/api/file'", "const downloadFileBlob = async () => { throw new Error('No download in static rendering test') }")
const {default:Preview}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
test('the actual Vue preview renders table cells and rich content, with untrusted HTML escaped',async()=>{
 const content='### 风险控制\n\n| 区段 | 措施 |\n\n|---|---|\n\n| 左岸 | **先撑后挖**<br>逐项检查 |\n\n3. 实施检查\n4. 交付记录\n\n<img src=x onerror=alert(1)>'
 const app=createSSRApp({render:()=>h(Preview,{content})})
 app.component('ElButton',{render(){return h('button',this.$slots.default?.())}})
 const html=await renderToString(app)
 assert.ok(html.includes('<table'));assert.equal((html.match(/<th\b/g)||[]).length,2);assert.equal((html.match(/<td\b/g)||[]).length,2)
 assert.ok(html.includes('<strong>先撑后挖</strong>'));assert.ok(html.includes('<br>'));assert.ok(html.includes('<ol'));assert.ok(html.includes('start="3"'))
 assert.ok(!html.includes('|---|'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;img'))
})
