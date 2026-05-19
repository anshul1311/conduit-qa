import { APIRequestContext, APIResponse, expect, request } from '@playwright/test';
import { API_BASE_URL } from '../../playwright.config';
import {
  Article,
  ArticleResponse,
  ArticlesResponse,
  Comment,
  CommentResponse,
  CommentsResponse,
  LoginCredentials,
  NewArticle,
  NewComment,
  NewUser,
  Profile,
  ProfileResponse,
  UpdateArticle,
  User,
  UserResponse,
} from './types';

/**
 * Typed wrapper around the Conduit REST API.
 *
 * AGENT CONTRACT
 * --------------
 * 1. All API access in tests and fixtures goes through this class. Do NOT call
 *    `request.newContext()` directly inside a test.
 * 2. Each method returns the *unwrapped* domain object (e.g. `Article`, not
 *    `{ article: Article }`). Wrappers are an implementation detail.
 * 3. Each method asserts a successful status with
 *    `await expect(...).toBeOK()` — the `await` is required, `toBeOK()` is
 *    async. Without it, a failed status throws as an unhandled rejection
 *    *after* the next line has already tried to parse the response body, and
 *    you get a confusing "cannot read property of undefined" instead of the
 *    descriptive message.
 * 4. Auth: pass a `token` to `ConduitApi.create(token)` for an authenticated
 *    client. Token-less calls hit anonymous endpoints. Tokens are baked into
 *    the request context at creation time — they aren't mutable later.
 * 5. The auth header is `Authorization: Token <jwt>` (RealWorld spec) — not
 *    `Bearer`. The Conduit backend will silently 401 a Bearer header.
 */
export class ConduitApi {
  private constructor(private readonly ctx: APIRequestContext) {}

  static async create(token?: string): Promise<ConduitApi> {
    const ctx = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Token ${token}` } : {}),
      },
    });
    return new ConduitApi(ctx);
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  async register(user: NewUser): Promise<User> {
    const res = await this.ctx.post('/api/users', { data: { user } });
    await expect(res, `POST /users failed: ${await safeBody(res)}`).toBeOK();
    return ((await res.json()) as UserResponse).user;
  }

  async login(creds: LoginCredentials): Promise<User> {
    const res = await this.ctx.post('/api/users/login', { data: { user: creds } });
    await expect(res, `POST /users/login failed: ${await safeBody(res)}`).toBeOK();
    return ((await res.json()) as UserResponse).user;
  }

  async currentUser(): Promise<User> {
    const res = await this.ctx.get('/api/user');
    await expect(res, `GET /user failed: ${await safeBody(res)}`).toBeOK();
    return ((await res.json()) as UserResponse).user;
  }

  // -------------------------------------------------------------------------
  // Articles
  // -------------------------------------------------------------------------

  async createArticle(article: NewArticle): Promise<Article> {
    const res = await this.ctx.post('/api/articles', { data: { article } });
    await expect(res, `POST /articles failed: ${await safeBody(res)}`).toBeOK();
    return ((await res.json()) as ArticleResponse).article;
  }

  async getArticle(slug: string): Promise<Article> {
    const res = await this.ctx.get(`/api/articles/${slug}`);
    await expect(res, `GET /articles/${slug} failed: ${await safeBody(res)}`).toBeOK();
    return ((await res.json()) as ArticleResponse).article;
  }

  async listArticles(
    params: { author?: string; tag?: string; limit?: number } = {},
  ): Promise<ArticlesResponse> {
    const query = new URLSearchParams();
    if (params.author) query.set('author', params.author);
    if (params.tag) query.set('tag', params.tag);
    if (params.limit != null) query.set('limit', String(params.limit));
    const res = await this.ctx.get(`/api/articles?${query.toString()}`);
    await expect(res, `GET /articles failed: ${await safeBody(res)}`).toBeOK();
    return (await res.json()) as ArticlesResponse;
  }

  async updateArticle(slug: string, patch: UpdateArticle): Promise<Article> {
    const res = await this.ctx.put(`/api/articles/${slug}`, { data: { article: patch } });
    await expect(res, `PUT /articles/${slug} failed: ${await safeBody(res)}`).toBeOK();
    return ((await res.json()) as ArticleResponse).article;
  }

  async deleteArticle(slug: string): Promise<void> {
    const res = await this.ctx.delete(`/api/articles/${slug}`);
    expect(
      [200, 204].includes(res.status()),
      `DELETE /articles/${slug} returned ${res.status()}: ${await safeBody(res)}`,
    ).toBe(true);
  }

  // -------------------------------------------------------------------------
  // Favorites
  // -------------------------------------------------------------------------

  async favoriteArticle(slug: string): Promise<Article> {
    const res = await this.ctx.post(`/api/articles/${slug}/favorite`);
    await expect(res, `POST /articles/${slug}/favorite failed: ${await safeBody(res)}`).toBeOK();
    return ((await res.json()) as ArticleResponse).article;
  }

  async unfavoriteArticle(slug: string): Promise<Article> {
    const res = await this.ctx.delete(`/api/articles/${slug}/favorite`);
    await expect(res, `DELETE /articles/${slug}/favorite failed: ${await safeBody(res)}`).toBeOK();
    return ((await res.json()) as ArticleResponse).article;
  }

  // -------------------------------------------------------------------------
  // Comments
  // -------------------------------------------------------------------------

  async createComment(slug: string, comment: NewComment): Promise<Comment> {
    const res = await this.ctx.post(`/api/articles/${slug}/comments`, { data: { comment } });
    await expect(res, `POST /articles/${slug}/comments failed: ${await safeBody(res)}`).toBeOK();
    return ((await res.json()) as CommentResponse).comment;
  }

  async listComments(slug: string): Promise<Comment[]> {
    const res = await this.ctx.get(`/api/articles/${slug}/comments`);
    await expect(res, `GET /articles/${slug}/comments failed: ${await safeBody(res)}`).toBeOK();
    return ((await res.json()) as CommentsResponse).comments;
  }

  // -------------------------------------------------------------------------
  // Profiles
  // -------------------------------------------------------------------------

  async getProfile(username: string): Promise<Profile> {
    const res = await this.ctx.get(`/api/profiles/${username}`);
    await expect(res, `GET /profiles/${username} failed: ${await safeBody(res)}`).toBeOK();
    return ((await res.json()) as ProfileResponse).profile;
  }

  /** Expose raw context for the rare case a test needs an unwrapped response. */
  raw(): APIRequestContext {
    return this.ctx;
  }
}

async function safeBody(res: APIResponse): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<unreadable body>';
  }
}
