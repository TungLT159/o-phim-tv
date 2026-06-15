/**
 * SEO Helper Functions
 * Các hàm tiện ích để tối ưu SEO cho website
 */

/**
 * Chuyển đổi URL hình ảnh thành absolute URL
 * @param {string} imageUrl - URL hình ảnh (có thể là relative hoặc absolute)
 * @param {string} fallbackImage - Hình ảnh mặc định nếu không có
 * @returns {string} Absolute URL
 */
export const getAbsoluteImageUrl = (imageUrl, fallbackImage = '/poster-mau.png') => {
  if (!imageUrl) return `${window.location.origin}${fallbackImage}`;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${window.location.origin}${imageUrl}`;
};

/**
 * Tạo structured data cho Movie
 * @param {object} movie - Thông tin phim
 * @param {string} posterUrl - URL poster
 * @param {string} overview - Mô tả phim
 * @returns {object} Structured data JSON-LD
 */
export const generateMovieStructuredData = (movie, posterUrl, overview) => {
  if (!movie) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": movie.title || movie.name,
    "description": overview || movie.content?.replace(/<[^>]+>/g, ""),
    "image": getAbsoluteImageUrl(posterUrl),
    "datePublished": movie.year,
    "genre": movie.category?.map(cat => cat.name).join(", "),
    "contentRating": movie.quality,
    "inLanguage": movie.lang || "vi",
    "duration": movie.time,
    "aggregateRating": movie.tmdb?.vote_average ? {
      "@type": "AggregateRating",
      "ratingValue": movie.tmdb.vote_average,
      "ratingCount": movie.tmdb.vote_count
    } : undefined
  };
};

/**
 * Tạo structured data cho WebSite
 * @returns {object} Structured data JSON-LD
 */
export const generateWebsiteStructuredData = () => {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Ổ Phim",
    "url": window.location.origin,
    "description": "Xem phim online miễn phí chất lượng HD, phim chiếu rạp, phim lẻ, phim bộ, phim hoạt hình mới nhất",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${window.location.origin}/movie/search/{search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
};

/**
 * Tạo meta tags cho Open Graph
 * @param {object} options - Các tùy chọn meta tags
 * @returns {object} Object chứa các meta tags
 */
export const generateOpenGraphTags = ({
  type = 'website',
  title,
  description,
  image,
  url,
  imageWidth = '500',
  imageHeight = '750',
  imageAlt,
  locale = 'vi_VN'
}) => {
  const absoluteImage = getAbsoluteImageUrl(image);
  
  return {
    'og:type': type,
    'og:title': title,
    'og:description': description,
    'og:image': absoluteImage,
    'og:image:secure_url': absoluteImage,
    'og:image:width': imageWidth,
    'og:image:height': imageHeight,
    'og:image:alt': imageAlt || title,
    'og:image:type': 'image/jpeg',
    'og:url': url || window.location.href,
    'og:site_name': 'Ổ Phim',
    'og:locale': locale
  };
};

/**
 * Tạo meta tags cho Twitter Card
 * @param {object} options - Các tùy chọn meta tags
 * @returns {object} Object chứa các meta tags
 */
export const generateTwitterCardTags = ({
  title,
  description,
  image,
  imageAlt,
  card = 'summary_large_image'
}) => {
  return {
    'twitter:card': card,
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': getAbsoluteImageUrl(image),
    'twitter:image:alt': imageAlt || title
  };
};

/**
 * Làm sạch HTML tags khỏi text
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export const stripHtmlTags = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '');
};

/**
 * Tạo keywords từ movie data
 * @param {object} movie - Thông tin phim
 * @returns {string} Keywords string
 */
export const generateMovieKeywords = (movie) => {
  if (!movie) return '';
  
  const keywords = [
    movie.title || movie.name,
    `xem phim ${movie.title || movie.name}`,
    ...(movie.category?.map(c => c.name) || []),
    `phim ${movie.year}`
  ];
  
  return keywords.filter(Boolean).join(', ');
};
