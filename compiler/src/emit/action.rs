use std::collections::{HashMap, HashSet};
use std::fmt::Write;

use crate::ast::{Action, ActionNode, EdgeKind, NodeKind, Project};
use crate::emit::expr::{resolve, sanitize_id};
use crate::typecheck::ts_type;
use crate::CompileError;

pub fn emit_action(project: &Project, action: &Action) -> Result<String, CompileError> {
    let ctx = EmitCtx::new(project, action)?;
    let mut buf = String::new();
    writeln!(buf, "import * as runtime from '../runtime/index.js';")?;
    writeln!(buf)?;
    let params_sig = action
        .params
        .iter()
        .map(|p| format!("{}: {}", p.name, ts_type(&p.ty)))
        .collect::<Vec<_>>()
        .join(", ");
    writeln!(
        buf,
        "export async function action_{}({params_sig}): Promise<void> {{",
        sanitize_id(&action.id)
    )?;
    let origin_id = ctx.find_origin()?;
    let mut visited = HashSet::new();
    ctx.walk_exec(&mut buf, &origin_id, "__out__", 1, &mut visited)?;
    writeln!(buf, "}}")?;
    Ok(buf)
}

pub fn action_file_name(action: &Action) -> String {
    format!("action_{}.ts", sanitize_id(&action.id))
}

struct EmitCtx<'a> {
    action: &'a Action,
    nodes: HashMap<String, &'a ActionNode>,
    exec_next: HashMap<(String, String), String>,
    data_in: HashMap<(String, String), (String, String)>,
    origin_params: Vec<String>,
}

impl<'a> EmitCtx<'a> {
    fn new(_project: &'a Project, action: &'a Action) -> Result<Self, CompileError> {
        let nodes: HashMap<String, &ActionNode> = action
            .graph
            .nodes
            .iter()
            .map(|n| (n.id.clone(), n))
            .collect();

        let mut exec_next: HashMap<(String, String), String> = HashMap::new();
        let mut data_in: HashMap<(String, String), (String, String)> = HashMap::new();

        for edge in &action.graph.edges {
            match edge.kind {
                EdgeKind::Exec => {
                    exec_next.insert(
                        (edge.from.node_id.clone(), edge.from.port.clone()),
                        edge.to.node_id.clone(),
                    );
                }
                EdgeKind::Data => {
                    data_in.insert(
                        (edge.to.node_id.clone(), edge.to.port.clone()),
                        (edge.from.node_id.clone(), edge.from.port.clone()),
                    );
                }
            }
        }

        let origin_params: Vec<String> = action.params.iter().map(|p| p.name.clone()).collect();

        Ok(Self {
            action,
            nodes,
            exec_next,
            data_in,
            origin_params,
        })
    }

    fn find_origin(&self) -> Result<String, CompileError> {
        self.action
            .graph
            .nodes
            .iter()
            .find(|n| n.kind == NodeKind::Origin)
            .map(|n| n.id.clone())
            .ok_or_else(|| {
                CompileError::Emit(format!(
                    "action '{}' has no Origin node",
                    self.action.name
                ))
            })
    }

    fn exec_next_node(&self, from_id: &str, from_port: &str) -> Option<&ActionNode> {
        let key = (from_id.to_string(), from_port.to_string());
        self.exec_next
            .get(&key)
            .and_then(|id| self.nodes.get(id))
            .copied()
    }

    fn resolve_input(&self, node_id: &str, port: &str) -> String {
        resolve(
            node_id,
            port,
            &self.nodes,
            &self.data_in,
            &self.origin_params,
            0,
        )
    }

    fn indent(depth: usize) -> String {
        "  ".repeat(depth)
    }

