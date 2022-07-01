<template>
  <div>
    <input type="file" @change="handleFileChange" />
    <el-button @click="handleUpload">upload</el-button>
  </div>
</template>

<script>
import { request } from '../../utils/request'

/// 切片大小
const SIZE = 10 * 1024 * 1024

export default {
  data() {
    return {
      container: {
        file: null
      },
      data: []
    }
  },
  methods: {
    /// 文件修改
    handleFileChange(e) {
      console.log('e.target.files: ', e.target.files)
      const [file] = e.target.files
      if (!file) return
      this.container.file = file
    },
    /// 点击上传
    async handleUpload() {
      if (!this.container.file) return
      const fileChunkList = this.createFileChunk(this.container.file)
      console.log('fileChunkList: ', fileChunkList)
      this.data = fileChunkList.map(({ file }, index) => ({
        chunk: file,
        hash: this.container.file.name + '-' + index
      }))
      console.log('this.data: ', this.data)
      await this.uploadChunks()
    },

    createFileChunk(file, size = SIZE) {
      const fileChunkList = []
      let cur = 0
      while (cur < file.size) {
        fileChunkList.push({ file: file.slice(cur, cur + size) })
        cur += size
      }
      return fileChunkList
    },

    async uploadChunks() {
      const requestList = this.data
        .map(({ chunk, hash }) => {
          const formData = new FormData()
          formData.append('chunk', chunk)
          formData.append('hash', hash)
          formData.append('filename', this.container.file.name)
          return { formData }
        })
        .map(({ formData }) => {
          return request({
            url: 'http://localhost:3000',
            data: formData
          })
        })

      await Promise.all(requestList)
      await this.mergeRequest()
    },

    async mergeRequest() {
      await request({
        url: 'http://localhost:3000/merge',
        headers: {
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          size: SIZE,
          filename: this.container.file.name
        })
      })
    }
  },
}
</script>

<style lang="less" scoped>
</style>
