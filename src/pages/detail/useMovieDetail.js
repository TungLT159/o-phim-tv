import { useEffect, useReducer } from "react";
import tmdbApi from "../../api/tmdbApi";

const LOAD_ERROR_MESSAGE =
  "Không tải được dữ liệu phim. Vui lòng kiểm tra lại đường dẫn hoặc thử lại sau.";

const initialDetailState = {
  item: null,
  itemRouteKey: null,
  loadError: null,
};

const detailReducer = (state, action) => {
  switch (action.type) {
    case "loading":
      return initialDetailState;
    case "loaded":
      return {
        item: action.item,
        itemRouteKey: action.routeKey,
        loadError: null,
      };
    case "failed":
      return {
        item: null,
        itemRouteKey: null,
        loadError: LOAD_ERROR_MESSAGE,
      };
    default:
      return state;
  }
};

export const useMovieDetail = (category, id) => {
  const [state, dispatch] = useReducer(detailReducer, initialDetailState);
  const routeKey = `${category}/${id}`;

  useEffect(() => {
    let isCancelled = false;

    const loadDetail = async () => {
      try {
        dispatch({ type: "loading" });
        if (isCancelled) return;

        const response = await tmdbApi.detail(category, id, { params: {} });
        if (isCancelled) return;
        dispatch({ type: "loaded", item: response.data.item, routeKey });
        window.scrollTo(0, 0);
      } catch (error) {
        if (isCancelled) return;
        console.error("Error loading movie detail:", error);
        dispatch({ type: "failed" });
      }
    };

    loadDetail();

    return () => {
      isCancelled = true;
    };
  }, [category, id, routeKey]);

  return {
    item: state.itemRouteKey === routeKey ? state.item : null,
    loadError: state.loadError,
  };
};
