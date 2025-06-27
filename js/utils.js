/**
 * fetchWithAuth - เรียก fetch พร้อมแนบ token และ redirect ถ้า token หมดอายุ
 * @param {string} url - URL ที่จะ fetch
 * @param {object} options - fetch options (optional)
 * @returns {Promise<Response>}
 */
export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem("token");
  options.headers = options.headers || {};
  if (!options.headers.Authorization)
    options.headers.Authorization = "Bearer " + token;
  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    localStorage.clear();
    window.location.href = "/index.html";
    throw new Error("Session expired");
  }
  return res;
}