<template>
  <div>
    <input type="file" @change="handleFileChange" />
    <el-button @click="handleUpload">upload</el-button>
    <div>
      <div>Total</div>
      <el-progress :percentage="uploadPercentage"></el-progress>
      <div class="percentage">
        <span>chunkhash</span>
        <span>size(KB)</span>
        <span>percentage</span>
      </div>
      <div v-for="item in data" :key="item.index">
        <div class="percentage">
          <div>{{ item.hash }}</div>
          <div>{{ item.size }}</div>
          <div style="width: 300px">
            <el-progress :percentage="item.percentage"></el-progress>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { request } from '../../utils/request'

/// 切片大小
const SIZE = 1 * 1024 * 1024

export default {
  data() {
    return {
      container: {
        file: null,
        hash: '',
        worker: null,
      },
      data: [],
      hashPercentage: 0,
    }
  },
  computed: {
    uploadPercentage() {
      if (!this.container.file || !this.data.length) return 0
      const loaded = this.data
        .map(item => item.size * item.percentage)
        .reduce((acc, cur) => acc + cur, 0)
      return parseInt((loaded / this.container.file.size).toFixed(2))
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
      /// 获取哈希
      this.container.hash = await this.calculatorHash(fileChunkList)
      console.log('this.container.hash: ', this.container.hash)

      const { shouldUpload } = await this.verifyUpload(this.container.file.name, this.container.hash)

      if (!shouldUpload) {
        this.$message.success('skip upload：file upload success')
        return
      }
      this.data = fileChunkList.map(({ file }, index) => ({
        chunk: file,
        hash: this.container.hash + '-' + index,
        index,
        size: file.size,
        // hash: this.container.file.name + "-" + index,
        percentage: 0
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
        .map(({ chunk, hash, index }) => {
          const formData = new FormData()
          formData.append('chunk', chunk)
          formData.append('hash', hash)
          formData.append('filename', this.container.file.name)
          return { formData, index }
        })
        .map(({ formData, index }) => {
          return request({
            url: 'http://localhost:3000',
            data: formData,
            onProgress: this.createProgressHandler(this.data[index])
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
    },

    createProgressHandler(item) {
      return e => {
        item.percentage = parseInt(String(e.loaded / e.total) * 100)
      }
    },

    calculatorHash(fileChunkList) {
      return new Promise(resolve => {
        this.container.worker = new Worker('/hash.js')
        this.container.worker.postMessage({ fileChunkList })
        this.container.worker.onmessage = e => {
          const { percentage, hash } = e.data
          this.hashPercentage = percentage
          if (hash) {
            resolve(hash)
          }
        }
      })
    },

    async verifyUpload(filename, hash) {
      const { data } = await request({
        url: 'http://localhost:3000/verify',
        headers: {
          'content-type': 'application/json',
        },
        data: JSON.stringify({
          filename,
          hash
        })
      })
      return JSON.parse(data)
    }
  },
}
</script>

<style lang="less" scoped>
.percentage {
  display: flex;
  justify-content: space-evenly;
  padding: 10px;
  text-align: center;
}
</style>
