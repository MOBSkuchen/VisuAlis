import type { Page } from "../../types";
import { useStore } from "../../store";

interface Props { page: Page }

export function PageInspector({ page }: Props) {
  const setPagePath = useStore((s) => s.setPagePath);
  const setPageTitle = useStore((s) => s.setPageTitle);

  return (
    <div className="inspector">
      <div className="inspector-section">
        <div className="inspector-label">Page</div>
        <div className="field-row">
          <label>Title</label>
          <input
            value={page.title}
            onChange={(e) => setPageTitle(page.id, e.target.value)}
          />
        </div>
        <div className="field-row">
          <label>Path</label>
          <input
            value={page.path}
            onChange={(e) => setPagePath(page.id, e.target.value)}
          />
        </div>
        <div className="inspector-id">ID: {page.id}</div>
      </div>
    </div>
  );
}
