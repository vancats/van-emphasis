<template>
  <div style="padding: 0 200px">
    <div style="margin-bottom: 10px">
      <el-input v-model="size" style="width: 400px" placeholder="请选择切片大小" />
      <el-button @click="changeSize">{{ sizeName[sizeLevel] }}</el-button>
    </div>
    <div>当前切片大小是 {{ SIZE / 1024}} KB</div>

    <input
      type="file"
      ref="file"
      @change="handleFileChange"
      style="opacity: 0; position: absolute; left : 1200px"
    />
    <el-button @click="trigger">获取文件</el-button>
    <el-button @click="handleUpload">上传文件</el-button>
    <template v-if="isUploading">
      <el-button v-if="!isPause" @click="handlePause">暂停上传</el-button>
      <el-button v-else @click="handleResume">继续上传</el-button>
    </template>
    <div style="margin-bottom: 20px">{{ container.file && container.file.name }}</div>
    <div>
      <div>总进度</div>
      <el-progress :percentage="fakeUploadPercentage"></el-progress>
      <div class="percentage">
        <span>chunkhash</span>
        <span>size(KB)</span>
        <span>percentage</span>
      </div>
      <div v-for="item in data" :key="item.index">
        <div class="percentage">
          <div>{{ item.hash }}</div>
          <div>{{ (item.size / 1024).toFixed(2) }}</div>
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
export default {
  data() {
    return {
      size: 1,
      sizeLevel: 1,
      sizeName: ['KB', 'MB', 'GB'],
      container: {
        file: null,
        hash: '',
        worker: null,
      },
      data: [],
      hashPercentage: 0,
      requestList: [],
      isUploading: false,
      isPause: false,
      fakeUploadPercentage: 0,
    }
  },
  computed: {
    uploadPercentage() {
      if (!this.container.file || !this.data.length) return 0
      const loaded = this.data
        .map(item => item.size * item.percentage)
        .reduce((acc, cur) => acc + cur, 0)
      return parseInt((loaded / this.container.file.size).toFixed(2))
    },
    SIZE() {
      return this.size * Math.pow(1024, this.sizeLevel + 1)
    },
  },
  watch: {
    uploadPercentage(newValue) {
      if (newValue > this.fakeUploadPercentage) {
        this.fakeUploadPercentage = newValue
      }
    }
  },
  methods: {
    trigger() {
      this.$refs.file.click()
    },
    changeSize() {
      this.sizeLevel++
      this.sizeLevel %= 3
    },
    handlePause() {
      this.requestList.forEach(xhr => xhr?.abort())
      this.requestList.length = 0
      this.isPause = true
    },

    async handleResume() {
      const { uploadedList } = await this.verifyUpload(this.container.file.name, this.container.hash)
      this.isPause = false

      const fileChunkList = this.createFileChunk(this.container.file)

      // 获取数组信息
      this.data = fileChunkList.map(({ file }, index) => ({
        chunk: file,
        hash: this.container.hash + '-' + index,
        index,
        size: file.size,
        percentage: uploadedList.includes(this.container.hash + '-' + index) ? 100 : 0,
      }))

      await this.uploadChunks(uploadedList)
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
      const { shouldUpload, uploadedList } = await this.verifyUpload(this.container.file.name, this.container.hash)
      if (!shouldUpload) {
        this.$message.success('文件已上传')
        return
      }

      // 获取数组信息
      this.data = fileChunkList.map(({ file }, index) => ({
        chunk: file,
        hash: this.container.hash + '-' + index,
        index,
        size: file.size,
        percentage: uploadedList.includes(index) ? 100 : 0,
      }))
      await this.uploadChunks()
    },

    createFileChunk(file, size = this.SIZE) {
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

    async uploadChunks(uploadedList = []) {
      const requestList = this.data
        .filter(({ hash }) => !uploadedList.includes(hash))
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

      this.isUploading = true
      await Promise.all(requestList)
      if (uploadedList.length + requestList.length === this.data.length) {
        await this.mergeRequest()
        this.isUploading = false
        this.$message.success('文件上传成功')
        // this.data.length = 0
      }
    },

    async mergeRequest() {
      await this.request({
        url: 'http://localhost:3000/merge',
        headers: {
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          size: this.SIZE,
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
