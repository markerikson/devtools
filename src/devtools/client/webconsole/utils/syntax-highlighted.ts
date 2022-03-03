let CodeMirror: any = null;
if (typeof window !== "undefined" && typeof window.navigator !== "undefined") {
  CodeMirror = require("codemirror");
}

export function initOutputSyntaxHighlighting() {
  // Given a DOM node, we syntax highlight identically to how the input field
  // looks. See https://codemirror.net/demo/runmode.html;
  const syntaxHighlightNode = (node: HTMLElement) => {
    if (node) {
      node.classList.add("cm-s-mozilla");
      CodeMirror.runMode(node.textContent, "application/javascript", node);
    }
  };

  // Use a Custom Element to handle syntax highlighting to avoid
  // dealing with refs or innerHTML from React.
  customElements.define(
    "syntax-highlighted",
    class extends HTMLElement {
      connectedCallback() {
        // @ts-ignore
        if (!this.connected) {
          // @ts-ignore
          this.connected = true;
          syntaxHighlightNode(this);
        }
      }
    }
  );
}
