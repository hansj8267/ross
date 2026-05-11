// src/components/FilesPanel.jsx
import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function FilesPanel({ homeDir }) {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  useEffect(() => {
    if (homeDir) {
      const desktop = homeDir + "/Desktop";
      navigateTo(desktop);
    }
  }, [homeDir]);

  const navigateTo = useCallback(async (dirPath) => {
    setLoading(true);
    setError(null);
    setFileContent(null);
    setSelected(null);
    try {
      const result = await invoke("list_directory", { dirPath });
      setEntries(result);
      setCurrentPath(dirPath);

      // Build breadcrumbs
      const parts = dirPath.split("/").filter(Boolean);
      setBreadcrumbs(parts.map((p, i) => ({
        label: p,
        path: "/" + parts.slice(0, i + 1).join("/"),
      })));
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEntry = useCallback(async (entry) => {
    setSelected(entry.path);
    if (entry.is_dir) {
      navigateTo(entry.path);
    } else {
      // Try to read text files
      const textExts = [".txt", ".md", ".json", ".js", ".jsx", ".ts", ".tsx", ".py", ".rs", ".html", ".css", ".mjs", ".sh", ".env"];
      const ext = "." + entry.name.split(".").pop().toLowerCase();
      if (textExts.includes(ext)) {
        try {
          const content = await invoke("read_file_content", { filePath: entry.path });
          setFileContent({ name: entry.name, content });
        } catch {
          setFileContent({ name: entry.name, content: "[Binary or unreadable file]" });
        }
      } else {
        setFileContent({ name: entry.name, content: null, binary: true });
      }
    }
  }, [navigateTo]);

  const handleOpenInFinder = useCallback(async () => {
    if (selected) {
      try { await invoke("reveal_in_finder", { filePath: selected }); } catch {}
    }
  }, [selected]);

  const handleOpenFile = useCallback(async () => {
    if (selected) {
      try { await invoke("open_file", { filePath: selected }); } catch {}
    }
  }, [selected]);

  const goUp = useCallback(() => {
    const parent = currentPath.split("/").slice(0, -1).join("/");
    if (parent) navigateTo(parent);
  }, [currentPath, navigateTo]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + "B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + "KB";
    return (bytes / 1024 / 1024).toFixed(1) + "MB";
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#000", overflow:"hidden" }}>

      {/* HEADER */}
      <div style={{ padding:"12px 20px", borderBottom:"1px solid #0a2a4a", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <span style={{ fontSize:11, color:"#3399ff", letterSpacing:3, fontFamily:"monospace" }}>FILE SYSTEM</span>
        <div style={{ flex:1, display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{ fontSize:10, color:"#1a4a7a", cursor:"pointer" }} onClick={goUp}>../</span>
          {breadcrumbs.map((b, i) => (
            <span key={b.path} style={{ fontSize:10, color: i===breadcrumbs.length-1 ? "#3399ff" : "#1a4a7a", cursor:"pointer" }}
              onClick={() => navigateTo(b.path)}>
              {b.label}{i < breadcrumbs.length-1 ? " /" : ""}
            </span>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {["FINDER", "OPEN"].map((label, i) => (
            <button key={label} onClick={i===0 ? handleOpenInFinder : handleOpenFile} style={{
              background:"transparent", border:"1px solid #0a2a4a", borderRadius:4,
              color:"#1a4a7a", fontSize:9, padding:"4px 8px", cursor:"pointer",
              fontFamily:"monospace", letterSpacing:1,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* FILE LIST */}
        <div style={{ width:280, borderRight:"1px solid #0a2a4a", overflowY:"auto", flexShrink:0 }}>
          {loading && <div style={{ padding:20, fontSize:11, color:"#1a4a7a", fontFamily:"monospace" }}>LOADING...</div>}
          {error  && <div style={{ padding:20, fontSize:11, color:"#ff4444", fontFamily:"monospace" }}>{error}</div>}
          {!loading && !error && entries.map(entry => (
            <div
              key={entry.path}
              onClick={() => handleEntry(entry)}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"8px 16px", cursor:"pointer",
                background: selected === entry.path ? "#001830" : "transparent",
                borderLeft: selected === entry.path ? "2px solid #3399ff" : "2px solid transparent",
                transition:"all .15s",
              }}
            >
              <span style={{ fontSize:12, flexShrink:0 }}>{entry.is_dir ? "📁" : "📄"}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, color: entry.is_dir ? "#3399ff" : "#5599cc", fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {entry.name}
                </div>
                {!entry.is_dir && (
                  <div style={{ fontSize:9, color:"#1a4a7a", fontFamily:"monospace" }}>{formatSize(entry.size)}</div>
                )}
              </div>
            </div>
          ))}
          {!loading && !error && entries.length === 0 && (
            <div style={{ padding:20, fontSize:11, color:"#1a4a7a", fontFamily:"monospace" }}>EMPTY DIRECTORY</div>
          )}
        </div>

        {/* PREVIEW */}
        <div style={{ flex:1, overflowY:"auto", padding:20, background:"#000" }}>
          {fileContent ? (
            <>
              <div style={{ fontSize:10, color:"#3399ff", letterSpacing:2, marginBottom:12, fontFamily:"monospace" }}>
                {fileContent.name}
              </div>
              {fileContent.binary ? (
                <div style={{ fontSize:11, color:"#1a4a7a", fontFamily:"monospace" }}>
                  Binary file — click OPEN to view in default app
                </div>
              ) : (
                <pre style={{
                  fontSize:11, color:"#5599cc", fontFamily:"monospace",
                  whiteSpace:"pre-wrap", lineHeight:1.7, margin:0,
                }}>
                  {fileContent.content}
                </pre>
              )}
            </>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8 }}>
              <div style={{ fontSize:9, color:"#1a4a7a", letterSpacing:3, fontFamily:"monospace" }}>SELECT A FILE TO PREVIEW</div>
              <div style={{ fontSize:9, color:"#0a2a4a", letterSpacing:2, fontFamily:"monospace" }}>{currentPath}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
