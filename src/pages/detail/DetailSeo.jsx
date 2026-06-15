import { Helmet } from "react-helmet";

const getAbsoluteImageUrl = (imageUrl) => {
  if (!imageUrl) return `${window.location.origin}/poster-mau.png`;
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${window.location.origin}${imageUrl}`;
};

const DetailSeo = ({
  item,
  movieId,
  overview,
  posterUrl,
  hasCurrentEpisode,
  currentEpisodeIdentity,
  currentEpisodeDisplayName,
}) => {
  const title = item.title || item.name;
  const episodeSuffix = hasCurrentEpisode ? `- ${currentEpisodeDisplayName}` : "";
  const description =
    overview ||
    item.content?.replace(/<[^>]+>/g, "") ||
    "Xem phim online chất lượng HD";
  const imageUrl = getAbsoluteImageUrl(posterUrl);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: title,
    description: overview || item.content?.replace(/<[^>]+>/g, ""),
    image: imageUrl,
    datePublished: item.year,
    genre: item.category?.map((cat) => cat.name).join(", "),
    contentRating: item.quality,
    inLanguage: item.lang || "vi",
    duration: item.time,
    aggregateRating: item.tmdb?.vote_average
      ? {
          "@type": "AggregateRating",
          ratingValue: item.tmdb.vote_average,
          ratingCount: item.tmdb.vote_count,
        }
      : undefined,
  };

  return (
    <Helmet>
      <title>{`${title} ${episodeSuffix} | Ổ Phim`}</title>
      <meta name="description" content={description} />
      <meta
        name="keywords"
        content={`${title}, xem phim ${title}, ${item.category?.map((c) => c.name).join(", ")}, phim ${item.year}`}
      />
      <link
        rel="canonical"
        href={`${window.location.origin}/movie/${movieId}${hasCurrentEpisode ? `?ep=${currentEpisodeIdentity}` : ""}`}
      />

      {/* Open Graph */}
      <meta property="og:type" content="video.movie" />
      <meta property="og:title" content={`${title} ${episodeSuffix}`} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:width" content="500" />
      <meta property="og:image:height" content="750" />
      <meta property="og:image:alt" content={`Poster phim ${title}`} />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:url" content={`${window.location.origin}/movie/${movieId}`} />
      <meta property="og:site_name" content="Ổ Phim" />
      <meta property="og:locale" content="vi_VN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${title} ${episodeSuffix}`} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={`Poster phim ${title}`} />

      {/* Structured Data */}
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
};

export default DetailSeo;
