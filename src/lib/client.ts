export async function requestJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Sesuatu tidak menjadi. Sila cuba lagi.");
  return data as T;
}

/** Same-origin, authenticated multipart upload with real transfer progress. */
export function uploadForm<T>(url: string, method: "POST" | "PATCH", form: FormData, onProgress: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const upload = new XMLHttpRequest();
    upload.open(method, url);
    upload.timeout = 120000;
    upload.responseType = "json";
    upload.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round(event.loaded / event.total * 100)));
    };
    upload.onload = () => {
      const result = upload.response;
      if (upload.status >= 200 && upload.status < 300 && result) {
        onProgress(100);
        resolve(result as T);
      } else {
        reject(new Error(result?.error || "Fail tidak dapat disimpan. Sila cuba lagi."));
      }
    };
    upload.onerror = () => reject(new Error("Sambungan terputus semasa muat naik. Semak internet anda dan cuba lagi."));
    upload.ontimeout = () => reject(new Error("Muat naik mengambil masa terlalu lama. Cuba sekali lagi atau gunakan fail lebih kecil."));
    upload.onabort = () => reject(new Error("Muat naik dibatalkan."));
    onProgress(0);
    upload.send(form);
  });
}

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Sila cuba semula.";
