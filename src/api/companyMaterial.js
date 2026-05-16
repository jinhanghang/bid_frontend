import request from '@/utils/request'

export function pageCompanyMaterials(params) {
  return request.get('/company-material/page', { params })
}


export function getCompanyMaterial(id) {
  return request.get(`/company-material/${id}`)
}

export function createCompanyMaterial(data) {
  return request.post('/company-material', data)
}

export function updateCompanyMaterial(id, data) {
  return request.put(`/company-material/${id}`, data)
}

export function attachCompanyMaterialFile(id, fileId) {
  return request.put(`/company-material/${id}/file/${fileId}`)
}

export function deleteCompanyMaterial(id) {
  return request.delete(`/company-material/${id}`)
}
