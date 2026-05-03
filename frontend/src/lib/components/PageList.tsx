import { useStore } from "../store";

export function PageList() {
  const pages = useStore((s) => s.project.pages);
  const currentPageId = useStore((s) => s.currentPageId);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const addPage = useStore((s) => s.addPage);
  const removePage = useStore((s) => s.removePage);

  function handleAdd() {
    const path = prompt("Page path (e.g. /about):", "/new-page");
    if (!path) return;
    const title = prompt("Page title:", "New Page");
    if (!title) return;
    const page = addPage(path, title);
    setCurrentPage(page.id);
  }

  return (
    <div>
      {pages.map((page) => (
        <div
          key={page.id}
          className={`list-item ${page.id === currentPageId ? "active" : ""}`}
          onClick={() => setCurrentPage(page.id)}
        >
          <div>
            <div className="list-item-label">{page.title}</div>
            <div className="list-item-sub">{page.path}</div>
          </div>
          {pages.length > 1 && (
            <button
              className="danger"
              style={{ padding: "2px 6px", fontSize: 10 }}
              onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button className="add-btn" onClick={handleAdd}>+ Add page</button>
    </div>
  );
}
