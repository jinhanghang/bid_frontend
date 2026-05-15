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
        <div class="stat-card">
          <span>本页新公告</span>
          <strong>{{ currentPageNewCount }}</strong>
        </div>
        <div class="stat-card danger">
          <span>临近截止</span>
          <strong>{{ nearDeadlineCount }}</strong>
        </div>
      </div>
    </section>

    <section class="notice-list-card">
      <div class="notice-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="query.keyword"
            class="notice-search"
            clearable
            placeholder="搜索公告标题 / 招标编号 / 采购人 / 代理机构 / 地区"
            :prefix-icon="Search"
            @input="onKeywordInput"
            @keyup.enter="triggerSearch"
            @clear="triggerSearch"
          />
        </div>
        <div class="toolbar-right">
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
                <el-tag size="small" effect="light" :type="statusTagType(item.status)">
                  {{ statusLabel(item.status) }}
                </el-tag>
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
                  <el-button link type="primary" :icon="View" @click="openDetail(item)">查看详情</el-button>
                </div>
              </div>
            </article>
          </div>
        </template>

        <el-empty v-else description="暂无标讯商机数据，请确认爬虫和导入程序是否已执行" :image-size="140" />
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
        </div>

        <div class="drawer-tags">
          <el-tag effect="light" :type="statusTagType(detail.status)">{{ statusLabel(detail.status) }}</el-tag>
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
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Calendar, Document, Location, Refresh, Search, View } from '@element-plus/icons-vue'
import { getTenderNotice, pageTenderNotices } from '@/api/tenderNotice'

const loading = ref(false)
const rows = ref([])
const detailVisible = ref(false)
const detail = ref(null)
const query = reactive({ keyword: '' })
const pager = reactive({ page: 1, size: 20, total: 0 })
let keywordTimer = null

const currentPageNewCount = computed(() => rows.value.filter((item) => String(item.status || '').toLowerCase() === 'new').length)
const nearDeadlineCount = computed(() => rows.value.filter(isNearDeadline).length)

onMounted(() => {
  loadData()
})

function onKeywordInput() {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(triggerSearch, 300)
}

function triggerSearch() {
  clearTimeout(keywordTimer)
  pager.page = 1
  loadData()
}

function onPageChange() {
  loadData()
}

function onSizeChange() {
  pager.page = 1
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    const keyword = String(query.keyword || '').trim()
    const res = await pageTenderNotices({
      current: pager.page,
      size: pager.size,
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: keyword || undefined
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
  border-radius: 14px;
  padding: 9px 10px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
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
}

.notice-search {
  max-width: 620px;
}

.notice-search :deep(.el-input__wrapper) {
  min-height: 36px;
  border-radius: 12px;
  box-shadow: 0 0 0 1px #dbe5f5 inset;
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
  opacity: 0.78;
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
