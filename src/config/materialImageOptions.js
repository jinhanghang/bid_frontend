  export const MATERIAL_IMAGE_CATEGORY_OPTIONS = [
  '项目实景',
  '施工现场',
  '效果图',
  '图纸图表',
  '组织架构',
  '设备设施',
  '安全文明',
  '质量管理',
  '进度计划',
  '企业资质',
  '人员证书',
  '其他'
]

export const MATERIAL_IMAGE_CHAPTER_OPTIONS = [
  '项目概述',
  '施工组织设计',
  '施工部署',
  '施工进度计划',
  '资源配置',
  '质量保证措施',
  '安全文明施工',
  '环境保护措施',
  '项目管理机构',
  '企业业绩',
  '人员配置',
  '其他'
]

export const MATERIAL_IMAGE_TAG_SUGGESTIONS = [
  '项目背景',
  '施工现场',
  '塔吊',
  '设备配置',
  '进度计划',
  '质量控制',
  '安全通道',
  '文明施工',
  '组织架构',
  '人员配置',
  '企业资质',
  '业绩案例',
  '总平面图',
  '效果图'
]

const CHAPTER_RECOMMEND_RULES = [
  { keywords: ['安全', '文明', '防护', '应急'], category: '安全文明', chapterType: '安全文明施工' },
  { keywords: ['质量', '验收', '检测', '控制'], category: '质量管理', chapterType: '质量保证措施' },
  { keywords: ['进度', '工期', '计划', '节点'], category: '进度计划', chapterType: '施工进度计划' },
  { keywords: ['资源', '设备', '机械', '材料'], category: '设备设施', chapterType: '资源配置' },
  { keywords: ['组织', '机构', '管理体系', '项目经理'], category: '组织架构', chapterType: '项目管理机构' },
  { keywords: ['人员', '团队', '岗位'], category: '人员证书', chapterType: '人员配置' },
  { keywords: ['业绩', '案例', '类似项目'], category: '项目实景', chapterType: '企业业绩' },
  { keywords: ['部署', '施工组织', '施工方案'], category: '施工现场', chapterType: '施工部署' },
  { keywords: ['概述', '背景', '范围', '需求', '项目理解'], category: '项目实景', chapterType: '项目概述' }
]

export function inferMaterialImageRecommendation(title = '') {
  const text = String(title || '')
  const matched = CHAPTER_RECOMMEND_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)))
  if (matched) return { ...matched, matched: true }
  return { category: '', chapterType: '', matched: false }
}
