<template>
  <div class="tender-notice-page">
    <section class="notice-hero-card">
      <div class="hero-left">
        <div class="hero-kicker">Tender Opportunities</div>
        <h1>标讯商机</h1>
<!--        <p>集中查看自动抓取的招标公告，支持按公告标题、招标编号、采购人、代理机构和地区进行关键词检索。</p>-->
      </div>
      <div class="hero-stats">
        <div class="stat-card primary">
          <span>当前结果</span>
          <strong>{{ pager.total }}</strong>
        </div>
        <button
          class="stat-card stat-filter"
          :class="{ active: query.filterType === 'new' }"
          type="button"
          @click="toggleQuickFilter('new')"
        >
          <span>本页新公告</span>
          <strong>{{ currentPageNewCount }}</strong>
        </button>
        <button
          class="stat-card stat-filter danger"
          :class="{ active: query.filterType === 'nearDeadline' }"
          type="button"
          @click="toggleQuickFilter('nearDeadline')"
        >
          <span>临近截止</span>
          <strong>{{ nearDeadlineCount }}</strong>
        </button>
      </div>
    </section>

    <section class="notice-list-card">
      <div class="notice-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="query.keyword"
            class="notice-search"
            clearable
            placeholder="搜索公告标题 / 招标编号 / 采购人 / 代理机构"
            :prefix-icon="Search"
            @input="onKeywordInput"
            @keyup.enter="triggerSearch"
            @clear="triggerSearch"
          />
          <el-input
            v-model="query.area"
            class="filter-search"
            clearable
            placeholder="所属地区"
            :prefix-icon="Location"
            @input="onKeywordInput"
            @keyup.enter="triggerSearch"
            @clear="triggerSearch"
          />
        </div>
        <div class="toolbar-right">
          <el-button class="industry-btn" :icon="Setting" @click="openIndustryDialog(false)">
            行业：{{ currentIndustry || '未设置' }}
          </el-button>
          <el-button class="refresh-btn" :icon="Refresh" :loading="loading" @click="loadData">刷新</el-button>
        </div>
      </div>

      <div class="notice-body" v-loading="loading">
        <template v-if="rows.length">
          <div class="notice-grid">
            <article
              v-for="item in rows"
              :key="item.id"
              class="notice-card"
              :class="{ expired: isExpired(item), urgent: isNearDeadline(item) }"
              @click="openDetail(item)"
            >
              <div class="notice-card-head">
                <div class="notice-source">
                  <span class="source-dot" />
                  <span>{{ item.sourceCode || '标讯来源' }}</span>
                </div>
                <div class="notice-head-tags">
                  <el-tag size="small" effect="light" :type="statusTagType(item.status)">
                    {{ statusLabel(item.status) }}
                  </el-tag>
                  <el-tag v-if="deadlineBadge(item)" size="small" effect="light" :type="deadlineBadge(item).type">
                    {{ deadlineBadge(item).label }}
                  </el-tag>
                </div>
              </div>

              <h2 class="notice-title">{{ item.noticeTitle || item.notice_title || '未命名公告' }}</h2>

              <div class="notice-meta-line">
                <span v-if="item.tenderNo"><el-icon><Document /></el-icon>{{ item.tenderNo }}</span>
                <span v-if="item.publishDate"><el-icon><Calendar /></el-icon>{{ formatDate(item.publishDate) }}</span>
                <span v-if="item.province || item.city"><el-icon><Location /></el-icon>{{ areaText(item) }}</span>
              </div>

              <p class="notice-summary">{{ summaryText(item) }}</p>

              <div class="notice-info-grid">
                <div>
                  <span>采购人</span>
                  <strong>{{ item.purchaser || '-' }}</strong>
                </div>
                <div>
                  <span>代理机构</span>
                  <strong>{{ item.agency || '-' }}</strong>
                </div>
                <div>
                  <span>预算金额</span>
                  <strong class="money">{{ moneyText(item.budgetAmount) }}</strong>
                </div>
                <div>
                  <span>截止时间</span>
                  <strong :class="deadlineClass(item)">{{ deadlineText(item.deadline) }}</strong>
                </div>
              </div>

              <div class="notice-card-footer">
                <div class="notice-tags">
                  <el-tag v-if="item.noticeType" size="small" type="primary" effect="plain">{{ item.noticeType }}</el-tag>
                  <el-tag v-if="item.industry" size="small" type="info" effect="plain">{{ item.industry }}</el-tag>
                </div>
                <div class="notice-actions" @click.stop>
                  <el-button link type="success" @click="createAiBid(item)">创建AI标书</el-button>
                  <el-button link type="primary" :icon="View" @click="openDetail(item)">查看详情</el-button>
                </div>
              </div>
            </article>
          </div>
        </template>

        <el-empty v-else description="暂无标讯商机数据" :image-size="140" />
      </div>

      <div class="notice-pager-wrap">
        <div class="pager-summary">
          共 <b>{{ pager.total }}</b> 条，当前第 {{ pager.page }} 页
        </div>
        <el-pagination
          v-model:current-page="pager.page"
          v-model:page-size="pager.size"
          background
          :page-sizes="[10, 20, 30, 50]"
          :total="pager.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="onSizeChange"
          @current-change="onPageChange"
        />
      </div>
    </section>

    <el-drawer
      v-model="detailVisible"
      class="notice-detail-drawer"
      size="720px"
      :with-header="false"
      destroy-on-close
    >
      <template v-if="detail">
        <div class="drawer-head">
          <div>
            <div class="drawer-kicker">标讯详情</div>
            <h2>{{ detail.noticeTitle || detail.notice_title || '未命名公告' }}</h2>
          </div>
          <el-button @click="detailVisible = false">关闭</el-button>
          <el-button type="primary" @click="createAiBid(detail)">创建AI标书</el-button>
        </div>

        <div class="drawer-tags">
          <el-tag effect="light" :type="statusTagType(detail.status)">{{ statusLabel(detail.status) }}</el-tag>
          <el-tag v-if="deadlineBadge(detail)" :type="deadlineBadge(detail).type" effect="light">{{ deadlineBadge(detail).label }}</el-tag>
          <el-tag v-if="detail.noticeType" type="primary" effect="plain">{{ detail.noticeType }}</el-tag>
          <el-tag v-if="detail.industry" type="info" effect="plain">{{ detail.industry }}</el-tag>
        </div>

        <div class="detail-block detail-grid">
          <div class="detail-item">
            <span>招标编号</span>
            <strong>{{ detail.tenderNo || '-' }}</strong>
          </div>
          <div class="detail-item">
            <span>预算金额</span>
            <strong class="money">{{ moneyText(detail.budgetAmount) }}</strong>
          </div>
          <div class="detail-item">
            <span>发布日期</span>
            <strong>{{ formatDate(detail.publishDate) || '-' }}</strong>
          </div>
          <div class="detail-item">
            <span>截止时间</span>
            <strong :class="deadlineClass(detail)">{{ deadlineText(detail.deadline) }}</strong>
          </div>
          <div class="detail-item">
            <span>开标时间</span>
            <strong>{{ formatDateTime(detail.openBidTime) || '-' }}</strong>
          </div>
          <div class="detail-item">
            <span>地区</span>
            <strong>{{ areaText(detail) || '-' }}</strong>
          </div>
        </div>

        <div class="detail-block">
          <h3>采购信息</h3>
          <p><b>采购人：</b>{{ detail.purchaser || '-' }}</p>
          <p><b>代理机构：</b>{{ detail.agency || '-' }}</p>
          <p><b>联系人：</b>{{ contactPersonText(detail) }}</p>
        </div>

        <div v-if="detail.tenderScope" class="detail-block">
          <h3>招标范围</h3>
          <div class="detail-text">{{ detail.tenderScope }}</div>
        </div>

        <div v-if="detail.qualificationRequirements" class="detail-block">
          <h3>资质要求</h3>
          <div class="detail-text">{{ detail.qualificationRequirements }}</div>
        </div>

        <div class="detail-block">
          <h3>正文内容</h3>
          <div class="detail-text">{{ detail.contentText || '暂无正文内容' }}</div>
        </div>

      </template>
    </el-drawer>

    <el-dialog
      v-model="industryDialog.visible"
      :title="currentIndustry ? '变更行业类别' : '请选择行业类别'"
      width="520px"
      :close-on-click-modal="Boolean(currentIndustry)"
      :close-on-press-escape="Boolean(currentIndustry)"
      :show-close="Boolean(currentIndustry)"
      destroy-on-close
    >
      <div class="industry-dialog-tip">
        标讯商机将根据所选行业自动筛选。行业可在页面右上角随时变更。
      </div>
      <el-form label-position="top">
        <el-form-item label="行业类别" required>
          <el-select
            v-model="industryDialog.value"
            filterable
            allow-create
            default-first-option
            placeholder="请选择或输入行业类别"
            style="width: 100%"
          >
            <el-option v-for="item in industryOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button v-if="currentIndustry" @click="industryDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="industryDialog.saving" @click="saveIndustry">保存并查看标讯</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Calendar, Document, Location, Refresh, Search, Setting, View } from '@element-plus/icons-vue'
