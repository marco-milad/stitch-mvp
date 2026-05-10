import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { z } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ApiClient = AxiosInstance;

export interface ApiClientOptions {
  baseURL: string;
  getToken?: () => Promise<string | null>;
  timeout?: number;
}

export function createApiClient(opts: ApiClientOptions): ApiClient {
  const client = axios.create({
    baseURL: opts.baseURL,
    timeout: opts.timeout ?? 30000,
  });

  const getToken = opts.getToken;
  if (getToken) {
    client.interceptors.request.use(async (config) => {
      const token = await getToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
      return config;
    });
  }

  return client;
}

/**
 * Endpoint factory that returns a typed call function. Accepts an input that
 * is sent as query params for GET, body otherwise.
 *
 * @example
 *   const updateMe = endpoint({
 *     method: 'PATCH',
 *     path: '/users/me',
 *     inputSchema: UserUpdateSchema,
 *     outputSchema: UserSchema,
 *   });
 *   const user = await updateMe(client, { firstName: 'Marco' });
 */
export function endpoint<TInput, TOutput>(def: {
  method: HttpMethod;
  path: string | ((input: TInput) => string);
  inputSchema?: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
}): (client: ApiClient, input: TInput) => Promise<TOutput> {
  return async (client, input) => {
    const path = typeof def.path === 'function' ? def.path(input) : def.path;
    const config: AxiosRequestConfig = { method: def.method, url: path };
    if (def.method === 'GET') {
      config.params = input;
    } else {
      config.data = input;
    }
    const res = await client.request(config);
    return def.outputSchema.parse(res.data);
  };
}

/** Variant of `endpoint` for endpoints that take no input. */
export function endpointNoInput<TOutput>(def: {
  method: HttpMethod;
  path: string;
  outputSchema: z.ZodType<TOutput>;
}): (client: ApiClient) => Promise<TOutput> {
  return async (client) => {
    const res = await client.request({ method: def.method, url: def.path });
    return def.outputSchema.parse(res.data);
  };
}
