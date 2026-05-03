#![deny(warnings)]

mod compile;
mod db;
mod error;
mod projects;
mod router;

#[tokio::main]
async fn main() {
    let database_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:visualis.sqlite".to_string());

    let pool = db::connect(&database_url)
        .await
        .expect("failed to connect to database");

    let app = router::build(pool);

    let addr = "0.0.0.0:7979";
    println!("visualis-backend listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind");
    axum::serve(listener, app).await.expect("server error");
}
