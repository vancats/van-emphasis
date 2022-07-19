<template>
  <div class="virtual">
    <VirtualList :listData="data" :itemSize="100" :estimatedItemSize="100" />
  </div>
</template>

<script>
import VirtualList from './DynamicHeight.vue'
import { faker } from '@faker-js/faker'
let d = []
for (let i = 0; i < 1000; i++) {
  d.push({
    id: i,
    value: faker.lorem.sentences()
  })
}

export default {
  data() {
    return {
      data: d
    }
  },
  components: {
    VirtualList
  }
};
</script>

<style>
.virtual {
  height: 90%;
}
</style>
