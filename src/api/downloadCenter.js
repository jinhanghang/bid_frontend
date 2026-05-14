import request from '@/utils/request'

export function pageDownloadFiles(params) {
  return request.get('/download-center/page', { params })
}

export function downloadCenterFile(id) {
  return request.get(`/download-center/download/${id}`, {
    responseType: 'blob'
  })
}

export function deleteDownloadFile(id) {
  return request.delete(`/download-center/${id}`)
}
