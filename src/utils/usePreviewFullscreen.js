import {nextTick,onBeforeUnmount,onMounted,ref} from 'vue'

// Page fullscreen keeps browser tabs visible and leaves the editor component mounted.
export function usePreviewFullscreen(viewport) {
  const fullscreen=ref(false)
  let previousOverflow=null,sequence=0
  async function setFullscreen(value) {
    const enabled=Boolean(value)
    if(fullscreen.value===enabled)return
    const element=viewport.value,top=element?.scrollTop || 0,left=element?.scrollLeft || 0,token=++sequence
    if(enabled){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden'}
    else if(previousOverflow!==null){document.body.style.overflow=previousOverflow;previousOverflow=null}
    fullscreen.value=enabled
    await nextTick()
    if(token!==sequence)return
    if(viewport.value){viewport.value.scrollTop=top;viewport.value.scrollLeft=left}
  }
  function toggleFullscreen(){return setFullscreen(!fullscreen.value)}
  function escape(event){
    if(event.key!=='Escape' || event.defaultPrevented || !fullscreen.value || event.target?.closest?.('[role="dialog"]'))return
    event.preventDefault();setFullscreen(false)
  }
  onMounted(()=>document.addEventListener('keydown',escape))
  onBeforeUnmount(()=>{
    sequence++;document.removeEventListener('keydown',escape)
    if(previousOverflow!==null)document.body.style.overflow=previousOverflow
    previousOverflow=null
  })
  return {fullscreen,setFullscreen,toggleFullscreen}
}
