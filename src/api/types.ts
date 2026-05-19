/**
 * Conduit / RealWorld API types.
 *
 * These mirror the RealWorld API spec the Conduit app implements:
 *   https://github.com/gothinkster/realworld/tree/main/api
 *
 * AGENT NOTE: When adding new endpoints, add the request/response shape here
 * first, then implement the call in `client.ts`. Tests should never reference
 * `any`-typed responses — that's a smell the agent-check script flags.
 */

export interface User {
  email: string;
  token: string;
  username: string;
  bio: string | null;
  image: string | null;
}

export interface UserResponse {
  user: User;
}

export interface NewUser {
  username: string;
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Profile {
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
}

export interface ProfileResponse {
  profile: Profile;
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: Profile;
}

export interface ArticleResponse {
  article: Article;
}

export interface ArticlesResponse {
  articles: Article[];
  articlesCount: number;
}

export interface NewArticle {
  title: string;
  description: string;
  body: string;
  tagList?: string[];
}

export interface UpdateArticle {
  title?: string;
  description?: string;
  body?: string;
  tagList?: string[];
}

export interface Comment {
  id: number;
  createdAt: string;
  updatedAt: string;
  body: string;
  author: Profile;
}

export interface CommentResponse {
  comment: Comment;
}

export interface CommentsResponse {
  comments: Comment[];
}

export interface NewComment {
  body: string;
}

export interface ApiErrorBody {
  errors: Record<string, string[] | string>;
}
