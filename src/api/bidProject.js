import request from '@/utils/request'

/**
 * 标书项目分页
 */
export function pageBidProjects(params) {
  return request.get('/bid-project/page', { params })
}

/**
 * 标书项目详情
 */
export function getBidProject(id) {
  return request.get(`/bid-project/${id}`)
}

/**
 * 新增标书项目
 */
export function createBidProject(data) {
  return request.post('/bid-project', data)
}

/**
 * 修改标书项目
 */
export function updateBidProject(id, data) {
  return request.put(`/bid-project/${id}`, data)
}

/**
 * 修改标书项目状态
 */
export function updateBidProjectStatus(id, data) {
  return request.put(`/bid-project/${id}/status`, data)
}

/**
 * 删除标书项目
 */
export function deleteBidProject(id) {
  return request.delete(`/bid-project/${id}`)
}

/**
 * 项目资料分页
 */
export function pageProjectMaterials(params) {
  return request.get('/project-material/page', { params })
}

/**
 * 项目资料列表
 */
export function listProjectMaterials(params) {
  return request.get('/project-material/list', { params })
}

/**
 * 添加项目资料
 */
export function createProjectMaterial(data) {
  return request.post('/project-material', data)
}

/**
 * 项目资料加入知识库
 */
export function addProjectMaterialToKnowledge(id, data) {
  return request.post(`/project-material/${id}/to-knowledge`, data)
}

/**
 * 删除项目资料
 */
export function deleteProjectMaterial(id) {
  return request.delete(`/project-material/${id}`)
}