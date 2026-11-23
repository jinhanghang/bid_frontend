<template>
  <div class="section-visual-editor">
    <div ref="editor" class="visual-editor-content" contenteditable="true" role="textbox" aria-label="章节正文可视化编辑" aria-multiline="true" spellcheck="false" @input="publish" @compositionstart="composing=true" @compositionend="finishComposition" @paste="paste" @drop.prevent @click.capture="blockLink" @keydown="onKeydown">
      <SectionContentPreview :key="revision" class="section-content-preview" :content="source" :visual-editing="true" />
    </div>
  </div>
</template>
<script setup>
import {nextTick,onBeforeUnmount,onMounted,ref,watch} from 'vue'
import SectionContentPreview from './SectionContentPreview.vue'
import {insertImageAtEditorRange,sanitizeEditorPaste,visualContentToMarkdown} from '@/utils/sectionVisualEditing'
const props=defineProps({modelValue:{type:String,default:''}})
const emit=defineEmits(['update:modelValue','save'])
const source=ref(props.modelValue),editor=ref(null),revision=ref(0),composing=ref(false)
let lastEmitted=props.modelValue,baseline='',savedRange=null
onMounted(()=>{baseline=visualContentToMarkdown(editor.value);document.addEventListener('selectionchange',rememberSelection)})
onBeforeUnmount(()=>document.removeEventListener('selectionchange',rememberSelection))
watch(()=>props.modelValue,async value=>{if(value===lastEmitted)return;source.value=value;lastEmitted=value;savedRange=null;revision.value++;await nextTick();baseline=visualContentToMarkdown(editor.value)})
function publish(){if(composing.value)return;const serialized=visualContentToMarkdown(editor.value),value=serialized===baseline?source.value:serialized;lastEmitted=value;emit('update:modelValue',value)}
function rememberSelection(){
 const selection=window.getSelection()
 if(!selection?.rangeCount)return
 const range=selection.getRangeAt(0)
 if(editor.value?.contains(range.startContainer) && editor.value.contains(range.endContainer)) {savedRange=range.cloneRange();savedRange.collapse(false)}
}
async function insertImage(marker){
 const value=insertImageAtEditorRange(editor.value,savedRange,marker,lastEmitted)
 source.value=value;lastEmitted=value;savedRange=null;revision.value++;emit('update:modelValue',value)
 await nextTick();baseline=visualContentToMarkdown(editor.value)
 const image=[...editor.value.querySelectorAll('figure[data-image-source]')].findLast(node=>node.getAttribute('data-image-source')===marker)
 if(image){editor.value.focus();const range=document.createRange();range.setStartAfter(image);range.collapse(true);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);rememberSelection();image.scrollIntoView?.({block:'nearest'})}
}
function finishComposition(){composing.value=false;publish()}
function focus(end=false){editor.value?.focus();if(end && editor.value){const range=document.createRange();range.selectNodeContents(editor.value);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range)}}
function paste(event){event.preventDefault();const data=event.clipboardData;if(!data)return;const html=data.getData('text/html');if(html)document.execCommand('insertHTML',false,sanitizeEditorPaste(html,document));else document.execCommand('insertText',false,data.getData('text/plain'));publish()}
function blockLink(event){if(event.target.closest?.('a'))event.preventDefault()}
function onKeydown(event){
 if((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='s'){event.preventDefault();if(!composing.value){publish();emit('save')}return}
 if(event.key!=='Tab')return
 const selection=window.getSelection(),element=selection?.anchorNode?.nodeType===1?selection.anchorNode:selection?.anchorNode?.parentElement
 const cell=element?.closest('td,th');if(!cell || !editor.value.contains(cell))return
 event.preventDefault();const table=cell.closest('table');let cells=[...table.querySelectorAll('th,td')],index=cells.indexOf(cell)+(event.shiftKey?-1:1)
 if(index>=cells.length){const last=table.rows[table.rows.length-1],row=table.insertRow();for(const previous of last.cells){const next=row.insertCell();next.style.textAlign=previous.style.textAlign;next.append(document.createElement('br'))}cells=[...table.querySelectorAll('th,td')];publish()}
 const target=cells[Math.max(0,index)];if(target){const range=document.createRange();range.selectNodeContents(target);range.collapse(true);selection.removeAllRanges();selection.addRange(range)}
}
defineExpose({focus,rememberSelection,insertImage,flush:()=>{if(!composing.value)publish()},getContent:()=>visualContentToMarkdown(editor.value)})
</script>
<style scoped>
.section-visual-editor{min-width:0;font-size:var(--section-body-font-size,17px);line-height:var(--section-body-line-height,1.9);color:var(--section-body-color,#0f2747)}.visual-editor-content{outline:0;min-height:400px;overflow:visible;caret-color:#6550d9}.visual-editor-content :deep(p){margin:0 0 12px;text-indent:2em;white-space:pre-wrap}.visual-editor-content :deep(h3){font-size:20px;line-height:1.45;margin:18px 0 10px;color:#07162d;font-weight:800;text-indent:0}.visual-editor-content :deep(table){width:100%;border-collapse:collapse;table-layout:fixed;font:inherit;line-height:1.65;margin:16px 0 20px}.visual-editor-content :deep(th),.visual-editor-content :deep(td){border:1px solid #9aa4b3;padding:9px 11px;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere;text-indent:0}.visual-editor-content :deep(th){background:#f6f7fa;font-weight:600}.visual-editor-content :deep(ul),.visual-editor-content :deep(ol){padding-left:1.8em;list-style:revert}.visual-editor-content :deep(li){margin:5px 0}.visual-editor-content :deep(.section-render-table){margin:0}
</style>
