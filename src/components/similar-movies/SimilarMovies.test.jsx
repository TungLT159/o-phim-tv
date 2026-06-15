import React from "react";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import SimilarMovies from "./SimilarMovies";
import axiosClient from "../../api/axiosClient";

const AUTOPLAY_MODULE_MARKER = "autoplay-module";

jest.mock(
  "swiper/react",
  () => ({
    Swiper: ({ children }) => <div>{children}</div>,
    SwiperSlide: ({ children }) => <div>{children}</div>,
  }),
  { virtual: true },
);

jest.mock(
  "swiper/modules",
  () => ({
    Autoplay: AUTOPLAY_MODULE_MARKER,
  }),
  { virtual: true },
);

jest.mock("../../api/axiosClient", () => ({
  get: jest.fn(),
}));

jest.mock("../movie-card/MovieCard", () => ({ item }) => (
  <article data-testid="movie-card">{item.name}</article>
));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

beforeEach(() => {
  axiosClient.get.mockReset();
});

test("requests keyword matches concurrently and keeps keyword merge order", async () => {
  const nameSearch = deferred();
  const alphaSearch = deferred();
  const betaSearch = deferred();
  const gammaSearch = deferred();

  axiosClient.get
    .mockReturnValueOnce(nameSearch.promise)
    .mockReturnValueOnce(alphaSearch.promise)
    .mockReturnValueOnce(betaSearch.promise)
    .mockReturnValueOnce(gammaSearch.promise);

  render(
    <SimilarMovies
      movie={{
        _id: "current-movie",
        name: "Alpha Beta Gamma",
        category: [],
      }}
    />,
  );

  await waitFor(() => expect(axiosClient.get).toHaveBeenCalledTimes(1));

  await act(async () => {
    nameSearch.resolve({ data: { items: [] } });
    await nameSearch.promise;
  });

  await waitFor(() => expect(axiosClient.get).toHaveBeenCalledTimes(4));
  expect(axiosClient.get.mock.calls.slice(1).map(([url]) => url)).toEqual([
    "/v1/api/tim-kiem?keyword=Alpha&limit=8",
    "/v1/api/tim-kiem?keyword=Beta&limit=8",
    "/v1/api/tim-kiem?keyword=Gamma&limit=8",
  ]);

  await act(async () => {
    gammaSearch.resolve({
      data: { items: [{ _id: "gamma", name: "Gamma result", tmdb: { vote_average: 7 } }] },
    });
    betaSearch.resolve({
      data: { items: [{ _id: "beta", name: "Beta result", tmdb: { vote_average: 7 } }] },
    });
    alphaSearch.resolve({
      data: { items: [{ _id: "alpha", name: "Alpha result", tmdb: { vote_average: 7 } }] },
    });
    await Promise.all([gammaSearch.promise, betaSearch.promise, alphaSearch.promise]);
  });

  expect(await screen.findAllByTestId("movie-card")).toHaveLength(3);
  expect(screen.getAllByTestId("movie-card").map((card) => card.textContent)).toEqual([
    "Alpha result",
    "Beta result",
    "Gamma result",
  ]);
});

test("requests category matches concurrently and keeps category merge order", async () => {
  const actionSearch = deferred();
  const dramaSearch = deferred();
  const comedySearch = deferred();

  axiosClient.get
    .mockReturnValueOnce(actionSearch.promise)
    .mockReturnValueOnce(dramaSearch.promise)
    .mockReturnValueOnce(comedySearch.promise);

  render(
    <SimilarMovies
      movie={{
        _id: "current-movie",
        category: [
          { slug: "hanh-dong", name: "Hành Động" },
          { slug: "tam-ly", name: "Tâm Lý" },
          { slug: "hai", name: "Hài" },
        ],
      }}
    />,
  );

  await waitFor(() => expect(axiosClient.get).toHaveBeenCalledTimes(3));
  expect(axiosClient.get.mock.calls.map(([url]) => url)).toEqual([
    "/v1/api/the-loai/hanh-dong?page=1&limit=12",
    "/v1/api/the-loai/tam-ly?page=1&limit=12",
    "/v1/api/the-loai/hai?page=1&limit=12",
  ]);

  await act(async () => {
    comedySearch.resolve({
      data: { items: [{ _id: "comedy", name: "Comedy result", tmdb: { vote_average: 6 } }] },
    });
    dramaSearch.resolve({
      data: { items: [{ _id: "drama", name: "Drama result", tmdb: { vote_average: 6 } }] },
    });
    actionSearch.resolve({
      data: { items: [{ _id: "action", name: "Action result", tmdb: { vote_average: 6 } }] },
    });
    await Promise.all([comedySearch.promise, dramaSearch.promise, actionSearch.promise]);
  });

  expect(await screen.findAllByTestId("movie-card")).toHaveLength(3);
  expect(screen.getAllByTestId("movie-card").map((card) => card.textContent)).toEqual([
    "Action result",
    "Drama result",
    "Comedy result",
  ]);
});

test("ignores stale responses after the movie changes", async () => {
  const oldNameSearch = deferred();
  const oldKeywordSearch = deferred();
  const newNameSearch = deferred();
  const newKeywordSearch = deferred();

  axiosClient.get
    .mockReturnValueOnce(oldNameSearch.promise)
    .mockReturnValueOnce(newNameSearch.promise)
    .mockReturnValueOnce(newKeywordSearch.promise)
    .mockReturnValueOnce(oldKeywordSearch.promise);

  const { rerender } = render(
    <SimilarMovies
      movie={{
        _id: "old-movie",
        name: "OldMovie",
        category: [],
      }}
    />,
  );

  await waitFor(() => expect(axiosClient.get).toHaveBeenCalledTimes(1));

  rerender(
    <SimilarMovies
      movie={{
        _id: "new-movie",
        name: "NewMovie",
        category: [],
      }}
    />,
  );

  await waitFor(() => expect(axiosClient.get).toHaveBeenCalledTimes(2));

  await act(async () => {
    newNameSearch.resolve({ data: { items: [] } });
    await newNameSearch.promise;
  });
  await waitFor(() => expect(axiosClient.get).toHaveBeenCalledTimes(3));

  await act(async () => {
    newKeywordSearch.resolve({
      data: { items: [{ _id: "new-result", name: "New result" }] },
    });
    await newKeywordSearch.promise;
  });

  expect(await screen.findByText("New result")).toBeInTheDocument();

  await act(async () => {
    oldNameSearch.resolve({ data: { items: [] } });
    await oldNameSearch.promise;
  });
  await waitFor(() => expect(axiosClient.get).toHaveBeenCalledTimes(4));

  await act(async () => {
    oldKeywordSearch.resolve({
      data: { items: [{ _id: "old-result", name: "Old result" }] },
    });
    await oldKeywordSearch.promise;
  });

  expect(screen.getByText("New result")).toBeInTheDocument();
  expect(screen.queryByText("Old result")).not.toBeInTheDocument();
});
