import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEpisodeGroupTitle } from "../../utils/episodeGroupTitle";

export const getEpisodeIdentity = (episode) =>
  episode?.episodeKey || episode?.name;

export const buildEpisodeGroups = (episodes = []) => {
  const groups = [];

  for (let groupIndex = 0; groupIndex < episodes.length; groupIndex += 1) {
    const server = episodes[groupIndex];
    const serverEpisodes = server.server_data || [];

    if (!serverEpisodes.length) continue;

    const title = formatEpisodeGroupTitle(server.server_name, groupIndex);
    const seenEpisodeKeys = new Set();

    groups.push({
      title,
      episodes: serverEpisodes.map((episode, episodeIndex) => {
        const baseEpisodeKey = `${groupIndex}:${episode.slug || episode.name || episodeIndex}`;
        const episodeKey = seenEpisodeKeys.has(baseEpisodeKey)
          ? `${baseEpisodeKey}:${episodeIndex}`
          : baseEpisodeKey;
        seenEpisodeKeys.add(baseEpisodeKey);

        return {
          ...episode,
          episodeGroupIndex: groupIndex,
          episodeGroupName: server.server_name,
          episodeGroupTitle: title,
          episodeKey,
        };
      }),
    });
  }

  return groups;
};

const findEpisodeFromUrl = (episodeList, epFromUrl) => {
  if (!epFromUrl) return null;

  return (
    episodeList.find(
      (episode) =>
        episode.episodeKey === epFromUrl || episode.name === epFromUrl,
    ) || null
  );
};

const resolveEpisode = (episodeList, epFromUrl) => {
  if (!episodeList.length) return null;

  const episodeFromUrl = findEpisodeFromUrl(episodeList, epFromUrl);
  if (episodeFromUrl) return episodeFromUrl;

  return episodeList[0];
};

const findEpisodeByIdentity = (episodeList, episode) => {
  const identity = getEpisodeIdentity(episode);
  if (!identity) return null;

  return (
    episodeList.find((item) => getEpisodeIdentity(item) === identity) || null
  );
};

const EMPTY_EPISODES = [];

export const useEpisodeCatalog = (item, epFromUrl) => {
  const episodeSource =
    item?.episode_current === "Trailer"
      ? EMPTY_EPISODES
      : item?.episodes || EMPTY_EPISODES;

  const allEpisodeGroups = useMemo(
    () => buildEpisodeGroups(episodeSource),
    [episodeSource],
  );

  const episodeList = useMemo(
    () => allEpisodeGroups.flatMap((group) => group.episodes),
    [allEpisodeGroups],
  );

  const episodeGroups = useMemo(
    () => (allEpisodeGroups.length > 1 ? allEpisodeGroups : []),
    [allEpisodeGroups],
  );

  const [currentEpisode, setCurrentEpisode] = useState(() =>
    resolveEpisode(episodeList, epFromUrl),
  );

  useEffect(() => {
    setCurrentEpisode((previousEpisode) => {
      const episodeFromUrl = findEpisodeFromUrl(episodeList, epFromUrl);
      if (episodeFromUrl) return episodeFromUrl;

      return (
        findEpisodeByIdentity(episodeList, previousEpisode) ||
        resolveEpisode(episodeList, epFromUrl)
      );
    });
  }, [episodeList, epFromUrl]);

  const currentEpisodeIndex = useMemo(() => {
    if (!episodeList.length || !currentEpisode) return -1;

    return episodeList.findIndex(
      (episode) =>
        getEpisodeIdentity(episode) === getEpisodeIdentity(currentEpisode),
    );
  }, [episodeList, currentEpisode]);

  const selectEpisode = useCallback((episode) => {
    setCurrentEpisode(episode || null);
  }, []);

  return {
    allEpisodeGroups,
    episodeGroups,
    episodeList,
    currentEpisode,
    currentEpisodeIndex,
    selectEpisode,
  };
};
