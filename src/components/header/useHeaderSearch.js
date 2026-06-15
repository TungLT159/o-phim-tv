import { useCallback, useEffect, useRef, useState } from "react";
import tmdbApi from "../../api/tmdbApi";
import { fetchTMDBImagesForItems } from "../../utils/tmdbImageFetcher";

const useHeaderSearch = ({ navigate, closeMobileMenu }) => {
  const [keyword, setKeyword] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestionPosition, setSuggestionPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const searchRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const clearSuggestions = useCallback(() => {
    setShowSuggestions(false);
    setSuggestions([]);
  }, []);

  const updateSuggestionPosition = useCallback(() => {
    if (searchRef.current) {
      const rect = searchRef.current.getBoundingClientRect();
      setSuggestionPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    const handlePositionUpdate = () => updateSuggestionPosition();

    if (showSuggestions) {
      updateSuggestionPosition();
      window.addEventListener("scroll", handlePositionUpdate, true);
      window.addEventListener("resize", handlePositionUpdate);
    }

    return () => {
      window.removeEventListener("scroll", handlePositionUpdate, true);
      window.removeEventListener("resize", handlePositionUpdate);
    };
  }, [showSuggestions, updateSuggestionPosition]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        const suggestionDropdown = document.querySelector(
          ".search-suggestions",
        );
        if (suggestionDropdown && suggestionDropdown.contains(event.target)) {
          return;
        }
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    },
    [],
  );

  const fetchSuggestions = useCallback(
    async (searchKeyword) => {
      if (searchKeyword.trim().length < 2) {
        clearSuggestions();
        return;
      }

      setIsSearching(true);
      try {
        const response = await tmdbApi.search("movie", {
          keyword: searchKeyword,
          limit: 8,
        });
        const items = response.data?.items || [];
        const itemsWithImages = await fetchTMDBImagesForItems(items);

        setSuggestions(itemsWithImages);
        setShowSuggestions(itemsWithImages.length > 0);

        if (searchRef.current && itemsWithImages.length > 0) {
          const rect = searchRef.current.getBoundingClientRect();
          setSuggestionPosition({
            top: rect.bottom,
            left: rect.left,
            width: rect.width,
          });
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    },
    [clearSuggestions],
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setKeyword(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSearchFocus = () => {
    if (keyword.trim().length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const goToSearch = (e) => {
    e.preventDefault();
    if (keyword.trim().length > 0) {
      navigate(`/movie/search/${keyword}`);
      setKeyword("");
      closeMobileMenu();
      clearSuggestions();
    }
  };

  const handleSuggestionClick = useCallback(
    (movie, e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const movieId = movie.slug || movie._id;
      navigate(`/movie/${movieId}`);

      setKeyword("");
      clearSuggestions();
      closeMobileMenu();
    },
    [clearSuggestions, closeMobileMenu, navigate],
  );

  const handleTouchStart = useCallback((e) => {
    e.currentTarget.dataset.touchStartY = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (movie, e) => {
      const touchStartY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = Math.abs(touchEndY - touchStartY);

      if (deltaY < 10) {
        handleSuggestionClick(movie, e);
      }
    },
    [handleSuggestionClick],
  );

  return {
    keyword,
    suggestions,
    showSuggestions,
    isSearching,
    suggestionPosition,
    searchRef,
    handleSearchChange,
    handleSearchFocus,
    goToSearch,
    handleSuggestionClick,
    handleTouchStart,
    handleTouchEnd,
  };
};

export default useHeaderSearch;
