import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/file-upload',
    name: 'FileUpload',
    component: () => import('../views/FileUpload/index.vue')
  },
  {
    path: '/virtual-list',
    name: 'VirtualList',
    component: () => import('../views/VirtualList/index.vue')
  },
  {
    path: '/dynamic-form',
    name: 'DynamicForm',
    component: () => import('../views/DynamicForm/index.vue')
  },
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
