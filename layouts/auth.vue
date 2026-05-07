<template>
  <div
    class="auth-layout relative min-h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
  >
    <div class="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.03] auth-grid" aria-hidden="true"></div>
    <div
      class="pointer-events-none absolute -top-32 right-[-10%] h-80 w-80 rounded-full bg-indigo-500/15 dark:bg-indigo-500/10 blur-3xl"
      aria-hidden="true"
    ></div>
    <div
      class="pointer-events-none absolute bottom-[-15%] left-[-10%] h-80 w-80 rounded-full bg-sky-400/20 dark:bg-sky-400/10 blur-3xl"
      aria-hidden="true"
    ></div>

    <main class="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-grid {
  background-image: radial-gradient(#6366f1 0.8px, transparent 0.8px),
    radial-gradient(#6366f1 0.8px, transparent 0.8px);
  background-size: 24px 24px;
  background-position: 0 0, 12px 12px;
}

/* 確保 auth layout 完全獨立，不受 default layout 影響 */
.auth-layout {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  overflow-y: auto;
}
</style>
