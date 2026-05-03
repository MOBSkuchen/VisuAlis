use axum::{
    extract::{Path, State},
    http::header,
    response::IntoResponse,
};
use sqlx::{Row, SqlitePool};

use crate::error::{AppError, Result};

pub async fn compile(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse> {
    let row = sqlx::query("SELECT data, name FROM projects WHERE id = ?")
        .bind(&id)
        .fetch_optional(&pool)
        .await?
        .ok_or(AppError::NotFound)?;

    let data_bytes: Vec<u8> = row.get("data");
    let name: String = row.get("name");

    let ast: serde_json::Value = serde_json::from_slice(&data_bytes)?;
    let opts = visualis_compiler::CompileOptions {
        project_name: name.clone(),
    };
    let workspace = visualis_compiler::compile(&ast, &opts)
        .map_err(|e| AppError::Compile(e.to_string()))?;

    let zip_bytes = workspace
        .to_zip()
        .map_err(|e| AppError::Compile(e.to_string()))?;

    let filename = format!("{}.zip", slug(&name));
    Ok((
        [
            (header::CONTENT_TYPE, "application/zip".to_string()),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{filename}\""),
            ),
        ],
        zip_bytes,
    ))
}

fn slug(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' { c } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}