    fn walk_exec(
        &self,
        buf: &mut String,
        from_id: &str,
        from_port: &str,
        depth: usize,
        visited: &mut HashSet<String>,
    ) -> Result<(), CompileError> {
        let node = match self.exec_next_node(from_id, from_port) {
            Some(n) => n,
            None => return Ok(()),
        };

        // Guard against infinite loops (should never happen in valid AST)
        let visit_key = format!("{}:{}", node.id, from_port);
        if !visited.insert(visit_key) {
            return Ok(());
        }

        let ind = Self::indent(depth);

        match &node.kind {
            NodeKind::Terminate => {
                writeln!(buf, "{ind}return;")?;
            }

            NodeKind::Branch => {
                let cond = self.resolve_input(&node.id, "condition");
                writeln!(buf, "{ind}if ({cond}) {{")?;
                self.walk_exec(buf, &node.id, "__true__", depth + 1, visited)?;
                writeln!(buf, "{ind}}} else {{")?;
                self.walk_exec(buf, &node.id, "__false__", depth + 1, visited)?;
                writeln!(buf, "{ind}}}")?;
            }

            NodeKind::Loop => {
                let iter = self.resolve_input(&node.id, "iter");
                let item_var = format!("var_{}_{}", sanitize_id(&node.id), "item");
                writeln!(buf, "{ind}for (const {item_var} of {iter}) {{")?;
                self.walk_exec(buf, &node.id, "__body__", depth + 1, visited)?;
                writeln!(buf, "{ind}}}")?;
                self.walk_exec(buf, &node.id, "__done__", depth, visited)?;
            }

            NodeKind::Fetch => {
                self.emit_fetch(buf, node, depth, visited)?;
            }

            NodeKind::GetValue => {
                self.emit_get_value(buf, node, depth, visited)?;
            }

            NodeKind::SetValue => {
                self.emit_set_value(buf, node, depth, visited)?;
            }

            NodeKind::Redirect => {
                let target = node
                    .tweak_values
                    .get("pagePath")
                    .or_else(|| node.tweak_values.get("url"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("/");
                let url = if node
                    .tweak_values
                    .get("target")
                    .and_then(|v| v.as_str())
                    == Some("url")
                {
                    self.resolve_input(&node.id, "url")
                } else {
                    format!("{target:?}")
                };
                writeln!(buf, "{ind}runtime.redirect({url});")?;
            }

            // Pure, Constant, Origin are data-only — not visited during exec walk
            NodeKind::Pure | NodeKind::Constant | NodeKind::Origin => {}
        }

        Ok(())
    }

    fn emit_fetch(
        &self,
        buf: &mut String,
        node: &ActionNode,
        depth: usize,
        visited: &mut HashSet<String>,
    ) -> Result<(), CompileError> {
        let ind = Self::indent(depth);
        let var = format!("var_{}", sanitize_id(&node.id));
        let url = self.resolve_input(&node.id, "url");
        let headers = self.resolve_input(&node.id, "headers");
        let body = self.resolve_input(&node.id, "body");
        let method = node
            .tweak_values
            .get("method")
            .and_then(|v| v.as_str())
            .unwrap_or("GET");

        writeln!(
            buf,
            "{ind}const {var} = await runtime.fetch({{ url: {url}, method: {method:?}, headers: {headers}, body: {body} }});"
        )?;
        writeln!(buf, "{ind}if ({var}.ok) {{")?;
        let ind2 = Self::indent(depth + 1);
        writeln!(buf, "{ind2}const {var}_status = {var}.status;")?;
        writeln!(buf, "{ind2}const {var}_body = {var}.body;")?;
        writeln!(buf, "{ind2}const {var}_json = {var}.json;")?;
        let _ = (&var, &ind2); // used above
        self.walk_exec(buf, &node.id, "__out__", depth + 1, visited)?;
        writeln!(buf, "{ind}}} else {{")?;
        writeln!(
            buf,
            "{}const {var}_error = {var}.error;",
            Self::indent(depth + 1)
        )?;
        self.walk_exec(buf, &node.id, "__err__", depth + 1, visited)?;
        writeln!(buf, "{ind}}}")?;
        Ok(())
    }

    fn emit_get_value(
        &self,
        buf: &mut String,
        node: &ActionNode,
        depth: usize,
        visited: &mut HashSet<String>,
    ) -> Result<(), CompileError> {
        let ind = Self::indent(depth);
        let component_id = node
            .tweak_values
            .get("componentId")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let var = format!("var_{}_{}", sanitize_id(&node.id), "value");
        writeln!(buf, "{ind}let {var}: unknown;")?;
        writeln!(buf, "{ind}try {{")?;
        writeln!(
            buf,
            "{}  {var} = runtime.getValue({component_id:?});",
            ind
        )?;
        self.walk_exec(buf, &node.id, "__out__", depth + 1, visited)?;
        writeln!(buf, "{ind}}} catch {{")?;
        self.walk_exec(buf, &node.id, "__err__", depth + 1, visited)?;
        writeln!(buf, "{ind}}}")?;
        Ok(())
    }

    fn emit_set_value(
        &self,
        buf: &mut String,
        node: &ActionNode,
        depth: usize,
        visited: &mut HashSet<String>,
    ) -> Result<(), CompileError> {
        let ind = Self::indent(depth);
        let component_id = node
            .tweak_values
            .get("componentId")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let field = node
            .tweak_values
            .get("field")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let value = self.resolve_input(&node.id, "value");
        writeln!(buf, "{ind}try {{")?;
        writeln!(
            buf,
            "{}  runtime.setValue({component_id:?}, {field:?}, {value});",
            ind
        )?;
        self.walk_exec(buf, &node.id, "__out__", depth + 1, visited)?;
        writeln!(buf, "{ind}}} catch {{")?;
        self.walk_exec(buf, &node.id, "__err__", depth + 1, visited)?;
        writeln!(buf, "{ind}}}")?;
        Ok(())
    }
}

impl From<std::fmt::Error> for CompileError {
    fn from(e: std::fmt::Error) -> Self {
        CompileError::Emit(e.to_string())
    }
}
