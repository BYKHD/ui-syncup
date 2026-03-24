type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>

export interface ApiClientConfig extends Omit<RequestInit, 'body' | 'method'> {
  method?: HttpMethod
  body?: BodyInit | Record<string, unknown>
  query?: QueryParams
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

export class ApiError<T = unknown> extends Error {
  public status: number
  public payload: T | null

  constructor(status: number, message: string, payload: T | null = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }
}

function buildUrl(path: string, query?: QueryParams): string {
  // In the browser, always use relative URLs so fetch() resolves against the
  // current origin. NEXT_PUBLIC_API_URL is baked at build time (defaulting to
  // http://localhost:3000 in the pre-built Docker image), so using it in the
  // browser would send requests to the wrong host on self-hosted deployments.
  if (typeof window !== "undefined") {
    if (!query) return path
    const qs = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) qs.set(key, String(value))
    })
    const queryStr = qs.toString()
    return queryStr ? `${path}?${queryStr}` : path
  }

  const url = new URL(path, API_BASE_URL || "http://localhost")

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      url.searchParams.set(key, String(value))
    })
  }

  return url.toString()
}

export async function apiClient<TResponse>(
  path: string,
  { method = "GET", headers, body, query, ...rest }: ApiClientConfig = {}
): Promise<TResponse> {
  const url = buildUrl(path, query)

  const normalizedBody =
    body && typeof body === "object" && !(body instanceof FormData)
      ? JSON.stringify(body)
      : body

  const defaultHeaders: HeadersInit = {}
  if (!(normalizedBody instanceof FormData) && normalizedBody) {
    defaultHeaders["Content-Type"] = "application/json"
  }

  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    body: normalizedBody,
    ...rest,
  })

  const isJson =
    response.headers.get("content-type")?.includes("application/json")

  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    // Log the error for debugging
    // Skip 401 errors to avoid noise in the console (expected for unauthenticated users)
    if (process.env.NODE_ENV === 'development' && response.status !== 401) {
      console.error(
        '[API Error]', 
        JSON.stringify({
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          payload,
        }, null, 2)
      )
    }
    throw new ApiError(response.status, response.statusText, payload)
  }

  return payload as TResponse
}
