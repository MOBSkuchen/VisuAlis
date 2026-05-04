import { useState } from "react";
import { useStore } from "../store";

export function PageList() {
  const pages = useStore((s) => s.project.pages);
  const currentPageId = useStore((s) => s.currentPageId);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const addPage = useStore((s) => s.addPage);
  const removePage = useStore((s) => s.removePage);

  const [adding, setAdding] = useState(false);
  const [path, setPath] = useState("/new-page");
  const [title, setTitle] = useState("New Page");

  function commit() {
    if (!path.trim() || !title.trim()) return;
    const normalized = path.startsWith("/") ? path.trim() : `/${path.trim()}`;
    const page = addPage(normalized, title.trim());
    setCurrentPage(page.id);
    setAdding(false);
    setPath("/new-page");
    setTitle("New Page");
  }

  return (
    <div>
      {pages.length === 0 && !adding && (
        <div className="empty-hint">No pages yet</div>
      )}
      {pages.map((page) => (
        <div
          key={page.id}
          className={`list-item ${page.id === currentPageId ? "active" : ""}`}
          onClick={() => setCurrentPage(page.id)}
        >
          <div className="list-item-content">
            <div className="list-item-label">{page.title}</div>
            <div className="list-item-sub">{page.path}</div>
          </div>
          {pages.length > 1 && (
            <button
              className="danger icon"
              onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
              title="Delete page"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {adding ? (
        <div className="inline-form">
          <input
            placeholder="Title"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setAdding(false); }}
          />
          <input
            placeholder="/path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setAdding(false); }}
          />
          <div className="inline-form-row">
            <button className="ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="primary" onClick={commit}>Add</button>
          </div>
        </div>
      ) : (
        <button className="add-btn" onClick={() => setAdding(true)}>+ Add page</button>
      )}
    </div>
  );
}
