// export async function optimizeImage(imageUrl, maxWidth, quality) {
//   try {
//     const response = await fetch(imageUrl);
//     const blob = await response.blob();

//     const img = new Image();
//     img.src = URL.createObjectURL(blob);

//     return new Promise((resolve) => {
//       img.onload = () => {
//         const canvas = document.createElement("canvas");
//         const ctx = canvas.getContext("2d");

//         const scale = Math.min(1, maxWidth / img.width);
//         canvas.width = img.width * scale;
//         canvas.height = img.height * scale;

//         ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

//         canvas.toBlob(
//           (compressedBlob) => {
//             if (compressedBlob) {
//               const newUrl = URL.createObjectURL(compressedBlob);
//               resolve(newUrl);
//             } else {
//               resolve(imageUrl); // fallback nếu nén lỗi
//             }
//           },
//           "image/webp", // có thể đổi "image/jpeg"
//           quality
//         );
//       };
//     });
//   } catch (err) {
//     console.error("Image optimization failed:", err);
//     return imageUrl; // fallback: dùng ảnh gốc
//   }
// }

// utils/optimizeImage.js
// utils/optimizeImage.js
const cache = new Map();

export async function optimizeImage(imageUrl, maxWidth = 600, quality = 0.7) {
  if (!imageUrl) return "";

  // ✅ Trả ngay từ cache (Promise.resolve để đồng nhất async)
  if (cache.has(imageUrl)) {
    return Promise.resolve(cache.get(imageUrl));
  }

  try {
    // ✅ Dùng fetch với `cache: "force-cache"` để browser cache
    const response = await fetch(imageUrl, { cache: "force-cache" });
    const blob = await response.blob();

    // ✅ Tạo bitmap nhanh hơn (giảm overhead so với <img>)
    const imgBitmap = await createImageBitmap(blob);

    // ✅ Nếu ảnh nhỏ hơn maxWidth thì không cần resize/nén
    if (imgBitmap.width <= maxWidth) {
      const originalUrl = URL.createObjectURL(blob);
      cache.set(imageUrl, originalUrl);
      return originalUrl;
    }

    const targetWidth = maxWidth;
    const targetHeight = (imgBitmap.height * maxWidth) / imgBitmap.width;

    // ✅ Ưu tiên OffscreenCanvas (render trên thread khác)
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(targetWidth, targetHeight)
        : (() => {
            const c = document.createElement("canvas");
            c.width = targetWidth;
            c.height = targetHeight;
            return c;
          })();

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high"; // giảm noise khi resize
    ctx.drawImage(imgBitmap, 0, 0, targetWidth, targetHeight);

    // ✅ Trả blob nhanh bằng convertToBlob nếu có
    const blobPromise = canvas.convertToBlob
      ? canvas.convertToBlob({ type: "image/webp", quality })
      : new Promise((resolve) =>
          canvas.toBlob(
            (compressedBlob) => resolve(compressedBlob),
            "image/webp",
            quality
          )
        );

    const compressedBlob = await blobPromise;

    // ✅ Cache kết quả (dùng URL.createObjectURL)
    const newUrl = URL.createObjectURL(compressedBlob);
    cache.set(imageUrl, newUrl);
    return newUrl;
  } catch (err) {
    console.error("⚠️ Image optimization failed:", err);
    return imageUrl; // fallback: ảnh gốc
  }
}
