#![deny(warnings)]

pub mod ast;
pub mod emit;
pub mod project;
pub mod typecheck;
pub mod workspace;

pub use workspace::Workspace;

#[derive(Debug, thiserror::Error)]
pub enum CompileError {
    #[error("type error: {0}")]
    Type(String),
    #[error("emit error: {0}")]
    Emit(String),
    #[error("zip error: {0}")]
    Zip(String),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
}

pub struct CompileOptions {
    pub project_name: String,
}

/// Compile a VisuAlis project JSON into an in-memory workspace of files.
/// The workspace can then be zipped and returned to the client.
pub fn compile(
    ast: &serde_json::Value,
    _opts: &CompileOptions,
) -> Result<Workspace, CompileError> {
    let project: ast::Project = serde_json::from_value(ast.clone())?;
    typecheck::validate(&project)?;

    let mut ws = Workspace::new();
    project::scaffold(&project, &mut ws)?;
    emit::runtime::emit_runtime(&mut ws)?;

    for action in &project.actions {
        let code = emit::action::emit_action(&project, action)?;
        let name = emit::action::action_file_name(action);
        ws.insert_text(std::path::PathBuf::from(format!("src/actions/{name}")), code);
    }

    for page in &project.pages {
        let code = emit::page::emit_page(&project, page)?;
        let name = emit::page::page_file_name(page);
        ws.insert_text(std::path::PathBuf::from(format!("src/pages/{name}")), code);
    }

    Ok(ws)
}
