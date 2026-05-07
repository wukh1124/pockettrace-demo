<script setup lang="ts">
import { onMounted } from 'vue'
import { signOut } from '../utils/auth-client'


onMounted(async () => {
  await signOut()
  await navigateTo('/login', { external: true })
})
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-lg">
    <p class="text-sm font-semibold text-slate-500">正在登出...</p>
  </div>
</template>
