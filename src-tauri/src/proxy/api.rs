use crate::proxy::stream;
use serde::{Deserialize, Serialize};

const OPHIM_BASE_URL: &str = "https://ophim1.com";

#[derive(Clone, Serialize, Deserialize)]
struct EpisodeServer {
    server_name: Option<String>,
    server_data: Option<Vec<EpisodeItem>>,
}

#[derive(Clone, Serialize, Deserialize)]
struct EpisodeItem {
    name: String,
    slug: String,
    filename: Option<String>,
    link_embed: Option<String>,
    link_m3u8: Option<String>,
}

#[tauri::command]
pub async fn fetch_movie_detail(id: String) -> Result<serde_json::Value, String> {
    let url = format!("{}/v1/api/phim/{}", OPHIM_BASE_URL, id);
    let client = reqwest::Client::new();

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch movie: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Upstream request failed: {}", resp.status()));
    }

    let mut data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(item) = data.pointer_mut("/data/item") {
        if let Some(episodes) = item.get_mut("episodes") {
            if let Some(episodes_arr) = episodes.as_array_mut() {
                for server in episodes_arr.iter_mut() {
                    if let Some(server_data) = server.get_mut("server_data") {
                        if let Some(data_arr) = server_data.as_array_mut() {
                            for ep in data_arr.iter_mut() {
                                if let Some(obj) = ep.as_object_mut() {
                                    obj.remove("link_m3u8");
                                    obj.remove("link_embed");
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(data)
}

#[tauri::command]
pub async fn fetch_episode(
    id: String,
    name: String,
    group: Option<usize>,
) -> Result<serde_json::Value, String> {
    let url = format!("{}/v1/api/phim/{}", OPHIM_BASE_URL, id);
    let client = reqwest::Client::new();

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch movie: {}", e))?;

    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse: {}", e))?;

    let episodes_val = data
        .pointer("/data/item/episodes")
        .ok_or_else(|| "No episodes found".to_string())?
        .clone();

    let episodes: Vec<EpisodeServer> = serde_json::from_value(episodes_val)
        .map_err(|e| format!("Parse error: {}", e))?;

    let episode = match group {
        Some(idx) => episodes
            .get(idx)
            .and_then(|s| s.server_data.as_ref())
            .and_then(|data| data.iter().find(|e| e.name == name || e.slug == name))
            .cloned(),
        None => episodes.iter().find_map(|s| {
            s.server_data.as_ref().and_then(|data| {
                data.iter().find(|e| e.name == name || e.slug == name).cloned()
            })
        }),
    };

    let ep = episode.ok_or_else(|| "Episode not found".to_string())?;
    let m3u8_url = ep
        .link_m3u8
        .clone()
        .ok_or_else(|| "Episode has no stream URL".to_string())?;

    let playlist_url = stream::create_stream_token_inner(m3u8_url);

    Ok(serde_json::json!({
        "name": ep.name,
        "slug": ep.slug,
        "playlistUrl": playlist_url,
    }))
}
