<template>
  <div>
    <input type="file" @change="handleFileChange" />
    <el-button @click="handleUpload">upload</el-button>
    <el-button @click="pause">pause</el-button>
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
      requestList: [],
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
    pause() {
      this.requestList.forEach(xhr => xhr?.abort())
      this.requestList.length = 0
    },

    request({
      url,
      method = 'post',
      data,
      onProgress = e => e,
      headers = {},
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
          if (this.requestList.length) {
            const xhrIndex = this.requestList.findIndex(item => item === xhr)
            this.requestList.splice(xhrIndex, 1)
          }
          res({ data: e.target.response })
        }

        this.requestList.push(xhr)
      })
    },

    /// 上传文件
    handleFileChange(e) {
      const [file] = e.target.files
      if (!file) return
      this.container.file = file
    },
    /// 点击上传
    async handleUpload() {
      if (!this.container.file) return
      // 获取 chunk 数组
      const fileChunkList = this.createFileChunk(this.container.file)
      /// 获取哈希
      this.container.hash = await this.calculatorHash(fileChunkList)
      // 秒传验证
      const { shouldUpload } = await this.verifyUpload(this.container.file.name, this.container.hash)
      if (!shouldUpload) {
        this.$message.success('skip upload：file upload success')
        return
      }

      // 获取数组信息
      this.data = fileChunkList.map(({ file }, index) => ({
        chunk: file,
        hash: this.container.hash + '-' + index,
        index,
        size: file.size,
        percentage: 0,
      }))
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
      const { data } = await this.request({
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
          return this.request({
            url: 'http://localhost:3000',
            data: formData,
            onProgress: this.createProgressHandler(this.data[index])
          })
        })

      await Promise.all(requestList)
      await this.mergeRequest()
    },

    async mergeRequest() {
      await this.request({
        url: 'http://localhost:3000/merge',
        headers: {
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          size: SIZE,
          hash: this.container.hash,
          filename: this.container.file.name,
        })
      })
    },

    createProgressHandler(item) {
      return e => {
        item.percentage = parseInt(String(e.loaded / e.total) * 100)
      }
    },

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
