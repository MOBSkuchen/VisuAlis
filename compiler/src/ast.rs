use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub type JsonValue = serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub version: String,
    pub pages: Vec<Page>,
    pub actions: Vec<Action>,
    #[serde(default)]
    pub custom_types: Vec<CustomTypeDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Page {
    pub id: String,
    pub path: String,
    pub title: String,
    pub root: ComponentNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ComponentClass {
    Container,
    TextInput,
    FileUpload,
    Dropdown,
    Checkbox,
    StaticText,
    Label,
    Buffer,
    Video,
    Table,
    Button,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Layout {
    Flex {
        direction: String,
        gap: f64,
        align: String,
        justify: String,
    },
    Grid {
        columns: u32,
        gap: f64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentNode {
    pub id: String,
    pub cls: ComponentClass,
    pub static_props: HashMap<String, JsonValue>,
    pub variable_props: HashMap<String, JsonValue>,
    pub triggers: HashMap<String, Option<String>>,
    #[serde(default)]
    pub children: Vec<ComponentNode>,
    pub layout: Layout,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Action {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub params: Vec<Param>,
    pub graph: ActionGraph,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Param {
    pub name: String,
    #[serde(rename = "type")]
    pub ty: WorkflowType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionGraph {
    pub nodes: Vec<ActionNode>,
    pub edges: Vec<ActionEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum NodeKind {
    Origin,
    Terminate,
    Branch,
    Loop,
    Constant,
    Fetch,
    GetValue,
    SetValue,
    Redirect,
    Pure,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionNode {
    pub id: String,
    pub kind: NodeKind,
    pub position: Position,
    #[serde(default)]
    pub tweak_values: HashMap<String, JsonValue>,
    #[serde(default)]
    pub literal_inputs: HashMap<String, JsonValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub constant_type: Option<WorkflowType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub constant_value: Option<JsonValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loop_item_type: Option<WorkflowType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pure_op: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EdgeKind {
    Data,
    Exec,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionEdge {
    pub id: String,
    pub from: EdgeEndpoint,
    pub to: EdgeEndpoint,
    pub kind: EdgeKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdgeEndpoint {
    pub node_id: String,
    pub port: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WorkflowType {
    Int,
    Float,
    String,
    Bool,
    Array { of: Box<WorkflowType> },
    Dict { value: Box<WorkflowType> },
    Custom { name: String },
    Any,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomTypeDef {
    pub name: String,
}
