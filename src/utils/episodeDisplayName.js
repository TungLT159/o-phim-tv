export const formatEpisodeDisplayName = (episodeName) => {
  const name = `${episodeName ?? ""}`.trim();

  if (!name) return "Tập";
  if (/^tập\b/i.test(name)) return name;

  return `Tập ${name}`;
};
