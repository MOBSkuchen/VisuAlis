use axum::{
    routing::{delete, get, post, put},
    Router,
};
use sqlx::SqlitePool;
use tower_http::cors::{Any, CorsLayer};

use crate::{compile, projects};

pub fn build(pool: SqlitePool) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", get(health))
        .route("/projects", get(projects::list))
        .route("/projects", post(projects::create))
        .route("/projects/{id}", get(projects::get))
        .route("/projects/{id}", put(projects::upsert))
        .route("/projects/{id}", delete(projects::delete))
        .route("/projects/{id}/compile", post(compile::compile))
        .layer(cors)
        .with_state(pool)
}

async fn health() -> &'static str {
    "ok"
}
