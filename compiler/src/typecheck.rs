use crate::ast::{Action, ActionNode, EdgeKind, NodeKind, Project, WorkflowType};
use crate::CompileError;
use std::collections::{HashMap, HashSet};

pub fn validate(project: &Project) -> Result<(), CompileError> {
    validate_pages(project)?;
    validate_component_ids(project)?;
    validate_actions(project)?;
    Ok(())
}

fn validate_pages(project: &Project) -> Result<(), CompileError> {
    let mut seen = HashSet::new();
    for page in &project.pages {
        if !is_valid_path(&page.path) {
            return Err(CompileError::Type(format!(
                "page path '{}' is invalid; must match ^/[a-z0-9/_-]*$",
                page.path
            )));
        }
        if !seen.insert(page.path.clone()) {
            return Err(CompileError::Type(format!(
                "duplicate page path '{}'",
                page.path
            )));
        }
    }
    Ok(())
}

fn is_valid_path(path: &str) -> bool {
    if !path.starts_with('/') {
        return false;
    }
    path.chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '/' || c == '_' || c == '-')
}

fn validate_component_ids(project: &Project) -> Result<(), CompileError> {
    let mut seen = HashSet::new();
    for page in &project.pages {
        collect_component_ids(&page.root, &mut seen)?;
    }
    Ok(())
}

fn collect_component_ids(
    node: &crate::ast::ComponentNode,
    seen: &mut HashSet<String>,
) -> Result<(), CompileError> {
    if !seen.insert(node.id.clone()) {
        return Err(CompileError::Type(format!(
            "duplicate component id '{}'",
            node.id
        )));
    }
    for child in &node.children {
        collect_component_ids(child, seen)?;
    }
    Ok(())
}

fn validate_actions(project: &Project) -> Result<(), CompileError> {
    let action_ids: HashSet<&str> = project.actions.iter().map(|a| a.id.as_str()).collect();
    for action in &project.actions {
        validate_action_graph(action)?;
        validate_trigger_bindings(project, action, &action_ids)?;
    }
    Ok(())
}

fn validate_action_graph(action: &Action) -> Result<(), CompileError> {
    let graph = &action.graph;
    let origin_count = graph
        .nodes
        .iter()
        .filter(|n| n.kind == NodeKind::Origin)
        .count();
    if origin_count != 1 {
        return Err(CompileError::Type(format!(
            "action '{}' must have exactly 1 Origin node, found {}",
            action.name, origin_count
        )));
    }

    let has_terminal = graph.nodes.iter().any(|n| {
        matches!(n.kind, NodeKind::Terminate | NodeKind::Redirect)
    });
    if !has_terminal {
        return Err(CompileError::Type(format!(
            "action '{}' has no Terminate or Redirect node",
            action.name
        )));
    }

    validate_graph_edges(action)?;
    Ok(())
}

fn validate_graph_edges(action: &Action) -> Result<(), CompileError> {
    let graph = &action.graph;
    let nodes_by_id: HashMap<&str, &ActionNode> =
        graph.nodes.iter().map(|n| (n.id.as_str(), n)).collect();

    let mut exec_out_used: HashSet<(&str, &str)> = HashSet::new();

    for edge in &graph.edges {
        let from_id = edge.from.node_id.as_str();
        let to_id = edge.to.node_id.as_str();
        if !nodes_by_id.contains_key(from_id) {
            return Err(CompileError::Type(format!(
                "edge '{}' references unknown source node '{}'",
                edge.id, from_id
            )));
        }
        if !nodes_by_id.contains_key(to_id) {
            return Err(CompileError::Type(format!(
                "edge '{}' references unknown target node '{}'",
                edge.id, to_id
            )));
        }
        if edge.kind == EdgeKind::Exec {
            let key = (from_id, edge.from.port.as_str());
            if !exec_out_used.insert(key) {
                return Err(CompileError::Type(format!(
                    "action '{}': exec output '{}' on node '{}' has multiple outgoing edges",
                    action.name, edge.from.port, from_id
                )));
            }
        }
    }
    Ok(())
}

fn validate_trigger_bindings(
    _project: &Project,
    action: &Action,
    action_ids: &HashSet<&str>,
) -> Result<(), CompileError> {
    for page in &_project.pages {
        validate_component_triggers(&page.root, action_ids)?;
    }
    let _ = action;
    Ok(())
}

fn validate_component_triggers(
    node: &crate::ast::ComponentNode,
    action_ids: &HashSet<&str>,
) -> Result<(), CompileError> {
    for (event, maybe_id) in &node.triggers {
        if let Some(id) = maybe_id {
            if !action_ids.contains(id.as_str()) {
                return Err(CompileError::Type(format!(
                    "component '{}' trigger '{}' references unknown action '{}'",
                    node.id, event, id
                )));
            }
        }
    }
    for child in &node.children {
        validate_component_triggers(child, action_ids)?;
    }
    Ok(())
}

pub fn ts_type(ty: &WorkflowType) -> &'static str {
    match ty {
        WorkflowType::Int | WorkflowType::Float => "number",
        WorkflowType::String => "string",
        WorkflowType::Bool => "boolean",
        WorkflowType::Array { .. } => "unknown[]",
        WorkflowType::Dict { .. } => "Record<string, unknown>",
        WorkflowType::Custom { .. } | WorkflowType::Any => "unknown",
    }
}
