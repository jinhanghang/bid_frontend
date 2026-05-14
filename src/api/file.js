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
