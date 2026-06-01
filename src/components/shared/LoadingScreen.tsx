export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5">
      <div className="relative">
        <img src="/logo.png" alt="" className="w-14 h-14 object-contain opacity-90" />
        <div className="absolute -inset-3 rounded-full border-2 border-border border-t-accent animate-spin" />
      </div>
      <span className="text-text-muted text-xs uppercase tracking-widest">
        Carregando…
      </span>
    </div>
  )
}
