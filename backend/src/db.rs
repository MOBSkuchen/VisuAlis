use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use sqlx::sqlite::SqliteConnectOptions;

pub async fn connect(_database_url: &str) -> sqlx::Result<SqlitePool> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(SqliteConnectOptions::new().filename("data.db").create_if_missing(true))
        .await?;

    // sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}
