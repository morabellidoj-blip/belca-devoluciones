'use client'
export function ConfirmButton({ mensaje, cls = '', children }: { mensaje: string; cls?: string; children: React.ReactNode }) {
  return <button type="submit" className={cls} onClick={e => { if (!window.confirm(mensaje)) e.preventDefault() }}>{children}</button>
}
export function SelectAll() {
  return <button type="button" className="text-xs underline text-belca-navy" onClick={() => {
    const cs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type=checkbox][form=bulk]:not(:disabled)'))
    const todos = cs.every(c => c.checked); cs.forEach(c => { c.checked = !todos })
  }}>Marcar / desmarcar todos</button>
}
