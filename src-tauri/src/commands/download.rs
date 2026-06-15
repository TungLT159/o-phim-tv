use crate::models::{DownloadJob, DownloadStatus};
use crate::proxy::playlist;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const DOWNLOAD_JOB_TTL_MS: u64 = 60 * 60 * 1000;

pub struct DownloadManager {
    jobs: Mutex<HashMap<String, JobEntry>>,
}

struct JobEntry {
    job: DownloadJob,
    output_path: Option<String>,
    created_at: u64,
}

impl DownloadManager {
    pub fn new() -> Self {
        DownloadManager {
            jobs: Mutex::new(HashMap::new()),
        }
    }
}

fn generate_job_id() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    format!("{:x}", now)
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis()
}

#[tauri::command]
pub async fn start_download(
    slug: String,
    ep: String,
    quality: Option<String>,
    app: tauri::AppHandle,
    state: tauri::State<'_, DownloadManager>,
) -> Result<DownloadJob, String> {
    let movie_url = format!("https://ophim1.com/v1/api/phim/{}", slug);
    let client = reqwest::Client::new();
    let resp = client
        .get(&movie_url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch movie: {}", e))?;
    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse: {}", e))?;

    let episodes_val = data
        .pointer("/data/item/episodes")
        .ok_or_else(|| "No episodes".to_string())?
        .clone();
    let episodes: Vec<serde_json::Value> =
        serde_json::from_value(episodes_val).map_err(|e| e.to_string())?;

    let mut m3u8_url: Option<String> = None;
    for server in &episodes {
        if let Some(data_arr) = server.get("server_data").and_then(|d| d.as_array()) {
            for episode in data_arr {
                let name = episode.get("name").and_then(|n| n.as_str()).unwrap_or("");
                let slug_val = episode.get("slug").and_then(|s| s.as_str()).unwrap_or("");
                if name == ep || slug_val == ep {
                    m3u8_url = episode
                        .get("link_m3u8")
                        .and_then(|l| l.as_str())
                        .map(|s| s.to_string());
                    break;
                }
            }
        }
        if m3u8_url.is_some() {
            break;
        }
    }

    let m3u8 = m3u8_url.ok_or_else(|| "Episode stream not found".to_string())?;

    let master_resp = client
        .get(&m3u8)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch playlist: {}", e))?;
    let master_text = master_resp
        .text()
        .await
        .map_err(|e| format!("Failed to read playlist: {}", e))?;

    let input_url = if master_text.contains("#EXT-X-STREAM-INF") {
        let variants = playlist::parse_master_playlist(&master_text, &m3u8);
        let q = quality.as_deref().unwrap_or("");
        playlist::select_quality_variant(&variants, q)
            .map(|v| v.url.clone())
            .unwrap_or(m3u8)
    } else {
        m3u8
    };

    let job_id = generate_job_id();
    let job = DownloadJob {
        id: job_id.clone(),
        status: "processing".to_string(),
        progress: 0,
        duration: 0.0,
        current_time: 0.0,
        message: "Đang chuẩn bị chuyển mã...".to_string(),
        filename: format!("{}-{}.mp4", slug, ep),
    };

    let output_dir = std::env::temp_dir().join(format!("ophim-dl-{}", job_id));
    std::fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    let output_path = output_dir.join("download.mp4");

    let shell = app.shell();
    let ffmpeg_args: Vec<&str> = vec![
        "-y",
        "-nostdin",
        "-user_agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "-i",
        &input_url,
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
    ];

    let _sidecar_result = shell
        .sidecar("ffmpeg")
        .map_err(|e| format!("Failed to create sidecar: {}", e))?
        .args(&ffmpeg_args)
        .arg(&output_path.to_string_lossy().to_string())
        .spawn();

    let mut jobs = state.jobs.lock().map_err(|e| e.to_string())?;
    jobs.insert(
        job_id,
        JobEntry {
            job: job.clone(),
            output_path: Some(output_path.to_string_lossy().to_string()),
            created_at: now_ms(),
        },
    );

    Ok(job)
}

#[tauri::command]
pub fn get_download_status(
    job_id: String,
    state: tauri::State<'_, DownloadManager>,
) -> Result<DownloadStatus, String> {
    let jobs = state.jobs.lock().map_err(|e| e.to_string())?;
    let entry = jobs.get(&job_id).ok_or_else(|| "Job not found".to_string())?;

    Ok(DownloadStatus {
        job_id: entry.job.id.clone(),
        status: entry.job.status.clone(),
        progress: entry.job.progress,
        message: entry.job.message.clone(),
        filename: entry.job.filename.clone(),
        size: 0,
    })
}

#[tauri::command]
pub fn cancel_download(
    job_id: String,
    state: tauri::State<'_, DownloadManager>,
) -> Result<(), String> {
    let mut jobs = state.jobs.lock().map_err(|e| e.to_string())?;
    jobs.remove(&job_id);
    Ok(())
}

#[tauri::command]
pub async fn download_file(
    job_id: String,
    state: tauri::State<'_, DownloadManager>,
) -> Result<Vec<u8>, String> {
    let jobs = state.jobs.lock().map_err(|e| e.to_string())?;
    let entry = jobs.get(&job_id).ok_or_else(|| "Job not found".to_string())?;
    let path = entry
        .output_path
        .as_ref()
        .ok_or_else(|| "No output file".to_string())?;

    tokio::fs::read(path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))
}
