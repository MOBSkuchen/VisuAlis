use crate::ast::ComponentNode;
use crate::CompileError;

/// Phase C3 — stub. Emits JSX for a single component node.
pub fn emit_component(_node: &ComponentNode, _indent: usize) -> Result<String, CompileError> {
    Ok(String::new())
}
