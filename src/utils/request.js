import { splice } from "core-js/core/array"
import { findIndex } from "core-js/core/array"

export function request({
  url,
  method = 'post',
  data,
  onProgress = e => e,
  headers = {},
  requestList
}) {
  return new Promise(res => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = onProgress
    xhr.open(method, url)
    Object.keys(headers).forEach(key => {
      xhr.setRequestHeader(key, headers[key])
    })
    xhr.send(data)
    xhr.onload = e => {
      if (requestList) {
        const xhrIndex = requestList.findIndex(item => item === xhr)
        requestList.splice(xhrIndex, 1)
      }
      res({ data: e.target.response })
    }

    request?.push(xhr)
  })
}
