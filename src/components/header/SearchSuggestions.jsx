const SearchSuggestionItem = ({
  movie,
  isMobile,
  onSuggestionClick,
  onTouchStart,
  onTouchEnd,
}) => (
  <button
    key={movie._id}
    type="button"
    className="suggestion-item"
    onTouchStart={isMobile ? onTouchStart : undefined}
    onTouchEnd={isMobile ? (e) => onTouchEnd(movie, e) : undefined}
    onClick={(e) => onSuggestionClick(movie, e)}
    onMouseDown={isMobile ? undefined : (e) => e.preventDefault()}
  >
    <span
      className="suggestion-poster"
      style={{
        backgroundImage: `url(${movie.tmdb_poster || movie.thumb_url || movie.poster_url || "/poster-mau.png"})`,
      }}
    ></span>
    <span className="suggestion-info">
      <span className="suggestion-title">{movie.name}</span>
      <span className="suggestion-meta">
        {movie.year != null && <span>{movie.year}</span>}
        {movie.quality && <span className="quality">{movie.quality}</span>}
      </span>
    </span>
  </button>
);

const SearchSuggestions = ({
  isMobile = false,
  showSuggestions,
  isSearching,
  suggestions,
  suggestionPosition,
  onSuggestionClick,
  onTouchStart,
  onTouchEnd,
}) => {
  if (!showSuggestions) {
    return null;
  }

  const style = isMobile
    ? undefined
    : {
        top: `${suggestionPosition.top}px`,
        left: `${suggestionPosition.left}px`,
        width: `${suggestionPosition.width}px`,
      };

  return (
    <div className={`search-suggestions${isMobile ? " mobile" : ""}`} style={style}>
      {isSearching ? (
        <div className="suggestion-loading">Đang tìm kiếm…</div>
      ) : (
        suggestions.map((movie) => (
          <SearchSuggestionItem
            key={movie._id}
            movie={movie}
            isMobile={isMobile}
            onSuggestionClick={onSuggestionClick}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          />
        ))
      )}
    </div>
  );
};

export default SearchSuggestions;
