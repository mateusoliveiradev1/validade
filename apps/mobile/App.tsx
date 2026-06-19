import { CaptureApp } from "./src/capture/CaptureApp";
import { createSQLiteCaptureRepository } from "./src/capture/sqlite-repository";

const repository = createSQLiteCaptureRepository({
  clock: () => new Date().toISOString(),
  createId: () => `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
});

export default function App() {
  return <CaptureApp repository={repository} />;
}
