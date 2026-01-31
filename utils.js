/**
 * Constructs an absolute URL for an asset from a relative path.
 * @param {string} path - The relative path to the asset.
 * @returns {string} The full URL of the asset.
 */
export function getAssetUrl(path) {
    return new URL(path, import.meta.url).href;
}