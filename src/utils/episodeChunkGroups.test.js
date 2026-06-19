import {
  buildEpisodeChunkGroups,
  buildEpisodeDisplayGroups,
} from "./episodeChunkGroups";

const makeEpisodes = (count) =>
  Array.from({ length: count }, (_, index) => ({
    name: `${index + 1}`,
    slug: `tap-${index + 1}`,
    episodeKey: `0:tap-${index + 1}`,
  }));

test("returns no chunk groups for an empty episode list", () => {
  expect(buildEpisodeChunkGroups([])).toEqual([]);
});

test("keeps one group for up to 50 episodes", () => {
  const episodes = makeEpisodes(50);

  expect(buildEpisodeChunkGroups(episodes)).toEqual([
    { title: "Tập 1-50", episodes },
  ]);
});

test("splits 51 episodes into two range groups", () => {
  const episodes = makeEpisodes(51);
  const groups = buildEpisodeChunkGroups(episodes);

  expect(groups.map((group) => group.title)).toEqual([
    "Tập 1-50",
    "Tập 51-51",
  ]);
  expect(groups[0].episodes).toHaveLength(50);
  expect(groups[1].episodes).toEqual([episodes[50]]);
});

test("preserves original episode objects and metadata", () => {
  const episodes = makeEpisodes(51);
  const groups = buildEpisodeChunkGroups(episodes);

  expect(groups[0].episodes[0]).toBe(episodes[0]);
  expect(groups[1].episodes[0]).toMatchObject({ episodeKey: "0:tap-51" });
});

test("chunks large source groups while keeping small server groups unchanged", () => {
  const large = { title: "Vietsub", episodes: makeEpisodes(120) };
  const small = { title: "Thuyết minh", episodes: makeEpisodes(2) };
  const groups = buildEpisodeDisplayGroups([large, small], 50);

  expect(groups.map((group) => group.title)).toEqual([
    "Vietsub 1-50",
    "Vietsub 51-100",
    "Vietsub 101-120",
    "Thuyết minh",
  ]);
  expect(groups[0].episodes[0]).toBe(large.episodes[0]);
});
