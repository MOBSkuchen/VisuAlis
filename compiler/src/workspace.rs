use std::collections::BTreeMap;
use std::io::Write;
use std::path::PathBuf;

use crate::CompileError;

/// In-memory representation of the output project files.
pub struct Workspace {
    files: BTreeMap<PathBuf, Vec<u8>>,
}

impl Workspace {
    pub fn new() -> Self {
        Self {
            files: BTreeMap::new(),
        }
    }

    pub fn insert(&mut self, path: PathBuf, content: Vec<u8>) {
        self.files.insert(path, content);
    }

    pub fn insert_text(&mut self, path: PathBuf, content: String) {
        self.insert(path, content.into_bytes());
    }

    pub fn to_zip(&self) -> Result<Vec<u8>, CompileError> {
        let buf = Vec::new();
        let cursor = std::io::Cursor::new(buf);
        let mut zip = zip::ZipWriter::new(cursor);
        let options =
            zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

        for (path, content) in &self.files {
            let name = path.to_string_lossy().replace('\\', "/");
            zip.start_file(name, options)
                .map_err(|e| CompileError::Zip(e.to_string()))?;
            zip.write_all(content)
                .map_err(|e| CompileError::Zip(e.to_string()))?;
        }

        let cursor = zip.finish().map_err(|e| CompileError::Zip(e.to_string()))?;
        Ok(cursor.into_inner())
    }
}

impl Default for Workspace {
    fn default() -> Self {
        Self::new()
    }
}
