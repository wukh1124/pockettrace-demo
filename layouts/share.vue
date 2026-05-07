<template>
  <div class="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
    <div class="pointer-events-none absolute inset-0 opacity-[0.06] auth-grid" aria-hidden="true"></div>
    <div
      class="pointer-events-none absolute -top-32 right-[-10%] h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl"
      aria-hidden="true"
    ></div>
    <div
      class="pointer-events-none absolute bottom-[-15%] left-[-10%] h-80 w-80 rounded-full bg-sky-400/20 blur-3xl"
      aria-hidden="true"
    ></div>

    <main class="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
      <div class="w-full max-w-3xl">
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
</style>
