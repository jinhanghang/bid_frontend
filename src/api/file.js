import request from '@/utils/request'

export function uploadFile({ file, moduleType = 'other', bizId, privateFlag = true }) {
  const form = new FormData()
  form.append('file', file)
  form.append('moduleType', moduleType)
  form.append('privateFlag', String(privateFlag))
  if (bizId !== null && bizId !== undefined && bizId !== '') {
    form.append('bizId', bizId)
  }

  return request.post('/files/upload', form, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function pageFileResources(params) {
  return request.get('/file-resource/page', { params })
}

export function listFileResources(params) {
  return request.get('/file-resource/list', { params })
}

export function getFileResource(id) {
  return request.get(`/file-resource/${id}`)
}

export function updateFileResource(id, data) {
  return request.put(`/file-resource/${id}`, data)
}

export function updateFileResourceStatus(id, data) {
  return request.put(`/file-resource/${id}/status`, data)
}

export function deleteFileResource(id) {
  return request.delete(`/file-resource/${id}`)
}