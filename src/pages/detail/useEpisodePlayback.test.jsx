import React, { useRef } from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Hls from "hls.js";
import { useEpisodePlayback } from "./useEpisodePlayback";
import {
  getEpisodeLink,
  prefetchEpisodeLink,
} from "../../utils/episodeLinkManager";

jest.mock("hls.js", () => {
  const Hls = jest.fn(function HlsMock() {
    this.handlers = {};
    Hls.__instances.push(this);
  });

  Hls.__instances = [];
  Hls.prototype.loadSource = jest.fn();
  Hls.prototype.attachMedia = jest.fn();
  Hls.prototype.on = jest.fn(function on(event, handler) {
    this.handlers[event] = handler;
  });
  Hls.prototype.destroy = jest.fn();
  Hls.isSupported = jest.fn(() => false);
  Hls.Events = { MANIFEST_PARSED: "manifestParsed", ERROR: "error" };

  return Hls;
});

jest.mock("../../utils/episodeLinkManager", () => ({
  getEpisodeLink: jest.fn(),
  prefetchEpisodeLink: jest.fn(),
}));

const Harness = ({ episode, nextEpisode }) => {
  const videoRef = useRef(null);

  const { playbackError } = useEpisodePlayback({
    movieId: "movie-1",
    episode,
    nextEpisode,
    videoRef,
  });

  return (
    <>
      <video data-testid="video" ref={videoRef} />
      {playbackError && <p>{playbackError}</p>}
    </>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  Hls.__instances.length = 0;
  Hls.isSupported.mockReturnValue(false);
  window.HTMLMediaElement.prototype.canPlayType = jest.fn(() => "maybe");
  window.HTMLMediaElement.prototype.load = jest.fn();
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  prefetchEpisodeLink.mockResolvedValue({ playlistUrl: "/tap-2.m3u8" });
});

test("loads current episode source", async () => {
  getEpisodeLink.mockResolvedValue({ playlistUrl: "/tap-1.m3u8" });

  render(
    <Harness episode={{ name: "1", slug: "tap-1", episodeGroupIndex: 0 }} />,
  );

  await waitFor(() => {
    expect(screen.getByTestId("video").src).toContain("/tap-1.m3u8");
  });
});

test("prefetches next after current video can play", async () => {
  getEpisodeLink.mockResolvedValue({ playlistUrl: "/tap-1.m3u8" });

  render(
    <Harness
      episode={{ name: "1", slug: "tap-1", episodeGroupIndex: 0 }}
      nextEpisode={{ name: "2", slug: "tap-2", episodeGroupIndex: 0 }}
    />,
  );

  const video = await screen.findByTestId("video");
  await waitFor(() => expect(video.src).toContain("/tap-1.m3u8"));

  fireEvent.canPlay(video);

  await waitFor(() => {
    expect(prefetchEpisodeLink).toHaveBeenCalledWith("movie-1", "tap-2", 0);
  });
});

test("returns an error when the episode has no playable link", async () => {
  getEpisodeLink.mockResolvedValue({ playlistUrl: null, link_embed: null });

  render(
    <Harness episode={{ name: "1", slug: "tap-1", episodeGroupIndex: 0 }} />,
  );

  expect(
    await screen.findByText("Không tìm thấy link phát video."),
  ).toBeInTheDocument();
});

test("uses embed link when hls.js and native HLS are unsupported", async () => {
  window.HTMLMediaElement.prototype.canPlayType.mockReturnValue("");
  getEpisodeLink.mockResolvedValue({
    playlistUrl: "/tap-1.m3u8",
    link_embed: "https://embed.example/tap-1",
  });

  render(
    <Harness episode={{ name: "1", slug: "tap-1", episodeGroupIndex: 0 }} />,
  );

  await waitFor(() => {
    expect(screen.getByTestId("video").src).toBe("https://embed.example/tap-1");
  });
});

test("clears playback error when there is no active episode", async () => {
  getEpisodeLink.mockResolvedValue({ playlistUrl: null, link_embed: null });

  const { rerender } = render(
    <Harness episode={{ name: "1", slug: "tap-1", episodeGroupIndex: 0 }} />,
  );

  expect(
    await screen.findByText("Không tìm thấy link phát video."),
  ).toBeInTheDocument();

  rerender(<Harness episode={null} />);

  await waitFor(() => {
    expect(
      screen.queryByText("Không tìm thấy link phát video."),
    ).not.toBeInTheDocument();
  });
});

test("does not play or prefetch after an HLS manifest from a stale load", async () => {
  Hls.isSupported.mockReturnValue(true);
  getEpisodeLink.mockResolvedValue({ playlistUrl: "/tap-1.m3u8" });

  const { unmount } = render(
    <Harness
      episode={{ name: "1", slug: "tap-1", episodeGroupIndex: 0 }}
      nextEpisode={{ name: "2", slug: "tap-2", episodeGroupIndex: 0 }}
    />,
  );

  await waitFor(() => expect(Hls).toHaveBeenCalledTimes(1));

  const manifestParsedHandler = Hls.prototype.on.mock.calls.find(
    ([event]) => event === "manifestParsed",
  )[1];
  unmount();
  manifestParsedHandler();

  expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  expect(prefetchEpisodeLink).not.toHaveBeenCalled();
});
