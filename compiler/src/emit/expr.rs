use crate::ast::{ActionNode, JsonValue, NodeKind};
use std::collections::HashMap;

/// Resolves a data input port on `node_id`:`port` to a TypeScript expression string.
/// Pure/constant nodes are inlined recursively.
pub fn resolve(
    node_id: &str,
    port: &str,
    nodes: &HashMap<String, &ActionNode>,
    data_in: &HashMap<(String, String), (String, String)>,
    origin_params: &[String],
    depth: u8,
) -> String {
    if depth > 32 {
        return "undefined /* cycle */".to_string();
    }

    let key = (node_id.to_string(), port.to_string());

    if let Some((from_id, from_port)) = data_in.get(&key) {
        let from_node = match nodes.get(from_id.as_str()) {
            Some(n) => n,
            None => return "undefined".to_string(),
        };

        match &from_node.kind {
            NodeKind::Origin => {
                // Origin outputs are the action params — port name = param name
                if origin_params.contains(from_port) {
                    return from_port.clone();
                }
                return "undefined".to_string();
            }

            NodeKind::Constant => {
                return format_literal(from_node.constant_value.as_ref());
            }

            NodeKind::Pure => {
                return inline_pure(
                    from_node,
                    nodes,
                    data_in,
                    origin_params,
                    depth + 1,
                );
            }

            _ => {
                return format!("var_{}_{}", sanitize_id(from_id), sanitize_id(from_port));
            }
        }
    }

    // No data edge — check literal_inputs on the target node
    if let Some(target) = nodes.get(node_id) {
        if let Some(val) = target.literal_inputs.get(port) {
            return format_literal(Some(val));
        }
    }

    "undefined".to_string()
}

fn inline_pure(
    node: &ActionNode,
    nodes: &HashMap<String, &ActionNode>,
    data_in: &HashMap<(String, String), (String, String)>,
    origin_params: &[String],
    depth: u8,
) -> String {
    let op = node.pure_op.as_deref().unwrap_or("");
    let a = || resolve(&node.id, "a", nodes, data_in, origin_params, depth);
    let b = || resolve(&node.id, "b", nodes, data_in, origin_params, depth);

    match op {
        "concat" | "add" => format!("({} + {})", a(), b()),
        "sub" => format!("({} - {})", a(), b()),
        "mul" => format!("({} * {})", a(), b()),
        "div" => format!("({} / {})", a(), b()),
        "eq" => format!("({} === {})", a(), b()),
        "neq" => format!("({} !== {})", a(), b()),
        "lt" => format!("({} < {})", a(), b()),
        "gt" => format!("({} > {})", a(), b()),
        "and" => format!("({} && {})", a(), b()),
        "or" => format!("({} || {})", a(), b()),
        "not" => format!("(!{})", a()),
        "to_string" => format!("String({})", a()),
        "json_parse" => format!("JSON.parse({})", a()),
        "json_stringify" => format!("JSON.stringify({})", a()),
        "len" => format!("({}).length", a()),
        _ => "undefined".to_string(),
    }
}

pub fn format_literal(val: Option<&JsonValue>) -> String {
    match val {
        None => "undefined".to_string(),
        Some(JsonValue::Null) => "null".to_string(),
        Some(JsonValue::Bool(b)) => b.to_string(),
        Some(JsonValue::Number(n)) => n.to_string(),
        Some(JsonValue::String(s)) => format!("{}", serde_json::to_string(s).unwrap_or_default()),
        Some(JsonValue::Array(arr)) => {
            let items: Vec<String> = arr.iter().map(|v| format_literal(Some(v))).collect();
            format!("[{}]", items.join(", "))
        }
        Some(JsonValue::Object(obj)) => {
            let pairs: Vec<String> = obj
                .iter()
                .map(|(k, v)| {
                    format!(
                        "{}: {}",
                        serde_json::to_string(k).unwrap_or_default(),
                        format_literal(Some(v))
                    )
                })
                .collect();
            format!("{{{}}}", pairs.join(", "))
        }
    }
}

pub fn sanitize_id(id: &str) -> String {
    id.chars()
        .map(|c| if c.is_alphanumeric() || c == '_' { c } else { '_' })
        .collect()
}
