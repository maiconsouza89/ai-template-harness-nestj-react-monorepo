/**
 * Ícone de alerta em SVG inline, sem biblioteca de ícones: precede a mensagem de erro de campo
 * para o erro não depender só de cor (WCAG 1.4.1). Decorativo, por isso fora da árvore de
 * acessibilidade; a mensagem ao lado é que é lida.
 */
export function AlertIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="currentColor"
      className="mt-0.5 shrink-0"
      data-icon="alert"
    >
      <path
        fillRule="evenodd"
        d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM9 5.5h2v6H9v-6Zm0 7.5h2v2H9v-2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
