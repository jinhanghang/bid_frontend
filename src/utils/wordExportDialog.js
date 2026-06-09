import { defineComponent, h, ref } from 'vue'
import { ElMessageBox, ElRadio, ElRadioGroup, ElTag } from '@/plugins/element-plus-api'

const EXPORT_STYLES = [
  {
    code: 'SIMPLE',
    name: '简洁版',
    desc: '内部查看、快速导出，排版干净。'
  },
  {
    code: 'BUSINESS',
    name: '商务版',
    desc: '适合客户预览，标题和表格更清晰。'
  },
  {
    code: 'BID_OFFICIAL',
    name: '标书正式版',
    desc: '默认样式，适合正式标书/正式方案导出。'
  },
  {
    code: 'REVIEW',
    name: '评审阅读版',
    desc: '段距更宽、字号更友好，适合领导快速阅读。'
  }
]

/**
 * 打开 Word/PDF 导出弹窗。
 *
 * 不包含“导出范围”，只选择导出格式和固定导出样式。
 */
export async function openWordExportDialog(options = {}) {
  const format = ref(options.format || 'word')
  const styleCode = ref(options.styleCode || 'BID_OFFICIAL')
  const showFormat = options.showFormat !== false

  /**
   * 注意：ElMessageBox 的 message 如果直接传普通 VNode，VNode 只会生成一次。
   * 之前点击 PDF / 点击其他样式时，ref 的值变了，但弹窗里的选中状态不会重新渲染，
   * 所以页面看起来像“点击没反应”。
   * 这里改成组件，让 format/styleCode 变化时可以正常响应式刷新。
   */
  const ExportDialogContent = defineComponent({
    name: 'ExportDialogContent',
    setup() {
      return () => h('div', { class: 'word-export-dialog-body' }, [
        showFormat
          ? h('div', { class: 'word-export-dialog-section' }, [
              h('div', { class: 'word-export-dialog-title' }, '导出格式'),
              h(ElRadioGroup, {
                modelValue: format.value,
                'onUpdate:modelValue': (value) => { format.value = value }
              }, () => [
                h(ElRadio, { value: 'word' }, () => 'Word（可继续编辑）'),
                h(ElRadio, { value: 'pdf' }, () => 'PDF（定稿分发）')
              ])
            ])
          : null,
        h('div', { class: 'word-export-dialog-section' }, [
          h('div', { class: 'word-export-dialog-title' }, '导出样式'),
          h(ElRadioGroup, {
            modelValue: styleCode.value,
            'onUpdate:modelValue': (value) => { styleCode.value = value }
          }, () => EXPORT_STYLES.map((item) => h('div', {
            class: ['word-export-style-card', styleCode.value === item.code ? 'is-active' : ''],
            onClick: () => { styleCode.value = item.code }
          }, [
            h(ElRadio, { value: item.code }, () => [
              item.name,
              item.code === 'BID_OFFICIAL'
                ? h(ElTag, { size: 'small', type: 'success', effect: 'plain', class: 'word-export-style-tag' }, () => '默认')
                : null
            ]),
            h('div', { class: 'word-export-style-desc' }, item.desc)
          ])))
        ])
      ])
    }
  })

  try {
    await ElMessageBox.confirm(
      h(ExportDialogContent),
      '导出文件',
      {
        confirmButtonText: '确认导出',
        cancelButtonText: '取消',
        closeOnClickModal: true,
        closeOnPressEscape: true,
        customClass: 'word-export-message-box'
      }
    )
    return {
      format: format.value,
      styleCode: styleCode.value,
      generateCatalog: true,
      beautifyTable: true,
      keepBold: true,
      pageNumber: true
    }
  } catch (e) {
    return null
  }
}

