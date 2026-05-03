use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

use crate::error::{AppError, Result};

#[derive(Debug, Serialize)]
pub struct ProjectMeta {
    pub id: String,
    pub name: String,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateBody {
    pub name: String,
}

pub async fn list(State(pool): State<SqlitePool>) -> Result<Json<Vec<ProjectMeta>>> {
    let rows = sqlx::query(
        "SELECT id, name, updated_at FROM projects ORDER BY updated_at DESC",
    )
    .fetch_all(&pool)
    .await?;

    let metas = rows
        .into_iter()
        .map(|r| ProjectMeta {
            id: r.get("id"),
            name: r.get("name"),
            updated_at: r.get("updated_at"),
        })
        .collect();

    Ok(Json(metas))
}

pub async fn get(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    let row = sqlx::query("SELECT data FROM projects WHERE id = ?")
        .bind(&id)
        .fetch_optional(&pool)
        .await?
        .ok_or(AppError::NotFound)?;

    let data_bytes: Vec<u8> = row.get("data");
    let data: Value = serde_json::from_slice(&data_bytes)?;
    Ok(Json(data))
}

pub async fn create(
    State(pool): State<SqlitePool>,
    Json(body): Json<CreateBody>,
) -> Result<Json<Value>> {
    let id = Uuid::new_v4().to_string();
    let now = now_unix();
    let initial = serde_json::json!({
        "id": id,
        "name": body.name,
        "version": "0.1.0",
        "pages": [{
            "id": Uuid::new_v4().to_string(),
            "path": "/home",
            "title": "Home",
            "root": {
                "id": Uuid::new_v4().to_string(),
                "cls": "container",
                "staticProps": {},
                "variableProps": {},
                "triggers": {},
                "children": [],
                "layout": { "kind": "flex", "direction": "column", "gap": 8, "align": "flex-start", "justify": "flex-start" }
            }
        }],
        "actions": [],
        "customTypes": []
    });
    let data = serde_json::to_vec(&initial)?;

    sqlx::query(
        "INSERT INTO projects (id, name, updated_at, data) VALUES (?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&body.name)
    .bind(now)
    .bind(&data)
    .execute(&pool)
    .await?;

    Ok(Json(initial))
}

pub async fn upsert(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>> {
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::BadRequest("missing 'name' field".into()))?
        .to_string();
    let now = now_unix();
    let data = serde_json::to_vec(&body)?;

    sqlx::query(
        "INSERT INTO projects (id, name, updated_at, data)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE
         SET name = excluded.name,
             updated_at = excluded.updated_at,
             data = excluded.data",
    )
    .bind(&id)
    .bind(&name)
    .bind(now)
    .bind(&data)
    .execute(&pool)
    .await?;

    Ok(Json(body))
}

pub async fn delete(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    let rows = sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await?
        .rows_affected();

    if rows == 0 {
        return Err(AppError::NotFound);
    }
    Ok(Json(serde_json::json!({ "ok": true })))
}

fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
