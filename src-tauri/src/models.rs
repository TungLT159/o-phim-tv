use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchItem {
    pub key: String,
    pub movie_id: String,
    pub episode_name: String,
    pub current_time: f64,
    pub duration: f64,
    pub percentage: f64,
    pub timestamp: String,
    pub movie_info: MovieInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovieInfo {
    pub title: String,
    pub poster: String,
    pub slug: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationState {
    pub can_go_back: bool,
    pub can_go_forward: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovieResponse {
    pub status: bool,
    pub msg: Option<String>,
    pub data: Option<MovieData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovieData {
    pub item: Option<MovieItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovieItem {
    pub _id: Option<String>,
    pub name: Option<String>,
    pub title: Option<String>,
    pub slug: Option<String>,
    pub poster_url: Option<String>,
    pub thumb_url: Option<String>,
    pub episodes: Option<Vec<EpisodeServer>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpisodeServer {
    pub server_name: Option<String>,
    pub server_data: Option<Vec<EpisodeItem>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpisodeItem {
    pub name: String,
    pub slug: String,
    pub filename: Option<String>,
    pub link_embed: Option<String>,
    pub link_m3u8: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpisodeResponse {
    pub name: String,
    pub slug: String,
    pub playlist_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamTokenEntry {
    pub url: String,
    pub expires_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadJob {
    pub id: String,
    pub status: String,
    pub progress: u32,
    pub duration: f64,
    pub current_time: f64,
    pub message: String,
    pub filename: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadStatus {
    pub job_id: String,
    pub status: String,
    pub progress: u32,
    pub message: String,
    pub filename: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariantStream {
    pub url: String,
    pub bandwidth: u64,
    pub resolution: Option<String>,
    pub height: u32,
    pub quality: Option<String>,
}
