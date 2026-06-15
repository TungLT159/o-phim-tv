export const formatEpisodeGroupTitle = (serverName, index) => {
  const name = `${serverName ?? ""}`.trim();
  return name || `Phần ${index + 1}`;
};
