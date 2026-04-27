import request from '@/utils/request'

export function createCrudApi(baseUrl) {
  return {
    page(params) {
      return request.get(`${baseUrl}/page`, { params })
    },
    list(params) {
      return request.get(`${baseUrl}/list`, { params })
    },
    detail(id) {
      return request.get(`${baseUrl}/${id}`)
    },
    create(data) {
      return request.post(baseUrl, data)
    },
    update(id, data) {
      return request.put(`${baseUrl}/${id}`, data)
    },
    remove(id) {
      return request.delete(`${baseUrl}/${id}`)
    }
  }
}
