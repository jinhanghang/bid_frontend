import request from '@/utils/request'

export function pageMaterialImages(params) {
  return request.get('/material-images/page', { params })
}

export function getMaterialImage(id) {
  return request.get(`/material-images/${id}`)
}

export function uploadMaterialImage({ file, enterpriseId, imageName, category, tags, scene, chapterType, description }) {
  const form = new FormData()
  form.append('file', file)
  if (enterpriseId) form.append('enterpriseId', enterpriseId)
  if (imageName) form.append('imageName', imageName)
  if (category) form.append('category', category)
  if (tags) form.append('tags', tags)
  if (scene) form.append('scene', scene)
  if (chapterType) form.append('chapterType', chapterType)
  if (description) form.append('description', description)
  return request.post('/material-images/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0
  })
}

export function updateMaterialImage(id, data) {
  return request.put(`/material-images/${id}`, data || {})
}

export function getMaterialImageReferences(id) {
  return request.get(`/material-images/${id}/references`)
}

export function deleteMaterialImage(id) {
  return request.delete(`/material-images/${id}`)
}

export function onlineSearchMaterialImages(params) {
  return request.get('/material-images/online-search', { params })
}

export function importOnlineMaterialImage(data) {
  return request.post('/material-images/online-search/import', data || {})
}
