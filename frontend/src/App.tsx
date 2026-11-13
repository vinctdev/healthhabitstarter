import { useEffect } from "react";
import AppShell from "./components/AppShell";
import { applyTypography } from "./theme/typography";

function App() {
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;
    const handle = applyTypography(root);
    return () => handle.stop();
  }, []);

  return <AppShell />;
}

export default App;