import { ElMessage } from '@/plugins/element-plus-api'
import { useRouter } from 'vue-router'
import { createBidProjectFromNotice } from '@/api/bidProject'
import {
  getTenderIndustryPreference,
  getTenderNotice,
  listTenderIndustryOptions,
  pageTenderNotices,
  updateTenderIndustryPreference
} from '@/api/tenderNotice'

const loading = ref(false)
const router = useRouter()
const rows = ref([])
const detailVisible = ref(false)
const detail = ref(null)
const query = reactive({ keyword: '', area: '', filterType: '' })
const pager = reactive({ page: 1, size: 20, total: 0 })
const currentIndustry = ref('')
const industryOptions = ref([])
const industryDialog = reactive({ visible: false, value: '', saving: false })
let keywordTimer = null

const currentPageNewCount = computed(() => rows.value.filter((item) => String(item.status || '').toLowerCase() === 'new').length)
const nearDeadlineCount = computed(() => rows.value.filter(isNearDeadline).length)

onMounted(async () => {
  await initializeIndustry()
})

async function initializeIndustry() {
  const [preference, options] = await Promise.all([
    getTenderIndustryPreference(),
    listTenderIndustryOptions()
  ])
  currentIndustry.value = String(preference?.industryCategory || '').trim()
  industryOptions.value = Array.isArray(options) ? options.filter(Boolean) : []
  if (!currentIndustry.value) {
    openIndustryDialog(true)
    return
  }
  await loadData()
}

