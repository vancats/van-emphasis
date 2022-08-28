<template>
  <div ref="list" class="virtual-list-container" @scroll="scrollEvent">
    <div ref="phantom" class="virtual-list-phantom"></div>
    <div ref="content" class="virtual-list">
      <div
        ref="items"
        class="virtual-list-item"
        v-for="item in visibleData"
        :id="item._index"
        :key="item._index"
      >{{ item.id}} --- {{ item.value }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DynamicHeightVirtual',
  props: {
    listData: {
      type: Array,
      required: true,
    },
    estimatedItemSize: {
      type: Number,
      default: 50
    },
    bufferScale: {
      type: Number,
      default: 1,
    },
  },
  computed: {
    _listData() {
      return this.listData.map((item, index) => {
        return {
          _index: `_${index}`,
          ...item
        }
      })
    },
    visibleCount() {
      return Math.ceil(this.screenHeight / this.estimatedItemSize)
    },
    aboveCount() {
      return Math.min(this.start, this.bufferScale * this.visibleCount)
    },
    belowCount() {
      return Math.min(this.listData.length - this.end, this.bufferScale * this.visibleCount)
    },
    visibleData() {
      return this._listData.slice(this.start - this.aboveCount, this.end + this.belowCount)
    },
  },
  created() {
    this.initPositions()
  },
  mounted() {
    this.screenHeight = this.$el.clientHeight
    this.start = 0
    this.end = this.start + this.visibleCount
  },
  data() {
    return {
      screenHeight: 0,
      start: 0,
      end: 0,
      positions: [],
    }
  },
  updated() {
    this.$nextTick(() => {
      if (!this.$refs.items || !this.$refs.items.length) return
      this.updateItemSize()
      let height = this.positions[this.positions.length - 1].bottom
      this.$refs.phantom.style.height = height + 'px'
      this.setStartOffset()
    })
  },
  methods: {
    initPositions() {
      this.positions = this.listData.map((item, index) => {
        return {
          index,
          height: this.estimatedItemSize,
          top: index * this.estimatedItemSize,
          bottom: (index + 1) * this.estimatedItemSize,
        }
      })
    },
    scrollEvent() {
      const scrollTop = this.$refs.list.scrollTop
      this.start = this.getStartIndex(scrollTop)
      this.end = this.start + this.visibleCount
      this.setStartOffset()
    },
    updateItemSize() {
      const nodes = this.$refs.items
      nodes.forEach(node => {
        const rect = node.getBoundingClientRect()
        const height = rect.height
        const index = +node.id.slice(1)
        const oldHeight = this.positions[index].height
        const dHeight = oldHeight - height
        if (dHeight) {
          this.positions[index].bottom -= dHeight
          this.positions[index].height = height
          for (let i = index + 1; i < this.positions.length; i++) {
            this.positions[i].top = this.positions[i - 1].bottom
            this.positions[i].bottom -= dHeight
          }
        }
      })
    },
    setStartOffset() {
      let size = this.positions[this.start].top - (this.positions[this.start - this.aboveCount] ? this.positions[this.start - this.aboveCount].top : 0)
      let startOffset = this.start >= 1 ? this.positions[this.start - 1].bottom - size : 0
      this.$refs.content.style.transform = `translate3d(0, ${startOffset}px,0)`
    },
    //获取列表起始索引
    getStartIndex(scrollTop = 0) {
      //二分法查找
      return this.binarySearch(this.positions, scrollTop)
    },
    //二分法查找
    binarySearch(list, value) {
      let start = 0
      let end = list.length - 1
      let tempIndex = null
      while (start <= end) {
        let midIndex = parseInt((start + end) / 2)
        let midValue = list[midIndex].bottom
        if (midValue === value) {
          return midIndex + 1
        } else if (midValue < value) {
          start = midIndex + 1
        } else if (midValue > value) {
          if (tempIndex === null || tempIndex > midIndex) {
            tempIndex = midIndex
          }
          end = end - 1
        }
      }
      return tempIndex
    },
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
