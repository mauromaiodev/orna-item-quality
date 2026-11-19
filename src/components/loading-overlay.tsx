/** Cobre a tela enquanto uma leitura ou consulta está em andamento. */
export function LoadingOverlay(props: { label: string }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{props.label}</p>
    </div>
  )
}