function openIndustryDialog(required = false) {
  industryDialog.value = currentIndustry.value || ''
  industryDialog.visible = true
}

async function saveIndustry() {
  const value = String(industryDialog.value || '').trim()
  if (!value) {
    ElMessage.warning('请选择行业类别')
    return
  }
  industryDialog.saving = true
  try {
    await updateTenderIndustryPreference(value)
    currentIndustry.value = value
    industryDialog.visible = false
    pager.page = 1
    ElMessage.success('行业类别已保存')
    await loadData()
  } finally {
    industryDialog.saving = false
  }
}

function onKeywordInput() {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(triggerSearch, 300)
}

function triggerSearch() {
  clearTimeout(keywordTimer)
  pager.page = 1
  loadData()
}

function toggleQuickFilter(filterType) {
  query.filterType = query.filterType === filterType ? '' : filterType
  triggerSearch()
}

function onPageChange() {
  loadData()
}

function onSizeChange() {
  pager.page = 1
  loadData()
}

async function loadData() {
  if (!currentIndustry.value) {
    openIndustryDialog(true)
    return
  }
  loading.value = true
  try {
    const keyword = String(query.keyword || '').trim()
    const area = String(query.area || '').trim()
    const res = await pageTenderNotices({
      current: pager.page,
      size: pager.size,
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: keyword || undefined,
      area: area || undefined,
      filterType: query.filterType || undefined
    })
    const records = res?.records || res?.list || res?.rows || []
    rows.value = Array.isArray(records) ? records : []
    pager.total = Number(res?.total || res?.totalRow || res?.count || rows.value.length || 0)
  } finally {
    loading.value = false
  }
}

async function openDetail(row) {
  if (!row?.id) return
  detailVisible.value = true
  detail.value = row
  try {
    detail.value = await getTenderNotice(row.id)
  } catch (e) {
    // 列表数据足够展示时，不强制关闭抽屉。
  }
}

async function createAiBid(row) {
  if (!row?.id) return
  const projectId = await createBidProjectFromNotice(row.id)
  ElMessage.success('已从标讯创建AI标书')
  router.push({ path: '/ai-bid', query: { projectId } })
}

