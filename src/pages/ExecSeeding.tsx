// This module is deprecated. Authority Mode activation is now handled
// directly on the Overview page. Retained as empty export for compatibility.

export default function ExecSeeding({ onExit }: { onExit: () => void }) {
  // Redirect immediately — this should not be reachable in production flow
  onExit();
  return null;
}
