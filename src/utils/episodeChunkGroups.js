export const EPISODE_CHUNK_SIZE = 50;

export const buildEpisodeChunkGroups = (
  episodes = [],
  { size = EPISODE_CHUNK_SIZE, titlePrefix = "" } = {},
) => {
  if (!Array.isArray(episodes) || episodes.length === 0) return [];

  const groupSize = Math.max(1, Number(size) || EPISODE_CHUNK_SIZE);
  const prefix = `${titlePrefix || ""}`.trim();

  const groups = [];
  for (let start = 0; start < episodes.length; start += groupSize) {
    const end = Math.min(start + groupSize, episodes.length);
    const range = `${start + 1}-${end}`;
    groups.push({
      title: prefix ? `${prefix} ${range}` : `Tập ${range}`,
      episodes: episodes.slice(start, end),
    });
  }

  return groups;
};

export const buildEpisodeDisplayGroups = (
  sourceGroups = [],
  size = EPISODE_CHUNK_SIZE,
) => {
  if (!Array.isArray(sourceGroups) || sourceGroups.length === 0) return [];

  return sourceGroups.flatMap((group) => {
    const episodes = group?.episodes || [];
    if (episodes.length <= size) return episodes.length ? [group] : [];

    const prefix = sourceGroups.length > 1 ? group.title : "";
    return buildEpisodeChunkGroups(episodes, { size, titlePrefix: prefix });
  });
};
