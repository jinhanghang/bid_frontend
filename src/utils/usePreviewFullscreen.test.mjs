import test from 'node:test'
import assert from 'node:assert/strict'
import {JSDOM} from 'jsdom'
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://preview.test'})
for(const key of ['window','document','Node','Element','HTMLElement','SVGElement','KeyboardEvent'])globalThis[key]=dom.window[key]
const {createApp,h,ref,Teleport,nextTick}=await import('vue')
const {usePreviewFullscreen}=await import('./usePreviewFullscreen.js')
function mount(){
 const host=document.createElement('div');document.body.append(host);let api,viewport
 const app=createApp({setup(){viewport=ref(null);api=usePreviewFullscreen(viewport);return ()=>h(Teleport,{to:'body',disabled:!api.fullscreen.value},h('section',{class:'test-preview'},[h('div',{ref:viewport,class:'viewport'},h('div',{contenteditable:true},'原始正文'))]))}})
 app.mount(host);return {app,host,get api(){return api},get viewport(){return viewport.value}}
}
test('fullscreen moves the same DOM and retains edited text, zoom-independent scroll and exit state',async()=>{
 document.body.style.overflow='auto';const fixture=mount();await nextTick()
 const original=fixture.host.querySelector('.test-preview'),editor=fixture.host.querySelector('[contenteditable]')
 editor.textContent='未保存草稿';fixture.viewport.scrollTop=240;fixture.viewport.scrollLeft=30
 await fixture.api.toggleFullscreen()
 assert.equal(fixture.api.fullscreen.value,true);assert.equal(document.body.style.overflow,'hidden');assert.ok(!fixture.host.contains(original))
 assert.equal(document.body.querySelector('.test-preview'),original);assert.equal(original.querySelector('[contenteditable]'),editor)
 assert.equal(editor.textContent,'未保存草稿');assert.equal(fixture.viewport.scrollTop,240);assert.equal(fixture.viewport.scrollLeft,30)
 fixture.viewport.scrollTop=360;await fixture.api.toggleFullscreen()
 assert.ok(fixture.host.contains(original));assert.equal(fixture.viewport.scrollTop,360);assert.equal(document.body.style.overflow,'auto')
 fixture.app.unmount();fixture.host.remove()
})
test('Escape exits fullscreen but leaves an image/dialog Escape to the dialog',async()=>{
 const fixture=mount();await nextTick();await fixture.api.setFullscreen(true)
 const dialog=document.createElement('div');dialog.setAttribute('role','dialog');document.body.append(dialog)
 dialog.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await nextTick();assert.equal(fixture.api.fullscreen.value,true)
 document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await nextTick();assert.equal(fixture.api.fullscreen.value,false)
 fixture.app.unmount();fixture.host.remove();dialog.remove()
})
test('unmount restores the previous page overflow and removes keyboard handling',async()=>{
 document.body.style.overflow='clip';const fixture=mount();await nextTick();await fixture.api.setFullscreen(true)
 fixture.app.unmount();fixture.host.remove();assert.equal(document.body.style.overflow,'clip')
 const event=new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});document.dispatchEvent(event);assert.equal(event.defaultPrevented,false)
})