function statusLabel(status) {
  const value = String(status || '').toLowerCase()
  const map = {
    new: '新公告',
    read: '已读',
    reported: '已报备',
    expired: '已过期',
    invalid: '无效'
  }
  return map[value] || status || '未知'
}

function statusTagType(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'new') return 'success'
  if (value === 'reported') return 'primary'
  if (value === 'expired' || value === 'invalid') return 'danger'
  if (value === 'read') return 'info'
  return 'info'
}

function areaText(row = {}) {
  return [row.province, row.city, row.district].filter(Boolean).join(' / ')
}

function contactPersonText(row = {}) {
  return row.contactPerson
    || row.contact_person
    || row.tenderUnitContact
    || row.tender_unit_contact
    || row.contact
    || '-'
}

function summaryText(row = {}) {
  const text = row.tenderScope || row.qualificationRequirements || row.contentText || ''
  const normalized = String(text).replace(/\s+/g, ' ').trim()
  if (!normalized) return '暂无摘要内容，可点击查看详情。'
  return normalized.length > 120 ? `${normalized.slice(0, 120)}...` : normalized
}

function moneyText(value) {
  if (value === null || value === undefined || value === '') return '-'
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return String(value)
  return `¥ ${numberValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(String(value).replace(/-/g, '/'))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function formatDateTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

function deadlineText(value) {
  if (!value) return '-'
  return formatDateTime(value)
}

function isExpired(row = {}) {
  const deadline = parseDate(row.deadline)
  if (!deadline) return String(row.status || '').toLowerCase() === 'expired'
  return deadline.getTime() < Date.now()
}

function isNearDeadline(row = {}) {
  const deadline = parseDate(row.deadline)
  if (!deadline) return false
  const diff = deadline.getTime() - Date.now()
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000
}

function deadlineClass(row = {}) {
  if (isExpired(row)) return 'is-expired'
  if (isNearDeadline(row)) return 'is-urgent'
  return ''
}

function deadlineBadge(row = {}) {
  const deadline = parseDate(row.deadline)
  if (!deadline) return null
  const diff = deadline.getTime() - Date.now()
  if (diff < 0) return { label: '已过期', type: 'info' }
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
  if (days <= 3) return { label: `${days}天内截止`, type: 'danger' }
  if (days <= 7) return { label: `${days}天截止`, type: 'warning' }
  return null
}
</script>

<style scoped>
.tender-notice-page {
  height: calc(100vh - 76px);
  min-height: 640px;
  padding: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, #eef5ff 0%, #f6f9ff 38%, #f8fafc 100%);
  color: #102033;
}

.notice-hero-card,
.notice-list-card {
  border: 1px solid rgba(219, 226, 239, 0.95);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.055);
}

.notice-hero-card {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  margin-bottom: 10px;
  overflow: hidden;
  position: relative;
}

.notice-hero-card::after {
  content: '';
  position: absolute;
  right: -58px;
  top: -86px;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.14), rgba(37, 99, 235, 0));
}

.hero-left {
  position: relative;
  z-index: 1;
  min-width: 0;
  max-width: 760px;
}

.hero-kicker,
.drawer-kicker {
  margin-bottom: 3px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-left h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  color: #07162c;
}

.hero-left p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-stats {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 96px);
  gap: 8px;
  align-items: stretch;
  flex-shrink: 0;
}

.stat-card {
  appearance: none;
  text-align: left;
  font-family: inherit;
  border-radius: 14px;
  padding: 9px 10px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
}

.stat-filter {
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.stat-filter:hover {
  transform: translateY(-1px);
  border-color: #93c5fd;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
}

.stat-filter.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.14);
}

.stat-filter.danger.active {
  border-color: #f97316;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.14);
}

.stat-card span {
  display: block;
  color: #64748b;
  font-size: 12px;
  margin-bottom: 4px;
}

.stat-card strong {
  font-size: 22px;
  line-height: 1;
  color: #0f172a;
}

.stat-card.primary {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.stat-card.primary strong {
  color: #2563eb;
}

.stat-card.danger {
  background: #fff7ed;
  border-color: #fed7aa;
}

.stat-card.danger strong {
  color: #f97316;
}

.notice-list-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.notice-toolbar {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid #edf2f7;
}

.toolbar-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.notice-search {
  width: 420px;
  max-width: 40%;
}

.filter-search {
  width: 180px;
  max-width: 20%;
}

.notice-search :deep(.el-input__wrapper),
.filter-search :deep(.el-input__wrapper) {
  min-height: 36px;
  border-radius: 12px;
  box-shadow: 0 0 0 1px #dbe5f5 inset;
}

.industry-btn {
  max-width: 260px;
  border-color: #c9c2ff;
  color: #5d4ee8;
  background: #f7f5ff;
}

.industry-btn :deep(span) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.industry-dialog-tip {
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #e4e0ff;
  border-radius: 10px;
  color: #5f6473;
  background: #f8f7ff;
  line-height: 1.7;
}

.refresh-btn {
  min-height: 36px;
  border-radius: 10px;
}

.notice-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}

.notice-body::-webkit-scrollbar,
.detail-text::-webkit-scrollbar {
  width: 8px;
}

.notice-body::-webkit-scrollbar-thumb,
.detail-text::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.notice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 12px;
}

.notice-card {
  display: flex;
  flex-direction: column;
  min-height: 220px;
  padding: 14px;
  border: 1px solid #e5edf8;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.notice-card:hover {
  transform: translateY(-2px);
  border-color: #93c5fd;
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.11);
}

.notice-card.urgent {
  border-color: #fdba74;
}

.notice-card.expired {
  opacity: 0.72;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.notice-card-head,
.notice-card-footer,
.notice-meta-line,
.notice-actions,
.notice-tags {
  display: flex;
  align-items: center;
}

.notice-card-head,
.notice-card-footer {
  justify-content: space-between;
  gap: 10px;
}

.notice-source {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.notice-head-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.source-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
}

.notice-title {
  margin: 10px 0 8px;
  min-height: 48px;
  color: #07162c;
  font-size: 17px;
  line-height: 1.42;
  font-weight: 800;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notice-meta-line {
  flex-wrap: wrap;
  gap: 10px;
  color: #64748b;
  font-size: 12px;
}

.notice-meta-line span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.notice-summary {
  margin: 10px 0 12px;
  min-height: 42px;
  color: #475569;
  font-size: 13px;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notice-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: auto;
  padding: 10px;
  border-radius: 14px;
  background: #f8fafc;
}

.notice-info-grid div,
.detail-item {
  min-width: 0;
}

.notice-info-grid span,
.detail-item span {
  display: block;
  margin-bottom: 3px;
  color: #94a3b8;
  font-size: 12px;
}

.notice-info-grid strong,
.detail-item strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.money {
  color: #ef4444 !important;
}

.is-urgent {
  color: #f97316 !important;
}

.is-expired {
  color: #94a3b8 !important;
}

.notice-card-footer {
  margin-top: 12px;
}

.notice-tags {
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.notice-actions {
  flex-shrink: 0;
  gap: 4px;
}

.notice-pager-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-top: 1px solid #edf2f7;
  background: #ffffff;
}

.pager-summary {
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

.pager-summary b {
  color: #2563eb;
}

.notice-pager-wrap :deep(.el-pagination) {
  justify-content: flex-end;
}

:deep(.el-tag) {
  border-radius: 999px;
}

.drawer-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 28px 16px;
  border-bottom: 1px solid #edf2f7;
}

.drawer-head h2 {
  margin: 0;
  color: #07162c;
  font-size: 22px;
  line-height: 1.45;
}

.drawer-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 16px 28px 0;
}

.detail-block {
  margin: 16px 28px 0;
  padding: 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.detail-block h3 {
  margin: 0 0 12px;
  color: #0f172a;
  font-size: 17px;
}

.detail-block p {
  margin: 8px 0;
  color: #334155;
  line-height: 1.75;
}

.detail-text {
  max-height: 420px;
  overflow-y: auto;
  color: #334155;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
}


@media (max-width: 1200px) {
  .notice-hero-card {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-left p {
    white-space: normal;
  }

  .hero-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .notice-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .tender-notice-page {
    height: auto;
    min-height: 100%;
    overflow: visible;
    padding: 10px;
  }

  .notice-toolbar,
  .notice-pager-wrap {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left {
    flex-wrap: wrap;
  }

  .notice-search,
  .filter-search {
    width: 100%;
    max-width: none;
  }

  .notice-body {
    overflow: visible;
  }

  .hero-stats,
  .notice-info-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
