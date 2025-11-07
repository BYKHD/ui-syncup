import { env } from "./env"

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>

export interface ApiClientConfig extends RequestInit {
  method?: HttpMethod
  body?: BodyInit | Record<string, unknown>
  query?: QueryParams
}

const API_BASE_URL = env.NEXT_PUBLIC_API_URL ?? ""

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

function buildUrl(path: string, query?: QueryParams) {
  const base = API_BASE_URL || ""
  const url = new URL(path, base || "http://localhost")

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

  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type":
        normalizedBody instanceof FormData ? undefined : "application/json",
      ...headers,
    },
    body: normalizedBody,
    ...rest,
  })

  const isJson =
    response.headers.get("content-type")?.includes("application/json")

  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, payload)
  }

  return payload as TResponse
}
