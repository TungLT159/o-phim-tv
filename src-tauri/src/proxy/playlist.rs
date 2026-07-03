use crate::models::VariantStream;

/// Parse an M3U8 master playlist and extract variant stream info.
pub fn parse_master_playlist(content: &str, base_url: &str) -> Vec<VariantStream> {
    let mut variants = Vec::new();
    let mut current_bandwidth: Option<u64> = None;
    let mut current_resolution: Option<String> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed.starts_with("#EXT-X-STREAM-INF:") {
            let attributes = trimmed
                .strip_prefix("#EXT-X-STREAM-INF:")
                .unwrap_or(trimmed);

            current_bandwidth = attributes.split(|c| c == ',' || c == ' ').find_map(|part| {
                let part = part.trim();
                if let Some(bw) = part.strip_prefix("BANDWIDTH=") {
                    bw.parse::<u64>().ok()
                } else {
                    None
                }
            });

            current_resolution = attributes.split(|c| c == ',' || c == ' ').find_map(|part| {
                let part = part.trim();
                if let Some(res) = part.strip_prefix("RESOLUTION=") {
                    Some(res.to_string())
                } else {
                    None
                }
            });
        } else if !trimmed.starts_with('#') {
            if let (Some(bandwidth), Some(resolution)) =
                (current_bandwidth.take(), current_resolution.take())
            {
                let url = resolve_url(trimmed, base_url);
                let height = resolution
                    .split('x')
                    .nth(1)
                    .and_then(|h| h.parse::<u32>().ok())
                    .unwrap_or(0);
                let quality = if height > 0 {
                    Some(format!("{}p", height))
                } else {
                    None
                };
                variants.push(VariantStream {
                    url,
                    bandwidth,
                    resolution: Some(resolution),
                    height,
                    quality,
                });
            } else if let Some(bandwidth) = current_bandwidth.take() {
                let url = resolve_url(trimmed, base_url);
                variants.push(VariantStream {
                    url,
                    bandwidth,
                    resolution: None,
                    height: 0,
                    quality: None,
                });
            }
        }
    }

    variants
}

/// Select the best quality variant matching the requested quality, or the highest bandwidth.
pub fn select_quality_variant<'a>(
    variants: &'a [VariantStream],
    requested_quality: &str,
) -> Option<&'a VariantStream> {
    if variants.is_empty() {
        return None;
    }

    if !requested_quality.is_empty() {
        let requested_height = requested_quality.trim_end_matches('p').parse::<u32>().ok();
        if let Some(height) = requested_height {
            if let Some(exact) = variants.iter().find(|v| v.height == height) {
                return Some(exact);
            }
        }
    }

    variants.iter().max_by_key(|v| v.bandwidth)
}

fn resolve_url(value: &str, base_url: &str) -> String {
    if value.starts_with("http://") || value.starts_with("https://") {
        value.to_string()
    } else {
        let base = base_url
            .rsplit_once('/')
            .map(|(prefix, _)| prefix)
            .unwrap_or_else(|| base_url.trim_end_matches('/'));
        let path = value.trim_start_matches('/');
        format!("{}/{}", base, path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_master_playlist() {
        let content = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=720x404\n720p.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2560000,RESOLUTION=1080x608\n1080p.m3u8\n";
        let base = "https://example.com/playlist.m3u8";
        let variants = parse_master_playlist(content, base);
        assert_eq!(variants.len(), 2);
        assert_eq!(variants[0].height, 404);
        assert_eq!(variants[1].height, 608);
    }

    #[test]
    fn test_select_quality_variant() {
        let variants = vec![
            VariantStream {
                url: "a.m3u8".into(),
                bandwidth: 1280000,
                resolution: Some("720x404".into()),
                height: 404,
                quality: Some("404p".into()),
            },
            VariantStream {
                url: "b.m3u8".into(),
                bandwidth: 2560000,
                resolution: Some("1080x608".into()),
                height: 608,
                quality: Some("608p".into()),
            },
        ];
        let selected = select_quality_variant(&variants, "608p").unwrap();
        assert_eq!(selected.height, 608);
    }

    #[test]
    fn test_select_quality_variant_fallback_to_highest() {
        let variants = vec![
            VariantStream {
                url: "a.m3u8".into(),
                bandwidth: 1280000,
                resolution: Some("720x404".into()),
                height: 404,
                quality: Some("404p".into()),
            },
            VariantStream {
                url: "b.m3u8".into(),
                bandwidth: 2560000,
                resolution: Some("1080x608".into()),
                height: 608,
                quality: Some("608p".into()),
            },
        ];
        let selected = select_quality_variant(&variants, "").unwrap();
        assert_eq!(selected.bandwidth, 2560000);
    }

    #[test]
    fn test_resolve_url_absolute() {
        assert_eq!(
            resolve_url("https://other.com/seg.ts", "https://base.com/play.m3u8"),
            "https://other.com/seg.ts"
        );
    }

    #[test]
    fn test_resolve_url_relative() {
        assert_eq!(
            resolve_url("seg.ts", "https://base.com/path/play.m3u8"),
            "https://base.com/path/seg.ts"
        );
    }

    #[test]
    fn test_empty_playlist() {
        let variants = parse_master_playlist("", "https://example.com/");
        assert!(variants.is_empty());
    }

    #[test]
    fn test_playlist_with_no_variants() {
        let variants = parse_master_playlist("#EXTM3U\n#EXT-X-ENDLIST", "https://example.com/");
        assert!(variants.is_empty());
    }
}
