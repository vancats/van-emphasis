<template>
  <div ref="list" class="virtual-list-container" @scroll="scrollEvent">
    <div class="virtual-list-phantom" :style="{ height: listHeight + 'px' }"></div>
    <div class="virtual-list" :style="{ transform: getTransform }">
      <div
        class="virtual-list-item"
        v-for="item in visibleData"
        :key="item.id"
        :style="{ height: itemSize + 'px', lineHeight: itemSize + 'px' }"
      >{{ item.value }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FixHeightVirtual',
  props: {
    listData: {
      type: Array,
      required: true,
    },
    itemSize: {
      type: String | Number,
      default: 30,
    },
  },
  computed: {
    listHeight() {
      return this.listData.length * this.itemSize
    },
    visibleCount() {
      return Math.ceil(this.screenHeight / this.itemSize)
    },
    visibleData() {
      return this.listData.slice(this.start, Math.min(this.end, this.listData.length))
    },
    getTransform() {
      return `translate3d(0,${this.startOffset}px,0)`
    },
  },
  data() {
    return {
      screenHeight: 0,
      startOffset: 0,
      start: 0,
      end: null,
    }
  },
  mounted() {
    console.log(this.visibleCount)
    this.screenHeight = this.$el.clientHeight
    this.start = 0
    this.end = this.start + this.visibleCount
  },
  methods: {
    scrollEvent() {
      const scrollTop = this.$refs.list.scrollTop
      this.startOffset = scrollTop - (scrollTop % this.itemSize)
      this.start = Math.floor(this.startOffset / this.itemSize)
      this.end = this.start + this.visibleCount
    }
  },
}
</script>

<style scoped>
.virtual-list-container {
  height: 100%;
  overflow: auto;
  position: relative;
  -webkit-overflow-scrolling: touch;
}

.virtual-list-phantom {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  z-index: -1;
}

.virtual-list {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}

.virtual-list-item {
  padding: 10px 0;
  border-bottom: 1px solid #ccc;
  box-sizing: border-box;
}
</style>
