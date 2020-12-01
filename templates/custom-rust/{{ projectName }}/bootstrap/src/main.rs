use warp::Filter;

#[tokio::main]
async fn main() {
    // POST /invoke
    let route = warp::path!("invoke")
        .and(warp::post())
        .map(|| "Rust demo function invoked.");

    warp::serve(route)
        .run(([0, 0, 0, 0], 9000))
        .await;
}
