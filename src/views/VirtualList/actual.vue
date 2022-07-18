<template>
  <div>
    <button @click="generate">生成</button>
    <ul id="container"></ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
    }
  },
  methods: {
    generate() {
      let total = 100000
      let now = new Date()
      const ul = document.querySelector('ul')
      for (let i = 0; i < total; i++) {
        let li = document.createElement('li')
        li.innerText = i + '----' + Math.floor(Math.random() * total)
        ul.append(li)
      }
      console.log('JS 运行时间', Date.now() - now)
      setTimeout(() => {
        console.log('JS 运行总时间', Date.now() - now)
      }, 0)
    }
  },
}
</script>

<style lang="less" scoped>
</style>
