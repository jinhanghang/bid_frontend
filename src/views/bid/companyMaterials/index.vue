<template>
  <div class="page material-archive-page">
    <div v-if="showEnterpriseRequiredGuide" class="enterprise-required-card card">
      <div class="enterprise-required-icon">
        <el-icon><FolderOpened /></el-icon>
      </div>
      <h2>企业资料库需要先加入企业</h2>
      <p>普通用户可以查看本企业资料，但不能维护或下载企业资料附件。当前账号尚未绑定企业，请先提交加入企业或注册企业申请。</p>
      <div class="enterprise-required-actions">
        <el-button type="primary" :icon="Plus" @click="goEnterpriseApply">申请加入 / 注册企业</el-button>
        <el-button @click="loadCurrentUser">刷新用户状态</el-button>
      </div>
    </div>
    <div v-else class="archive-shell">
      <aside class="archive-sidebar card">
        <div class="sidebar-head">
          <div>
            <div class="sidebar-title">我的资料库</div>
            <div class="sidebar-desc">企业资料、证书、业绩、财务数据统一维护</div>
          </div>
          <el-button class="icon-btn" text :icon="Refresh" @click="loadArchives(selectedArchive?.id)" />
        </div>

        <el-input
          v-model="filters.keyword"
          class="archive-search"
          placeholder="搜索资料档案"
          clearable
          :prefix-icon="Search"
          @input="onKeywordInput"
        />


        <el-select
          v-if="canManagePlatform"
          v-model="filters.enterpriseId"
          class="enterprise-filter"
          clearable
          filterable
          remote
          reserve-keyword
          :remote-method="remoteSearchEnterprises"
          :loading="enterpriseLoading"
          popper-class="enterprise-select-popper"
          placeholder="按企业筛选"
          @visible-change="onEnterpriseVisibleChange"
          @popup-scroll="onEnterprisePopupScroll"
          @change="onEnterpriseFilterChange"
        >
          <el-option
            v-for="item in enterprises"
            :key="item.id"
            :label="item.enterpriseName"
            :value="item.id"
          />
          <el-option v-if="enterprisePager.hasMore" :value="ENTERPRISE_LOAD_MORE_VALUE" label="加载更多企业" class="enterprise-load-more-option">
            <div class="select-load-more" @mousedown.prevent.stop @click.prevent.stop="loadMoreEnterprises">
              {{ enterpriseLoading ? '正在加载...' : '加载更多企业' }}
            </div>
          </el-option>
        </el-select>

        <div v-loading="loading && archiveList.length === 0" class="archive-list" @scroll="onArchiveListScroll">
          <div
            v-for="item in archiveList"
            :key="item.id"
            class="archive-card"
            :class="{ active: selectedArchive?.id === item.id }"
            @click="selectArchive(item)"
          >
            <div class="archive-icon-wrap">
              <el-icon><FolderOpened /></el-icon>
            </div>
            <div class="archive-info">
              <div class="archive-name">{{ archiveTitle(item) }}</div>
              <div class="archive-time">{{ item.updateTime || item.createTime || '-' }}</div>
              <div class="archive-tags">
                <el-tag size="small" effect="light">{{ materialTypeLabel(item.materialType) }}</el-tag>
                <el-tag v-if="Number(item.fileExists) === 1" size="small" type="success" effect="light">有附件</el-tag>
                <el-tag v-else-if="item.fileId" size="small" type="danger" effect="light">附件丢失</el-tag>
                <el-tag size="small" :type="availabilityTagType(item.availabilityStatus)" effect="light">{{ availabilityText(item.availabilityStatus) }}</el-tag>
              </div>
            </div>
            <el-dropdown v-if="canEditArchive(item) || canManageCompanyMaterial" trigger="click" @click.stop>
              <span class="archive-more">•••</span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="canEditArchive(item)" @click="selectArchive(item)">编辑资料</el-dropdown-item>
                  <el-dropdown-item v-if="canManageCompanyMaterial" divided @click="removeArchive(item)">删除资料</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <el-empty v-if="!loading && archiveList.length === 0" description="暂无资料档案" :image-size="90" />

          <div v-if="archiveList.length > 0" class="archive-load-state">
            <span v-if="appendLoading">正在加载更多...</span>
            <span v-else-if="noMore">已加载全部</span>
          </div>
        </div>

        <div class="sidebar-footer">
          <div class="total-line">共 {{ pager.total }} 个资料档案</div>
          <el-button v-if="canManageCompanyMaterial" type="primary" class="create-btn" :icon="Plus" @click="openCreate">
            新建资料档案
          </el-button>
        </div>
      </aside>

      <main class="archive-main card">
        <template v-if="editMode">
          <div class="detail-topbar">
            <div class="back-btn" @click="closeDetail">
              <el-icon><Back /></el-icon>
              <span>返回</span>
            </div>
            <div class="top-divider"></div>
            <div class="top-title-wrap">
              <div class="top-title">{{ currentTitle }}</div>
              <div class="top-subtitle">
                {{ selectedArchive?.enterpriseName || currentEnterpriseName || '企业资料' }}
                <span v-if="profile.meta.description"> · {{ profile.meta.description }}</span>
              </div>
            </div>
            <el-tag v-if="formDirty" type="warning" effect="light">有未保存修改</el-tag>
            <div class="top-spacer"></div>
            <div class="top-actions">
              <el-button :icon="View" :disabled="!canDownloadArchiveFile(selectedArchive)" @click="openFile(selectedArchive)">下载/查看附件</el-button>
              <el-button v-if="canEditCurrentArchive" plain :disabled="!selectedArchive?.fileId" @click="openKnowledgeLinkDialog">加入知识库</el-button>
              <el-button v-if="canEditCurrentArchive" :icon="Upload" @click="showUpload = !showUpload">添加文件</el-button>
              <el-button v-if="canEditCurrentArchive" type="primary" :loading="saving" @click="saveArchive">保存修改</el-button>
            </div>
          </div>

          <div v-if="showUpload" class="upload-row">
            <div class="upload-card">
              <div class="upload-card__title">上传资料附件</div>
              <div class="upload-card__desc">一个档案暂关联一个主附件，适合上传营业执照、证书扫描件、业绩合同或财务资料。</div>
              <FileUploadBox
                v-if="canEditCurrentArchive && profile.id"
                module-type="company_material"
                :biz-id="profile.id"
                :private-flag="true"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
                :max-count="1"
                :max-size-mb="50"
                tip="支持 PDF、Word、Excel、图片和压缩包；单个文件不超过 50MB。"
                @success="onUploadSuccess"
              />
              <el-alert
                v-else
                title="请先保存资料档案，再上传附件。"
                type="info"
                show-icon
                :closable="false"
              />
            </div>
            <div class="file-preview-card">
              <div class="file-preview-title">当前附件</div>
              <template v-if="selectedArchive?.fileId && Number(selectedArchive.fileExists) === 1">
                <div class="file-mini">
                  <div class="file-ext">{{ fileExtLabel(selectedArchive.fileExt) }}</div>
                  <div class="file-mini-info">
                    <strong>{{ selectedArchive.originalName || selectedArchive.fileName || '附件' }}</strong>
                    <span>{{ formatFileSize(selectedArchive.fileSize) }} · {{ canDownloadArchiveFile(selectedArchive) ? '管理员可下载' : '普通用户不可下载' }}</span>
                  </div>
                </div>
              </template>
              <el-empty v-else description="暂无可用附件" :image-size="70" />
            </div>
          </div>

          <div class="workspace">
            <nav class="section-nav">
              <div
                v-for="tab in tabs"
                :key="tab.key"
                class="section-nav-item"
                :class="{ active: activeTab === tab.key }"
                @click="activeTab = tab.key"
              >
                <el-icon><component :is="tab.icon" /></el-icon>
                <span>{{ tab.label }}</span>
              </div>
            </nav>

            <section class="section-panel">
              <template v-if="activeTab === 'license'">
                <div class="panel-head">
                  <div>
                    <h3>营业执照</h3>
                    <p>维护企业注册信息，后续标书、AI方案可直接引用。</p>
                  </div>
                </div>
                <el-form label-position="top" class="archive-form" :disabled="!canEditCurrentArchive">
                  <div class="form-grid four">
                    <el-form-item v-if="canManagePlatform" label="所属企业" required>
                      <el-select
                        v-model="profile.enterpriseId"
                        filterable
                        remote
                        reserve-keyword
                        clearable
                        :remote-method="remoteSearchEnterprises"
                        :loading="enterpriseLoading"
                        popper-class="enterprise-select-popper"
                        placeholder="请选择企业"
                        style="width: 100%"
                        @visible-change="onEnterpriseVisibleChange"
                        @popup-scroll="onEnterprisePopupScroll"
                        @change="onProfileEnterpriseChange"
                      >
                        <el-option v-for="item in enterprises" :key="item.id" :label="item.enterpriseName" :value="item.id" />
                        <el-option v-if="enterprisePager.hasMore" :value="ENTERPRISE_LOAD_MORE_VALUE" label="加载更多企业" class="enterprise-load-more-option">
                          <div class="select-load-more" @mousedown.prevent.stop @click.prevent.stop="loadMoreEnterprises">
                            {{ enterpriseLoading ? '正在加载...' : '加载更多企业' }}
                          </div>
                        </el-option>
                      </el-select>
                    </el-form-item>
                    <el-form-item label="企业名称" required>
                      <el-input v-model="profile.license.companyName" placeholder="请输入企业名称" />
                    </el-form-item>
                    <el-form-item label="统一信用代码" required>
                      <el-input v-model="profile.license.creditCode" placeholder="请输入统一社会信用代码" />
                    </el-form-item>
                    <el-form-item label="法定代表人" required>
                      <el-input v-model="profile.license.legalRepresentative" placeholder="请输入法定代表人" />
                    </el-form-item>
                    <el-form-item label="注册资金（万元）">
                      <el-input-number v-model="profile.license.registeredCapital" :min="0" controls-position="right" style="width: 100%" />
                    </el-form-item>
                    <el-form-item label="企业性质" required>
                      <el-select v-model="profile.license.enterpriseNature" placeholder="请选择" style="width: 100%">
                        <el-option v-for="item in enterpriseNatureOptions" :key="item" :label="item" :value="item" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="企业注册地址" required>
                      <el-input v-model="profile.license.registeredAddress" placeholder="请输入注册地址" />
                    </el-form-item>
                    <el-form-item label="登记机关">
                      <el-input v-model="profile.license.registrationAuthority" placeholder="请输入登记机关" />
                    </el-form-item>
                    <el-form-item label="成立时间">
                      <el-date-picker v-model="profile.license.establishDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
                    </el-form-item>
                    <el-form-item label="登记日期">
                      <el-date-picker v-model="profile.license.registerDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
                    </el-form-item>
                    <el-form-item label="营业截止时间">
                      <el-radio-group v-model="profile.license.businessTerm">
                        <el-radio label="有限期">有限期</el-radio>
                        <el-radio label="长期">长期</el-radio>
                      </el-radio-group>
                    </el-form-item>
                    <el-form-item label="企业邮箱">
                      <el-input v-model="profile.license.email" placeholder="请输入企业邮箱" />
                    </el-form-item>
                    <el-form-item label="经营范围" class="col-span-2">
                      <el-input v-model="profile.license.businessScope" type="textarea" :rows="2" placeholder="请输入经营范围" />
                    </el-form-item>
                    <el-form-item label="资料描述" class="col-span-2">
                      <el-input v-model="profile.meta.description" type="textarea" :rows="2" placeholder="例如：企业资料、恒鼎智慧测试企业、暂无描述" />
                    </el-form-item>
                  </div>
                </el-form>
              </template>

              <template v-else-if="activeTab === 'company'">
                <div class="panel-head">
                  <div>
                    <h3>企业信息</h3>
                    <p>补充企业规模、行业、地址、联系方式和投标人员结构。</p>
                  </div>
                </div>
                <el-form label-position="top" class="archive-form" :disabled="!canEditCurrentArchive">
                  <div class="form-grid four">
                    <el-form-item label="企业规模">
                      <el-select v-model="profile.company.scale" placeholder="请选择" style="width: 100%">
                        <el-option v-for="item in scaleOptions" :key="item" :label="item" :value="item" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="行业分类">
                      <el-input v-model="profile.company.industry" placeholder="请输入行业分类" />
                    </el-form-item>
                    <el-form-item label="公司地址">
                      <el-input v-model="profile.company.address" placeholder="请输入公司地址" />
                    </el-form-item>
                    <el-form-item label="公司网址">
                      <el-input v-model="profile.company.website" placeholder="请输入公司网址" />
                    </el-form-item>
                    <el-form-item label="企业联系电话">
                      <el-input v-model="profile.company.phone" placeholder="请输入联系电话" />
                    </el-form-item>
                    <el-form-item label="企业邮政编码">
                      <el-input v-model="profile.company.postCode" placeholder="请输入邮编" />
                    </el-form-item>
                    <el-form-item label="企业传真">
                      <el-input v-model="profile.company.fax" placeholder="请输入传真" />
                    </el-form-item>
                    <el-form-item label="生产安全许可证有效期">
                      <el-date-picker v-model="profile.company.safetyLicenseRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width: 100%" />
                    </el-form-item>
                    <el-form-item label="投标员工总人数">
                      <el-input-number v-model="profile.company.bidStaffTotal" :min="0" controls-position="right" style="width: 100%" />
                    </el-form-item>
                    <el-form-item label="投标高级职称人数">
                      <el-input-number v-model="profile.company.seniorTitleCount" :min="0" controls-position="right" style="width: 100%" />
                    </el-form-item>
                    <el-form-item label="投标中级职称人数">
                      <el-input-number v-model="profile.company.middleTitleCount" :min="0" controls-position="right" style="width: 100%" />
                    </el-form-item>
                    <el-form-item label="投标初级职称人数">
                      <el-input-number v-model="profile.company.juniorTitleCount" :min="0" controls-position="right" style="width: 100%" />
                    </el-form-item>
                    <el-form-item label="投标技工人数">
                      <el-input-number v-model="profile.company.workerCount" :min="0" controls-position="right" style="width: 100%" />
                    </el-form-item>
                    <el-form-item label="投标项目经理人数">
                      <el-input-number v-model="profile.company.projectManagerCount" :min="0" controls-position="right" style="width: 100%" />
                    </el-form-item>
                  </div>
                </el-form>
              </template>

              <template v-else-if="activeTab === 'bank'">
                <div class="panel-head">
                  <div>
                    <h3>开户信息</h3>
                    <p>维护开户名称、银行、账号和开户地址。</p>
                  </div>
                </div>
                <el-form label-position="top" class="archive-form" :disabled="!canEditCurrentArchive">
                  <div class="form-grid four">
                    <el-form-item label="开户名称" required>
                      <el-input v-model="profile.bank.accountName" placeholder="请输入开户名称" />
                    </el-form-item>
                    <el-form-item label="开户银行" required>
                      <el-input v-model="profile.bank.bankName" placeholder="请输入开户银行" />
                    </el-form-item>
                    <el-form-item label="开户账号" required>
                      <el-input v-model="profile.bank.accountNo" placeholder="请输入开户账号" />
                    </el-form-item>
                    <el-form-item label="开户银行地址">
                      <el-input v-model="profile.bank.bankAddress" placeholder="请输入开户银行地址" />
                    </el-form-item>
                    <el-form-item label="开户银行电话">
                      <el-input v-model="profile.bank.bankPhone" placeholder="请输入开户银行电话" />
                    </el-form-item>
                  </div>
                </el-form>
              </template>

              <template v-else>
                <div class="panel-head table-panel-head">
                  <div>
                    <h3>{{ activeTableMeta.label }}</h3>
                    <p>{{ activeTableMeta.desc }}</p>
                  </div>
                  <div class="panel-actions">
                    <el-button :icon="Refresh" @click="loadArchives(selectedArchive?.id)">刷新</el-button>
                    <el-button v-if="canEditCurrentArchive" type="primary" :icon="Plus" @click="openRecordDialog(activeTab)">新增数据</el-button>
                  </div>
                </div>

                <el-table class="ui-table archive-data-table" :data="activeTableRows" border height="calc(100vh - 392px)">
                  <el-table-column
                    v-for="col in activeTableMeta.columns"
                    :key="col.prop"
                    :prop="col.prop"
                    :label="col.label"
                    :width="col.width"
                    :min-width="col.minWidth || 130"
                    show-overflow-tooltip
                  >
                    <template #default="{ row }">
                      {{ displayCell(row, col) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="120" fixed="right">
                    <template #default="{ row, $index }">
                      <el-button link type="primary" @click="openRecordDialog(activeTab, row, $index)">编辑</el-button>
                      <el-button v-if="canEditCurrentArchive" link type="danger" @click="removeRecord(activeTab, $index)">删除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </template>

              <div class="fixed-save-bar" v-if="canEditCurrentArchive">
                <el-button @click="resetCurrentArchive">重置</el-button>
                <el-button type="primary" :loading="saving" @click="saveArchive">保存修改</el-button>
              </div>
            </section>
          </div>
        </template>

        <template v-else>
          <div class="empty-landing">
            <div class="landing-card">
              <div class="landing-step">
                <div class="landing-icon"><el-icon><Document /></el-icon></div>
                <strong>选择档案</strong>
                <span>左侧列表选择资料档案后再进入编辑。</span>
              </div>
              <div class="landing-step">
                <div class="landing-icon"><el-icon><DataAnalysis /></el-icon></div>
                <strong>分区维护</strong>
                <span>营业执照、企业信息、证书和业绩分开管理。</span>
              </div>
              <div class="landing-step">
                <div class="landing-icon"><el-icon><Briefcase /></el-icon></div>
                <strong>沉淀复用</strong>
                <span>后续标书和 AI 内容可直接引用企业素材。</span>
              </div>
            </div>
            <el-button v-if="canManageCompanyMaterial" class="landing-create-btn" type="primary" :icon="Plus" @click="openCreate">
              新建资料档案
            </el-button>
          </div>
        </template>
      </main>
    </div>



    <el-dialog v-model="knowledgeLinkDialog.visible" title="加入知识库" width="560px" append-to-body destroy-on-close>
      <el-alert type="info" :closable="false" show-icon class="knowledge-link-alert" title="将当前企业资料附件作为知识库文件入库，后续 AI标书和知识问答可检索引用。" />
      <el-select
        v-model="knowledgeLinkDialog.knowledgeBaseId"
        filterable
        remote
        reserve-keyword
        placeholder="请选择同企业知识库"
        style="width: 100%"
        :loading="knowledgeLinkDialog.loading"
        :remote-method="remoteSearchKnowledgeBases"
        @visible-change="onKnowledgeBaseVisibleChange"
        @popup-scroll="onKnowledgeBasePopupScroll"
        @change="onKnowledgeBaseSelectChange"
      >
        <el-option v-for="kb in knowledgeLinkDialog.options" :key="kb.id" :label="kb.kbName" :value="kb.id" />
        <el-option v-if="knowledgeLinkDialog.hasMore" :value="KNOWLEDGE_BASE_LOAD_MORE_VALUE" label="加载更多知识库" class="enterprise-load-more-option">
          <div class="select-load-more" @mousedown.prevent.stop @click.prevent.stop="loadMoreKnowledgeBases">
            {{ knowledgeLinkDialog.loading ? '正在加载...' : '加载更多知识库' }}
          </div>
        </el-option>
      </el-select>
      <template #footer>
        <el-button @click="knowledgeLinkDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="knowledgeLinkDialog.saving" :disabled="!knowledgeLinkDialog.knowledgeBaseId" @click="confirmAddToKnowledge">确认入库</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="recordDialog.visible" :title="recordDialogTitle" width="980px" class="material-record-dialog" destroy-on-close>
      <el-form label-position="top" class="dialog-form">
        <div class="form-grid three">
          <el-form-item
            v-for="field in recordDialog.fields"
            :key="field.prop"
            :label="field.label"
            :required="field.required"
            :class="{ 'col-span-2': field.span === 2, 'col-span-3': field.span === 3 }"
          >
            <el-input
              v-if="!field.type || field.type === 'input'"
              v-model="recordDialog.form[field.prop]"
              :placeholder="`请输入${field.label}`"
            />
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="recordDialog.form[field.prop]"
              type="textarea"
              :rows="field.rows || 2"
              :placeholder="`请输入${field.label}`"
            />
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="recordDialog.form[field.prop]"
              :min="0"
              controls-position="right"
              style="width: 100%"
            />
            <el-select
              v-else-if="field.type === 'select'"
              v-model="recordDialog.form[field.prop]"
              :placeholder="`请选择${field.label}`"
              style="width: 100%"
            >
              <el-option v-for="option in field.options || []" :key="option" :label="option" :value="option" />
            </el-select>
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="recordDialog.form[field.prop]"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 100%"
            />
            <el-date-picker
              v-else-if="field.type === 'month'"
              v-model="recordDialog.form[field.prop]"
              type="month"
              value-format="YYYY-MM"
              placeholder="选择月份"
              style="width: 100%"
            />
            <el-date-picker
              v-else-if="field.type === 'daterange'"
              v-model="recordDialog.form[field.prop]"
              type="daterange"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="结束"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="recordDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveRecord">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from '@/plugins/element-plus-api'
import {
  Back,
  Briefcase,
  CreditCard,
  DataAnalysis,
  Document,
  Files,
  FolderOpened,
  Plus,
  Refresh,
  Search,
  Upload,
  User,
  View
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { pageEnterprises } from '@/api/enterprise'
import { pageKnowledgeBases } from '@/api/knowledge'
import {
  attachCompanyMaterialFile,
  createCompanyMaterial,
  deleteCompanyMaterial,
  getCompanyMaterial,
  addCompanyMaterialToKnowledge,
  pageCompanyMaterials,
  updateCompanyMaterial
} from '@/api/companyMaterial'
import FileUploadBox from '@/components/FileUploadBox.vue'
import { downloadFileBlob } from '@/api/file'

const router = useRouter()
const auth = useAuthStore()
const ROLE_SUPER_ADMIN = 'SUPERADMIN'
const ROLE_PLATFORM_ADMIN = 'PLATFORMADMIN'
const ROLE_ENTERPRISE_ADMIN = 'ENTERPRISEADMIN'
const CONTENT_VERSION = 'MATERIAL_ARCHIVE_V1'
const ENTERPRISE_PAGE_SIZE = 50
const KNOWLEDGE_BASE_PAGE_SIZE = 50
const ENTERPRISE_LOAD_MORE_VALUE = '__LOAD_MORE_ENTERPRISE__'
const KNOWLEDGE_BASE_LOAD_MORE_VALUE = '__LOAD_MORE_KNOWLEDGE_BASE__'

const loading = ref(false)
const appendLoading = ref(false)
const enterpriseLoading = ref(false)
const saving = ref(false)
const editMode = ref(false)
const showUpload = ref(false)
const activeTab = ref('license')
const archiveList = ref([])
const enterprises = ref([])
const selectedArchive = ref(null)
const keywordTimer = ref(null)
const enterpriseKeywordTimer = ref(null)
const knowledgeBaseKeywordTimer = ref(null)
const profileSnapshot = ref('')
const enterpriseScrollRaf = ref(0)
const enterpriseRequestSeq = ref(0)
const knowledgeBaseRequestSeq = ref(0)
const lastEnterpriseFilterId = ref('')
const lastProfileEnterpriseId = ref('')
const lastKnowledgeBaseId = ref('')
const knowledgeLinkDialog = reactive({
  visible: false,
  loading: false,
  saving: false,
  knowledgeBaseId: '',
  options: [],
  page: 1,
  size: KNOWLEDGE_BASE_PAGE_SIZE,
  total: 0,
  pages: 0,
  keyword: '',
  hasMore: false
})

const filters = reactive({
  keyword: '',
  enterpriseId: ''
})

const enterprisePager = reactive({
  page: 1,
  size: ENTERPRISE_PAGE_SIZE,
  total: 0,
  pages: 0,
  keyword: '',
  hasMore: false
})

const pager = reactive({
  page: 1,
  size: 20,
  total: 0
})

const profile = reactive(defaultProfile())

const tabs = [
  { key: 'license', label: '营业执照', icon: Document },
  { key: 'company', label: '企业信息', icon: Files },
  { key: 'bank', label: '开户信息', icon: CreditCard },
  { key: 'members', label: '项目成员', icon: User },
  { key: 'certificates', label: '企业证书', icon: Document },
  { key: 'cases', label: '企业业绩', icon: Briefcase },
  { key: 'financials', label: '财务资料', icon: DataAnalysis }
]

const tableMetas = {
  members: {
    label: '项目成员',
    desc: '维护项目经理、技术负责人、法人代表和投标人员信息。',
    listKey: 'members',
    columns: [
      { label: '姓名', prop: 'name', minWidth: 120 },
      { label: '身份证号码', prop: 'idNumber', minWidth: 170 },
      { label: '性别', prop: 'gender', width: 90 },
      { label: '职务', prop: 'position', minWidth: 130 },
      { label: '是否法人', prop: 'isLegalPerson', width: 100 },
      { label: '人员归属', prop: 'belong', minWidth: 120 },
      { label: '人员状态', prop: 'status', minWidth: 110 },
      { label: '联系方式', prop: 'phone', minWidth: 130 },
      { label: '劳动合同时间', prop: 'contractRange', minWidth: 190, type: 'range' }
    ],
    fields: [
      { label: '姓名', prop: 'name', required: true },
      { label: '身份证号码', prop: 'idNumber', required: true },
      { label: '性别', prop: 'gender', type: 'select', options: ['男', '女'] },
      { label: '职务', prop: 'position', type: 'select', options: ['法人代表', '项目经理', '技术负责人', '商务负责人', '实施工程师', '售后工程师', '其他'], required: true },
      { label: '是否法人', prop: 'isLegalPerson', type: 'select', options: ['是', '否'], required: true },
      { label: '人员归属', prop: 'belong', type: 'select', options: ['总部', '分公司', '项目部', '外聘', '其他'], required: true },
      { label: '人员状态', prop: 'status', type: 'select', options: ['在职', '离职', '待入职', '停用'] },
      { label: '联系方式', prop: 'phone' },
      { label: '个人介绍', prop: 'intro', type: 'textarea', span: 2 },
      { label: '劳动合同时间', prop: 'contractRange', type: 'daterange' }
    ]
  },
  certificates: {
    label: '企业证书',
    desc: '维护企业资质证书、体系认证、行业许可证和证书有效期。',
    listKey: 'certificates',
    columns: [
      { label: '证书编号', prop: 'certNo', minWidth: 150 },
      { label: '证书名称', prop: 'certName', minWidth: 180 },
      { label: '证书类别', prop: 'certCategory', minWidth: 140 },
      { label: '发证机关', prop: 'issuingAuthority', minWidth: 180 },
      { label: '发证日期', prop: 'issueDate', minWidth: 120 },
      { label: '有效日期', prop: 'validDate', minWidth: 120 },
      { label: '证书状态', prop: 'status', minWidth: 110 }
    ],
    fields: [
      { label: '证书编号', prop: 'certNo', required: true },
      { label: '证书名称', prop: 'certName', required: true },
      { label: '证书类别', prop: 'certCategory', type: 'select', options: ['营业执照', '体系认证', '行业资质', '安全许可证', '软件著作权', '其他'], required: true },
      { label: '发证机关', prop: 'issuingAuthority', required: true },
      { label: '发证日期', prop: 'issueDate', type: 'date', required: true },
      { label: '有效日期', prop: 'validDate', type: 'date', required: true },
      { label: '证书状态', prop: 'status', type: 'select', options: ['有效', '即将到期', '已过期', '停用'], required: true }
    ]
  },
  cases: {
    label: '企业业绩',
    desc: '维护招投标项目、中标金额、合同金额、结算金额和工程特征指标。',
    listKey: 'cases',
    columns: [
      { label: '招标项目编号', prop: 'projectNo', minWidth: 150 },
      { label: '招标项目名称', prop: 'projectName', minWidth: 200 },
      { label: '项目所在地', prop: 'location', minWidth: 140 },
      { label: '建设单位名称', prop: 'ownerName', minWidth: 180 },
      { label: '项目状态', prop: 'status', minWidth: 110 },
      { label: '合同金额（万元）', prop: 'contractAmount', minWidth: 140 }
    ],
    fields: [
      { label: '招标项目编号', prop: 'projectNo', required: true },
      { label: '招标项目名称', prop: 'projectName', required: true },
      { label: '项目所在地', prop: 'location' },
      { label: '业绩分类', prop: 'category' },
      { label: '建设单位名称', prop: 'ownerName', required: true },
      { label: '建设单位联系人', prop: 'ownerContact' },
      { label: '建设单位联系电话', prop: 'ownerPhone' },
      { label: '项目状态', prop: 'status', type: 'select', options: ['在建', '已完工', '已验收', '已结算'], required: true },
      { label: '开工日期-竣工日期', prop: 'dateRange', type: 'daterange' },
      { label: '竣工备案/验收编号', prop: 'completionNo' },
      { label: '招标金额（万元）', prop: 'tenderAmount', type: 'number' },
      { label: '中标金额（万元）', prop: 'winAmount', type: 'number' },
      { label: '合同金额（万元）', prop: 'contractAmount', type: 'number', required: true },
      { label: '结算金额（万元）', prop: 'settlementAmount', type: 'number' },
      { label: '实际面积（平方米）', prop: 'area', type: 'number' },
      { label: '工程质量', prop: 'quality' },
      { label: '工程造价（万元）', prop: 'cost', type: 'number' },
      { label: '其他工程特征指标', prop: 'indicators' },
      { label: '项目负责人', prop: 'projectLeader' },
      { label: '技术负责人', prop: 'techLeader' },
      { label: '备注', prop: 'remark', type: 'textarea', span: 3 }
    ]
  },
  financials: {
    label: '财务资料',
    desc: '维护资产负债表、利润表、现金流量表、审计报告等财务信息。',
    listKey: 'financials',
    columns: [
      { label: '财务信息类别', prop: 'financialCategory', minWidth: 160 },
      { label: '财务信息名称', prop: 'financialName', minWidth: 200 },
      { label: '时间', prop: 'month', minWidth: 120 },
      { label: '备注', prop: 'remark', minWidth: 220 }
    ],
    fields: [
      { label: '财务信息类别', prop: 'financialCategory', type: 'select', options: ['资产负债表', '利润表', '现金流量表', '审计报告', '纳税证明', '银行资信证明', '其他'], required: true },
      { label: '财务信息名称', prop: 'financialName', required: true },
      { label: '时间', prop: 'month', type: 'month', required: true },
      { label: '备注', prop: 'remark', type: 'textarea', span: 3 }
    ]
  }
}

const enterpriseNatureOptions = ['有限责任公司', '股份有限公司', '国有企业', '集体企业', '合伙企业', '个人独资企业', '其他']
const scaleOptions = ['20人以下', '20-99人', '100-499人', '500-999人', '1000人以上']

const recordDialog = reactive({
  visible: false,
  section: '',
  index: -1,
  fields: [],
  form: {}
})

const currentRoleCodes = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []))
// 资料库里的企业筛选和企业切换只给超级管理员、平台管理员使用。
// 企业管理员、普通用户都固定在当前企业范围内，不展示跨企业筛选。
const canManagePlatform = computed(() => currentRoleCodes.value.includes(ROLE_SUPER_ADMIN) || currentRoleCodes.value.includes(ROLE_PLATFORM_ADMIN))
const canManageCompanyMaterial = computed(() => canManagePlatform.value || currentRoleCodes.value.includes(ROLE_ENTERPRISE_ADMIN))
const hasEnterprise = computed(() => Boolean(auth.user?.enterpriseId))
const showEnterpriseRequiredGuide = computed(() => !canManagePlatform.value && !hasEnterprise.value)
const canEditCurrentArchive = computed(() => canManageCompanyMaterial.value && (!selectedArchive.value?.id || Boolean(selectedArchive.value?.canEdit)))
const currentTitle = computed(() => profile.license.companyName || selectedArchive.value?.title || '未命名资料档案')
const currentEnterpriseName = computed(() => enterprises.value.find((item) => String(item.id) === String(profile.enterpriseId))?.enterpriseName || '')
const formDirty = computed(() => editMode.value && profileSnapshot.value && profileSnapshot.value !== snapshotProfile())
const activeTableMeta = computed(() => tableMetas[activeTab.value] || tableMetas.members)
const activeTableRows = computed(() => profile[activeTableMeta.value.listKey] || [])
const recordDialogTitle = computed(() => `${recordDialog.index >= 0 ? '编辑' : '新增'}${tableMetas[recordDialog.section]?.label || '数据'}`)
const noMore = computed(() => pager.total > 0 && archiveList.value.length >= pager.total)

function canEditArchive(item) {
  return canManageCompanyMaterial.value && Boolean(item?.canEdit)
}

onMounted(async () => {
  if (showEnterpriseRequiredGuide.value) return
  await loadEnterprises()
  await loadArchives()
})

onBeforeUnmount(() => {
  clearTimeout(keywordTimer.value)
  clearTimeout(enterpriseKeywordTimer.value)
  clearTimeout(knowledgeBaseKeywordTimer.value)
  if (enterpriseScrollRaf.value) window.cancelAnimationFrame(enterpriseScrollRaf.value)
})

function defaultProfile() {
  return {
    id: null,
    enterpriseId: '',
    status: 1,
    meta: {
      description: '',
      sourceMaterialType: 'COMPANY_PROFILE'
    },
    license: {
      companyName: '',
      creditCode: '',
      legalRepresentative: '',
      registeredCapital: 0,
      enterpriseNature: '',
      registeredAddress: '',
      registrationAuthority: '',
      establishDate: '',
      registerDate: '',
      businessTerm: '长期',
      email: '',
      businessScope: ''
    },
    company: {
      scale: '',
      industry: '',
      address: '',
      website: '',
      phone: '',
      postCode: '',
      fax: '',
      safetyLicenseRange: [],
      bidStaffTotal: 0,
      seniorTitleCount: 0,
      middleTitleCount: 0,
      juniorTitleCount: 0,
      workerCount: 0,
      projectManagerCount: 0
    },
    bank: {
      accountName: '',
      bankName: '',
      accountNo: '',
      bankAddress: '',
      bankPhone: ''
    },
    members: [],
    certificates: [],
    cases: [],
    financials: []
  }
}

async function loadEnterprises(keyword = '', options = {}) {
  if (!canManagePlatform.value) {
    enterprises.value = []
    enterprisePager.page = 1
    enterprisePager.total = 0
    enterprisePager.pages = 0
    enterprisePager.keyword = ''
    enterprisePager.hasMore = false
    return
  }

  const append = Boolean(options.append)
  const queryKeyword = String(keyword || '').trim()
  if (append && (!enterprisePager.hasMore || enterpriseLoading.value)) return

  const pageToLoad = append ? enterprisePager.page + 1 : 1
  const requestSeq = ++enterpriseRequestSeq.value
  enterpriseLoading.value = true
  try {
    const res = await pageEnterprises({
      current: pageToLoad,
      size: enterprisePager.size,
      pageNum: pageToLoad,
      pageSize: enterprisePager.size,
      status: 1,
      keyword: queryKeyword || undefined
    })

    const records = normalizeEnterpriseRecords(res)
    const total = normalizeEnterpriseTotal(res)
    const pages = normalizeEnterprisePages(res)
    if (requestSeq !== enterpriseRequestSeq.value) return

    enterprisePager.page = pageToLoad
    enterprisePager.total = total
    enterprisePager.pages = pages
    enterprisePager.keyword = queryKeyword

    if (append) {
      enterprises.value = mergeEnterpriseRecords(enterprises.value, records)
    } else {
      enterprises.value = mergeEnterpriseRecords([], records)
    }

    enterprisePager.hasMore = pages > 0
      ? pageToLoad < pages
      : (total > 0 ? enterprises.value.length < total : records.length >= enterprisePager.size)
  } catch (e) {
    if (requestSeq === enterpriseRequestSeq.value) {
      if (append) {
        enterprisePager.hasMore = false
      } else {
        enterprises.value = []
        enterprisePager.page = 1
        enterprisePager.total = 0
        enterprisePager.pages = 0
        enterprisePager.hasMore = false
      }
    }
  } finally {
    if (requestSeq === enterpriseRequestSeq.value) {
      enterpriseLoading.value = false
    }
  }
}

function normalizeEnterpriseRecords(res) {
  if (Array.isArray(res?.records)) return res.records
  if (Array.isArray(res?.list)) return res.list
  if (Array.isArray(res?.rows)) return res.rows
  if (Array.isArray(res)) return res
  return []
}

function normalizeEnterpriseTotal(res) {
  const value = res?.total ?? res?.totalCount ?? res?.count
  const total = Number(value)
  return Number.isFinite(total) && total >= 0 ? total : 0
}

function normalizeEnterprisePages(res) {
  const value = res?.pages ?? res?.totalPage ?? res?.totalPages
  const pages = Number(value)
  return Number.isFinite(pages) && pages >= 0 ? pages : 0
}

function mergeEnterpriseRecords(oldList = [], newList = []) {
  const map = new Map()
  oldList.concat(newList).forEach((item) => {
    if (!item?.id) return
    map.set(String(item.id), item)
  })
  return Array.from(map.values())
}

function remoteSearchEnterprises(keyword = '') {
  if (!canManagePlatform.value) return
  clearTimeout(enterpriseKeywordTimer.value)
  enterpriseKeywordTimer.value = setTimeout(() => loadEnterprises(keyword), 300)
}

function onEnterpriseVisibleChange(visible) {
  if (!canManagePlatform.value) return
  if (visible) {
    lastEnterpriseFilterId.value = filters.enterpriseId || ''
    lastProfileEnterpriseId.value = profile.enterpriseId || ''
    if (enterprises.value.length === 0) {
      loadEnterprises(enterprisePager.keyword)
    }
  }
}

function onEnterpriseFilterChange(value) {
  if (value === ENTERPRISE_LOAD_MORE_VALUE) {
    filters.enterpriseId = lastEnterpriseFilterId.value || ''
    loadMoreEnterprises()
    return
  }
  lastEnterpriseFilterId.value = value || ''
  reloadFirstPage()
}

function onProfileEnterpriseChange(value) {
  if (value === ENTERPRISE_LOAD_MORE_VALUE) {
    profile.enterpriseId = lastProfileEnterpriseId.value || ''
    loadMoreEnterprises()
    return
  }
  lastProfileEnterpriseId.value = value || ''
}

function onEnterprisePopupScroll(event) {
  const scrollEl = event?.target || event
  if (!scrollEl) return

  if (enterpriseScrollRaf.value) return
  enterpriseScrollRaf.value = window.requestAnimationFrame(() => {
    enterpriseScrollRaf.value = 0
    maybeLoadMoreEnterprises(scrollEl)
  })
}

function maybeLoadMoreEnterprises(scrollEl) {
  if (!canManagePlatform.value || enterpriseLoading.value || !enterprisePager.hasMore) return
  const scrollTop = Number(scrollEl.scrollTop || 0)
  const scrollHeight = Number(scrollEl.scrollHeight || 0)
  const clientHeight = Number(scrollEl.clientHeight || 0)
  if (!scrollHeight || !clientHeight) return

  const remain = scrollHeight - scrollTop - clientHeight
  if (remain <= 48) {
    loadMoreEnterprises()
  }
}

function loadMoreEnterprises() {
  if (!canManagePlatform.value || enterpriseLoading.value || !enterprisePager.hasMore) return
  loadEnterprises(enterprisePager.keyword, { append: true })
}

function ensureEnterpriseOption(id, name) {
  if (!canManagePlatform.value || !id) return
  const exists = enterprises.value.some((item) => String(item.id) === String(id))
  if (!exists) {
    enterprises.value = [{ id, enterpriseName: name || String(id) }].concat(enterprises.value)
  }
}

function onKeywordInput() {
  clearTimeout(keywordTimer.value)
  keywordTimer.value = setTimeout(() => reloadFirstPage(), 300)
}

function reloadFirstPage() {
  pager.page = 1
  archiveList.value = []
  loadArchives()
}

function onArchiveListScroll(event) {
  const el = event?.target
  if (!el || loading.value || appendLoading.value || noMore.value) return

  // 距离底部 80px 内开始加载下一页，保持左侧原布局，只追加列表数据。
  const remain = el.scrollHeight - el.scrollTop - el.clientHeight
  if (remain <= 80) {
    loadArchives(null, { append: true })
  }
}

async function loadArchives(selectId, options = {}) {
  if (showEnterpriseRequiredGuide.value) {
    archiveList.value = []
    pager.total = 0
    return
  }
  const append = Boolean(options.append)
  if ((append && noMore.value) || loading.value || appendLoading.value) return

  const pageToLoad = append ? pager.page + 1 : 1
  if (append) {
    appendLoading.value = true
  } else {
    loading.value = true
  }

  try {
    const res = await pageCompanyMaterials({
      current: pageToLoad,
      size: pager.size,
      pageNum: pageToLoad,
      pageSize: pager.size,
      keyword: filters.keyword || undefined,
      enterpriseId: filters.enterpriseId || undefined
    })

    const records = Array.isArray(res?.records) ? res.records : []
    pager.page = pageToLoad
    pager.total = Number(res?.total || 0)

    if (append) {
      const exists = new Set(archiveList.value.map((item) => String(item.id)))
      archiveList.value = archiveList.value.concat(records.filter((item) => item?.id && !exists.has(String(item.id))))
      return
    }

    archiveList.value = records

    const targetId = selectId || selectedArchive.value?.id
    if (targetId) {
      const target = archiveList.value.find((item) => String(item.id) === String(targetId))
      if (target) {
        await selectArchive(target, { skipConfirm: true })
        return
      }
    }

    // 进入资料库页面时不再默认打开第一条资料档案，先让用户在左侧自行选择。
    if (!archiveList.value.length && !formDirty.value) {
      closeDetail()
    }
  } finally {
    if (append) {
      appendLoading.value = false
    } else {
      loading.value = false
    }
  }
}


function availabilityText(status) {
  const map = {
    AVAILABLE: '可用',
    EXPIRING: '即将到期',
    EXPIRED: '已过期',
    NO_FILE: '无附件',
    DISABLED: '停用'
  }
  return map[String(status || '').toUpperCase()] || '待确认'
}

function availabilityTagType(status) {
  const value = String(status || '').toUpperCase()
  if (value === 'AVAILABLE') return 'success'
  if (value === 'EXPIRING') return 'warning'
  if (value === 'EXPIRED' || value === 'NO_FILE') return 'danger'
  return 'info'
}

async function openKnowledgeLinkDialog() {
  if (!canEditCurrentArchive.value) {
    ElMessage.warning('当前账号无权将企业资料加入知识库')
    return
  }
  if (!selectedArchive.value?.id) return
  if (!selectedArchive.value?.fileId) {
    ElMessage.warning('请先上传资料附件')
    return
  }
  knowledgeLinkDialog.visible = true
  knowledgeLinkDialog.knowledgeBaseId = selectedArchive.value.knowledgeBaseId || ''
  lastKnowledgeBaseId.value = knowledgeLinkDialog.knowledgeBaseId || ''
  await loadKnowledgeBaseOptions('', { append: false })
}

function remoteSearchKnowledgeBases(keyword = '') {
  clearTimeout(knowledgeBaseKeywordTimer.value)
  knowledgeBaseKeywordTimer.value = setTimeout(() => loadKnowledgeBaseOptions(keyword, { append: false }), 300)
}

function onKnowledgeBaseVisibleChange(visible) {
  if (visible && knowledgeLinkDialog.options.length === 0) {
    loadKnowledgeBaseOptions(knowledgeLinkDialog.keyword || '', { append: false })
  }
}

function onKnowledgeBasePopupScroll(event) {
  const el = event?.target || event
  if (!el || knowledgeLinkDialog.loading || !knowledgeLinkDialog.hasMore) return
  const remain = Number(el.scrollHeight || 0) - Number(el.scrollTop || 0) - Number(el.clientHeight || 0)
  if (remain <= 48) {
    loadMoreKnowledgeBases()
  }
}

function onKnowledgeBaseSelectChange(value) {
  if (value === KNOWLEDGE_BASE_LOAD_MORE_VALUE) {
    knowledgeLinkDialog.knowledgeBaseId = lastKnowledgeBaseId.value || ''
    loadMoreKnowledgeBases()
    return
  }
  lastKnowledgeBaseId.value = value || ''
}

function loadMoreKnowledgeBases() {
  if (knowledgeLinkDialog.loading || !knowledgeLinkDialog.hasMore) return
  loadKnowledgeBaseOptions(knowledgeLinkDialog.keyword, { append: true })
}

async function loadKnowledgeBaseOptions(keyword = '', options = {}) {
  const append = Boolean(options.append)
  const queryKeyword = String(keyword || '').trim()
  if (append && (!knowledgeLinkDialog.hasMore || knowledgeLinkDialog.loading)) return
  const pageToLoad = append ? knowledgeLinkDialog.page + 1 : 1
  const requestSeq = ++knowledgeBaseRequestSeq.value
  knowledgeLinkDialog.loading = true
  try {
    const res = await pageKnowledgeBases({
      enterpriseId: selectedArchive.value?.enterpriseId || undefined,
      keyword: queryKeyword || undefined,
      pageNum: pageToLoad,
      pageSize: knowledgeLinkDialog.size,
      current: pageToLoad,
      size: knowledgeLinkDialog.size
    })
    if (requestSeq !== knowledgeBaseRequestSeq.value) return

    const records = normalizeKnowledgeBaseRecords(res)
    const total = Number(res?.total || 0)
    const pages = Number(res?.pages || res?.totalPage || res?.totalPages || 0)
    knowledgeLinkDialog.page = pageToLoad
    knowledgeLinkDialog.total = Number.isFinite(total) && total >= 0 ? total : 0
    knowledgeLinkDialog.pages = Number.isFinite(pages) && pages >= 0 ? pages : 0
    knowledgeLinkDialog.keyword = queryKeyword
    knowledgeLinkDialog.options = append
      ? mergeKnowledgeBaseRecords(knowledgeLinkDialog.options, records)
      : mergeKnowledgeBaseRecords([], records)
    knowledgeLinkDialog.hasMore = knowledgeLinkDialog.pages > 0
      ? pageToLoad < knowledgeLinkDialog.pages
      : (knowledgeLinkDialog.total > 0 ? knowledgeLinkDialog.options.length < knowledgeLinkDialog.total : records.length >= knowledgeLinkDialog.size)
  } finally {
    if (requestSeq === knowledgeBaseRequestSeq.value) {
      knowledgeLinkDialog.loading = false
    }
  }
}

function normalizeKnowledgeBaseRecords(res) {
  if (Array.isArray(res?.records)) return res.records
  if (Array.isArray(res?.list)) return res.list
  if (Array.isArray(res?.rows)) return res.rows
  if (Array.isArray(res)) return res
  return []
}

function mergeKnowledgeBaseRecords(oldList = [], newList = []) {
  const map = new Map()
  oldList.concat(newList).forEach((item) => {
    if (!item?.id) return
    map.set(String(item.id), item)
  })
  return Array.from(map.values())
}

async function confirmAddToKnowledge() {
  if (!selectedArchive.value?.id || !knowledgeLinkDialog.knowledgeBaseId) return
  knowledgeLinkDialog.saving = true
  try {
    await addCompanyMaterialToKnowledge(selectedArchive.value.id, { knowledgeBaseId: knowledgeLinkDialog.knowledgeBaseId })
    ElMessage.success('已加入知识库并开始入库解析')
    knowledgeLinkDialog.visible = false
    await loadArchives(selectedArchive.value.id)
  } finally {
    knowledgeLinkDialog.saving = false
  }
}

async function selectArchive(row, options = {}) {
  if (!row?.id) return
  if (!options.skipConfirm && selectedArchive.value?.id !== row.id && !(await confirmDiscardChanges())) return
  const detail = await getCompanyMaterial(row.id)
  ensureEnterpriseOption(detail?.enterpriseId, detail?.enterpriseName)
  selectedArchive.value = detail
  fillProfileFromMaterial(detail)
  editMode.value = true
  showUpload.value = false
  activeTab.value = 'license'
}

async function openCreate() {
  if (!canManageCompanyMaterial.value) {
    ElMessage.warning('普通用户只能查看资料库，不能新增资料')
    return
  }
  if (!(await confirmDiscardChanges())) return
  selectedArchive.value = null
  fillProfile({
    ...defaultProfile(),
    enterpriseId: canManagePlatform.value ? (filters.enterpriseId || '') : (auth.user?.enterpriseId || '')
  })
  editMode.value = true
  activeTab.value = 'license'
  showUpload.value = false
  await nextTick()
}

async function loadCurrentUser() {
  await auth.loadMe()
  if (!showEnterpriseRequiredGuide.value) {
    await loadEnterprises()
    await loadArchives()
  }
}

function goEnterpriseApply() {
  router.push('/system/enterprise-apply')
}

function closeDetail() {
  editMode.value = false
  selectedArchive.value = null
  fillProfile(defaultProfile())
  markProfileSnapshot()
}

async function resetCurrentArchive() {
  if (!formDirty.value) return
  try {
    await ElMessageBox.confirm('确定放弃当前未保存修改吗？', '重置确认', { type: 'warning' })
  } catch (e) {
    return
  }
  if (selectedArchive.value?.id) {
    fillProfileFromMaterial(selectedArchive.value)
  } else {
    fillProfile(defaultProfile())
  }
}

function fillProfileFromMaterial(material) {
  const parsed = parseMaterialContent(material)
  fillProfile(parsed)
}

function fillProfile(next = {}) {
  const clean = defaultProfile()
  const merged = deepMerge(clean, next)
  Object.assign(profile, merged)
  profile.members = Array.isArray(merged.members) ? merged.members : []
  profile.certificates = Array.isArray(merged.certificates) ? merged.certificates : []
  profile.cases = Array.isArray(merged.cases) ? merged.cases : []
  profile.financials = Array.isArray(merged.financials) ? merged.financials : []
  markProfileSnapshot()
}

function parseMaterialContent(material = {}) {
  const base = defaultProfile()
  base.id = material.id || null
  base.enterpriseId = material.enterpriseId || (canManagePlatform.value ? filters.enterpriseId : auth.user?.enterpriseId) || ''
  base.status = material.status === 0 ? 0 : 1
  base.meta.sourceMaterialType = material.materialType || 'COMPANY_PROFILE'
  base.meta.description = material.remark || ''
  base.license.companyName = material.title || ''
  base.license.establishDate = material.validStartDate || ''
  base.license.registerDate = material.validStartDate || ''

  if (!material.content) return base

  try {
    const parsed = JSON.parse(material.content)
    if (parsed?.version === CONTENT_VERSION && parsed.profile) {
      return deepMerge(base, parsed.profile)
    }
    if (parsed?.license || parsed?.company || parsed?.bank) {
      return deepMerge(base, parsed)
    }
  } catch (e) {
    // 兼容旧资料正文，作为描述保留。
  }

  base.meta.description = material.content
  base.license.businessScope = material.content
  return base
}

function snapshotProfile() {
  return JSON.stringify(normalizeProfileForSave())
}

function markProfileSnapshot() {
  profileSnapshot.value = snapshotProfile()
}

function normalizeProfileForSave() {
  return JSON.parse(JSON.stringify(profile))
}

async function confirmDiscardChanges() {
  if (!formDirty.value) return true
  try {
    await ElMessageBox.confirm('当前资料档案有未保存修改，切换后会丢失，是否继续？', '未保存修改', { type: 'warning' })
    return true
  } catch (e) {
    return false
  }
}

async function saveArchive() {
  if (!canEditCurrentArchive.value) {
    ElMessage.warning('当前账号无权编辑该企业资料')
    return
  }
  if (!profile.enterpriseId && canManagePlatform.value) {
    ElMessage.warning('请选择所属企业')
    activeTab.value = 'license'
    return
  }
  if (!profile.license.companyName) {
    ElMessage.warning('请输入企业名称')
    activeTab.value = 'license'
    return
  }

  saving.value = true
  try {
    const payloadProfile = normalizeProfileForSave()
    const payload = {
      enterpriseId: canManagePlatform.value ? payloadProfile.enterpriseId : (auth.user?.enterpriseId || payloadProfile.enterpriseId),
      materialType: payloadProfile.meta.sourceMaterialType || 'COMPANY_PROFILE',
      title: payloadProfile.license.companyName,
      content: JSON.stringify({ version: CONTENT_VERSION, profile: payloadProfile }, null, 2),
      fileId: selectedArchive.value?.fileId || null,
      validStartDate: payloadProfile.license.establishDate || null,
      validEndDate: payloadProfile.license.businessTerm === '长期' ? null : (payloadProfile.license.registerDate || null),
      status: payloadProfile.status,
      remark: payloadProfile.meta.description || null
    }

    let savedId = profile.id
    if (profile.id) {
      await updateCompanyMaterial(profile.id, payload)
      ElMessage.success('资料档案已保存')
    } else {
      savedId = await createCompanyMaterial(payload)
      ElMessage.success('资料档案已创建')
    }
    await loadArchives(savedId)
  } finally {
    saving.value = false
  }
}

async function onUploadSuccess(file) {
  if (!canEditCurrentArchive.value) {
    ElMessage.warning('当前账号无权编辑该企业资料')
    return
  }
  if (!profile.id) {
    ElMessage.warning('请先保存资料档案')
    return
  }
  await attachCompanyMaterialFile(profile.id, file.id)
  ElMessage.success('附件已关联到资料档案')
  await loadArchives(profile.id)
}

async function removeArchive(row) {
  if (!canManageCompanyMaterial.value) {
    ElMessage.warning('普通用户只能查看资料库，不能删除资料')
    return
  }
  await ElMessageBox.confirm(`确认删除资料档案「${archiveTitle(row)}」吗？`, '删除确认', { type: 'warning' })
  await deleteCompanyMaterial(row.id)
  ElMessage.success('资料档案已删除')
  if (selectedArchive.value?.id === row.id) closeDetail()
  await loadArchives()
}

function openRecordDialog(section, row = null, index = -1) {
  if (!canEditCurrentArchive.value) {
    ElMessage.warning('当前账号无权编辑该企业资料')
    return
  }
  const meta = tableMetas[section]
  if (!meta) return
  recordDialog.section = section
  recordDialog.index = index
  recordDialog.fields = meta.fields
  recordDialog.form = buildRecordForm(meta.fields, row)
  recordDialog.visible = true
}

function buildRecordForm(fields = [], row = null) {
  const target = {}
  fields.forEach((field) => {
    if (field.type === 'number') target[field.prop] = 0
    else if (field.type === 'daterange') target[field.prop] = []
    else target[field.prop] = ''
  })
  return Object.assign(target, row || {})
}

function saveRecord() {
  const meta = tableMetas[recordDialog.section]
  if (!meta) return
  const missing = meta.fields.find((field) => field.required && !recordDialog.form[field.prop])
  if (missing) {
    ElMessage.warning(`请填写${missing.label}`)
    return
  }
  const list = profile[meta.listKey]
  const row = JSON.parse(JSON.stringify(recordDialog.form))
  if (recordDialog.index >= 0) {
    list.splice(recordDialog.index, 1, row)
  } else {
    list.push(row)
  }
  recordDialog.visible = false
}

async function removeRecord(section, index) {
  if (!canEditCurrentArchive.value) {
    ElMessage.warning('当前账号无权编辑该企业资料')
    return
  }
  const meta = tableMetas[section]
  if (!meta) return
  try {
    await ElMessageBox.confirm('确认删除这条数据吗？', '删除确认', { type: 'warning' })
  } catch (e) {
    return
  }
  profile[meta.listKey].splice(index, 1)
}

function displayCell(row, col) {
  if (col.prop === 'action') return ''
  const value = row?.[col.prop]
  if (col.type === 'range') {
    return Array.isArray(value) && value.length ? value.join(' 至 ') : '-'
  }
  if (Array.isArray(value)) return value.join(' 至 ')
  return value === undefined || value === null || value === '' ? '-' : value
}

function archiveTitle(item) {
  const parsed = parseMaterialContent(item)
  return parsed.license.companyName || item?.title || '未命名资料档案'
}

function materialTypeLabel(value) {
  const map = {
    COMPANY_PROFILE: '企业档案',
    QUALIFICATION: '资质证书',
    PERSON_CERT: '人员证书',
    CASE: '项目业绩',
    HONOR: '荣誉奖项',
    AFTER_SALE: '售后服务',
    TEAM: '实施团队',
    OTHER: '其他资料'
  }
  return map[value] || value || '企业档案'
}

async function openFile(row) {
  if (!row?.fileId || Number(row.fileExists) !== 1) {
    ElMessage.warning('附件已丢失或未上传')
    return
  }
  if (!canDownloadArchiveFile(row)) {
    ElMessage.warning('普通用户不能下载企业资料附件')
    return
  }
  const blob = await downloadFileBlob(row.fileId)
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

function canDownloadArchiveFile(row) {
  return canManageCompanyMaterial.value && Boolean(row?.fileId && Number(row.fileExists) === 1)
}

function fileExtLabel(ext) {
  const value = String(ext || 'FILE').toUpperCase()
  return value.length > 4 ? value.slice(0, 4) : value
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (!value) return '0 B'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function deepMerge(target, source) {
  const output = Array.isArray(target) ? [...target] : { ...target }
  if (!source || typeof source !== 'object') return output
  Object.keys(source).forEach((key) => {
    const value = source[key]
    if (Array.isArray(value)) {
      output[key] = [...value]
    } else if (value && typeof value === 'object') {
      output[key] = deepMerge(output[key] && typeof output[key] === 'object' ? output[key] : {}, value)
    } else if (value !== undefined) {
      output[key] = value
    }
  })
  return output
}

function normalizeRoleCode(value = '') {
  return String(value).trim().toUpperCase().replace(/^ROLE[_-]?/, '').replace(/[^A-Z0-9]/g, '')
}

function normalizeRoleList(values = []) {
  if (!Array.isArray(values)) return []
  return values.map((item) => {
    if (typeof item === 'string') return normalizeRoleCode(item)
    return normalizeRoleCode(item?.roleCode || item?.code || item?.authority || item?.name || '')
  }).filter(Boolean)
}
</script>

<style scoped>
.material-archive-page {
  height: 100%;
  min-height: 0;
  padding: 18px 0 0 18px;
  overflow: hidden;
}

.enterprise-required-card {
  min-height: 420px;
  margin-right: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
}

.enterprise-required-icon {
  width: 72px;
  height: 72px;
  border-radius: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #eef4ff;
  color: #2563eb;
  font-size: 34px;
  margin-bottom: 18px;
}

.enterprise-required-card h2 {
  margin: 0 0 10px;
  font-size: 22px;
  color: #1f2937;
}

.enterprise-required-card p {
  max-width: 620px;
  margin: 0;
  color: #64748b;
  line-height: 1.8;
}

.enterprise-required-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

.archive-shell {
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.archive-sidebar,
.archive-main {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.archive-sidebar {
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
}

.sidebar-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 900;
  color: var(--text-main);
}

.sidebar-desc {
  margin-top: 5px;
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.5;
}

.icon-btn {
  width: 30px;
  height: 30px;
}

.archive-search,
.enterprise-filter {
  width: 100%;
  margin-top: 12px;
}

.archive-list {
  margin-top: 14px;
  flex: 1;
  overflow: auto;
  padding-right: 4px;
}

.archive-load-state {
  padding: 8px 0 4px;
  text-align: center;
  font-size: 12px;
  color: var(--text-sub);
}

.archive-card {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 13px 10px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.18s ease;
  margin-bottom: 10px;
}

.archive-card:hover,
.archive-card.active {
  border-color: #8ab4ff;
  background: #edf5ff;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.10);
}

.archive-icon-wrap {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #dbeafe, #f3e8ff);
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.archive-info {
  min-width: 0;
  flex: 1;
}

.archive-name {
  font-weight: 900;
  color: #1f2937;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.archive-time {
  margin-top: 5px;
  font-size: 12px;
  color: var(--text-sub);
}

.archive-tags {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.archive-more {
  color: #6b7280;
  font-weight: 900;
  line-height: 1;
}

.sidebar-footer {
  border-top: 1px solid #edf2f7;
  padding-top: 12px;
}

.total-line {
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 10px;
  text-align: center;
}

.create-btn {
  width: 100%;
  height: 42px;
}

.archive-main {
  display: flex;
  flex-direction: column;
  background: #fff;
}

.detail-topbar {
  min-height: 64px;
  padding: 10px 22px;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  cursor: pointer;
  color: #111827;
}

.top-divider {
  width: 4px;
  height: 28px;
  border-radius: 10px;
  background: #2563eb;
}

.top-title-wrap {
  min-width: 0;
}

.top-title {
  font-size: 18px;
  font-weight: 900;
  color: #111827;
  line-height: 1.25;
}

.top-subtitle {
  margin-top: 3px;
  max-width: 620px;
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-spacer {
  flex: 1;
}

.top-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.upload-row {
  margin: 14px 22px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 14px;
}

.upload-card,
.file-preview-card {
  border: 1px dashed #b7cdfd;
  background: #f7fbff;
  border-radius: 16px;
  padding: 14px;
}

.upload-card__title,
.file-preview-title {
  font-weight: 900;
  color: #1f2937;
}

.upload-card__desc {
  margin: 6px 0 10px;
  color: #64748b;
  font-size: 12px;
}

.file-mini {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 12px;
}

.file-ext {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #dbeafe;
  color: #2563eb;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-mini-info {
  min-width: 0;
}

.file-mini-info strong,
.file-mini-info span {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.file-mini-info span {
  color: #64748b;
  font-size: 12px;
  margin-top: 4px;
}

.workspace {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  flex: 1;
  min-height: 0;
  margin-top: 0;
  border-top: 0;
}

.section-nav {
  border-right: 1px solid #eef2f7;
  padding: 16px 12px;
  background: #fbfdff;
}

.section-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  color: #334155;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.18s ease;
  font-weight: 700;
}

.section-nav-item + .section-nav-item {
  margin-top: 6px;
}

.section-nav-item:hover,
.section-nav-item.active {
  color: #2563eb;
  background: #eff6ff;
}

.section-panel {
  position: relative;
  min-width: 0;
  padding: 20px 22px 74px;
  overflow: auto;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-head h3 {
  margin: 0;
  font-size: 20px;
  color: #111827;
}

.panel-head p {
  margin: 6px 0 0;
  color: #64748b;
  line-height: 1.5;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.form-grid {
  display: grid;
  gap: 12px 18px;
}

.form-grid.four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.form-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.col-span-2 {
  grid-column: span 2;
}

.col-span-3 {
  grid-column: span 3;
}

.archive-data-table {
  width: 100%;
}

.fixed-save-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 58px;
  border-top: 1px solid #eef2f7;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.empty-landing {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 34px;
}

.landing-card {
  transform: translateY(-25%);
  position: relative;
  width: min(720px, 72%);
  min-height: 150px;
  border-radius: 22px;
  overflow: hidden;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  padding: 20px 28px;
  background:
    radial-gradient(circle at 84% 28%, rgba(37, 99, 235, 0.13), transparent 9%),
    radial-gradient(circle at 92% 72%, rgba(99, 102, 241, 0.13), transparent 11%),
    linear-gradient(135deg, #f8fbff 0%, #edf6ff 52%, #e8f2ff 100%);
  box-shadow: 0 14px 36px rgba(37, 99, 235, 0.08);
}

.landing-card::after {
  content: '';
  position: absolute;
  right: 58px;
  top: -128px;
  width: 320px;
  height: 320px;
  border: 1px solid rgba(37, 99, 235, 0.10);
  border-radius: 50%;
  pointer-events: none;
}

.landing-step {
  position: relative;
  z-index: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 6px 18px;
}

.landing-step + .landing-step::before {
  content: '';
  position: absolute;
  left: 0;
  top: 24px;
  bottom: 24px;
  width: 1px;
  background: linear-gradient(to bottom, transparent, rgba(37, 99, 235, 0.16), transparent);
}

.landing-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.12);
}

.landing-icon .el-icon {
  font-size: 26px;
}

.landing-step strong {
  font-size: 16px;
  color: #1f2937;
}

.landing-step span {
  color: #64748b;
  font-size: 13px;
  line-height: 1.65;
}

.landing-create-btn {
  min-width: 150px;
  height: 38px;
  margin-top: 4px;
  transform: translateY(-8px);
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.18);
}



.select-load-more {
  width: 100%;
  text-align: center;
  color: #2563eb;
  cursor: pointer;
}

.enterprise-load-more-option {
  text-align: center;
}

.knowledge-link-alert {
  margin-bottom: 12px;
}

@media (max-width: 1280px) {
  .archive-shell {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .form-grid.four {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .upload-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .archive-shell,
  .workspace {
    grid-template-columns: 1fr;
  }

  .section-nav {
    border-right: 0;
    border-bottom: 1px solid #eef2f7;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .landing-steps,
  .form-grid.three,
  .form-grid.four {
    grid-template-columns: 1fr;
  }

  .col-span-2,
  .col-span-3 {
    grid-column: span 1;
  }
}
</style>

