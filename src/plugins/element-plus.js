import {
  ElAlert
} from 'element-plus/es/components/alert/index'
import {
  ElBadge
} from 'element-plus/es/components/badge/index'
import {
  ElButton
} from 'element-plus/es/components/button/index'
import {
  ElCheckbox,
  ElCheckboxGroup
} from 'element-plus/es/components/checkbox/index'
import {
  ElCol
} from 'element-plus/es/components/col/index'
import {
  ElCollapse,
  ElCollapseItem
} from 'element-plus/es/components/collapse/index'
import {
  ElConfigProvider
} from 'element-plus/es/components/config-provider/index'
import {
  ElDatePicker
} from 'element-plus/es/components/date-picker/index'
import {
  ElDescriptions,
  ElDescriptionsItem
} from 'element-plus/es/components/descriptions/index'
import {
  ElDialog
} from 'element-plus/es/components/dialog/index'
import {
  ElDivider
} from 'element-plus/es/components/divider/index'
import {
  ElDrawer
} from 'element-plus/es/components/drawer/index'
import {
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu
} from 'element-plus/es/components/dropdown/index'
import {
  ElEmpty
} from 'element-plus/es/components/empty/index'
import {
  ElForm,
  ElFormItem
} from 'element-plus/es/components/form/index'
import {
  ElIcon
} from 'element-plus/es/components/icon/index'
import {
  ElInput
} from 'element-plus/es/components/input/index'
import {
  ElInputNumber
} from 'element-plus/es/components/input-number/index'
import {
  ElLink
} from 'element-plus/es/components/link/index'
import {
  ElLoading
} from 'element-plus/es/components/loading/index'
import {
  ElPagination
} from 'element-plus/es/components/pagination/index'
import {
  ElProgress
} from 'element-plus/es/components/progress/index'
import {
  ElRadio,
  ElRadioButton,
  ElRadioGroup
} from 'element-plus/es/components/radio/index'
import {
  ElRow
} from 'element-plus/es/components/row/index'
import {
  ElScrollbar
} from 'element-plus/es/components/scrollbar/index'
import {
  ElOption,
  ElSelect
} from 'element-plus/es/components/select/index'
import {
  ElStep,
  ElSteps
} from 'element-plus/es/components/steps/index'
import {
  ElSwitch
} from 'element-plus/es/components/switch/index'
import {
  ElTabPane,
  ElTabs
} from 'element-plus/es/components/tabs/index'
import {
  ElTable,
  ElTableColumn
} from 'element-plus/es/components/table/index'
import {
  ElTag
} from 'element-plus/es/components/tag/index'
import {
  ElTooltip
} from 'element-plus/es/components/tooltip/index'
import {
  ElUpload
} from 'element-plus/es/components/upload/index'

const components = [
  ElAlert,
  ElBadge,
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElCol,
  ElCollapse,
  ElCollapseItem,
  ElConfigProvider,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElDivider,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElLink,
  ElOption,
  ElPagination,
  ElProgress,
  ElRadio,
  ElRadioButton,
  ElRadioGroup,
  ElRow,
  ElScrollbar,
  ElSelect,
  ElStep,
  ElSteps,
  ElSwitch,
  ElTabPane,
  ElTable,
  ElTableColumn,
  ElTabs,
  ElTag,
  ElTooltip,
  ElUpload
]

export function installElementPlus(app) {
  components.forEach((component) => app.use(component))
  app.use(ElLoading)
}
