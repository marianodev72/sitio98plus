import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: any) {
    // Solo consola (no disclosure)
    // eslint-disable-next-line no-console
    console.error("[UI ERROR]", err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32 }}>
          <h2>No es posible procesar su solicitud, contáctese con el Administrador</h2>
        </div>
      );
    }
    return this.props.children;
  }
}
