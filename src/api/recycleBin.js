import request from '@/utils/request'

export function pageRecycleBin(params) {
  return request.get('/recycle-bin/page', { params })
}

export function restoreRecycleItem(id) {
  return request.post('/recycle-bin/restore', { id })
}

export function deleteRecycleItemForever(id) {
  return request.post('/recycle-bin/delete', { id })
}
