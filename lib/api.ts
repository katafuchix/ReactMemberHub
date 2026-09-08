import axios from 'axios';

const TOKEN_KEY = 'memberhub.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

// ネイティブ (capacitor://localhost 等) では Vite proxy が無いため相対 /api は解決できない。
// VITE_API_BASE_URL (絶対URL) の設定漏れをすぐ気付けるように警告する。
if (
  !import.meta.env.VITE_API_BASE_URL &&
  typeof window !== 'undefined' &&
  !window.location.protocol.startsWith('http')
) {
  console.warn(
    `[api] VITE_API_BASE_URL が未設定です。baseURL="${apiBaseUrl}" ではネイティブから API に到達できません。` +
      '.env.staging / .env.production に絶対URLを設定してビルドし直してください。',
  );
}

export const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- 型 ----
export interface User {
  id: string;
  email?: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  role?: 'member' | 'admin';
  membership: 'free' | 'premium';
  emailVerified: boolean;
  createdAt: string;
}

export interface PostAuthor {
  _id: string;
  displayName: string;
  avatarUrl?: string;
  membership?: 'free' | 'premium';
  bio?: string;
}

export interface Post {
  _id: string;
  author: PostAuthor;
  body: string;
  imageUrls: string[];
  tags: string[];
  visibility: 'public' | 'members';
  commentCount: number;
  reactionCount: number;
  createdAt: string;
}

export interface Comment {
  _id: string;
  post: string;
  author: PostAuthor;
  body: string;
  createdAt: string;
}

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  imageUrl: string;
  pinned: boolean;
  publishedAt: string;
  createdAt: string;
}

export interface EventItem {
  _id: string;
  title: string;
  body: string;
  imageUrl: string;
  location: string;
  startAt: string;
  endAt: string;
  createdAt: string;
}

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'audio' | 'article';
  thumbnailUrl: string;
  visibility: 'public' | 'members' | 'premium';
  isRecommended: boolean;
  locked: boolean;
  url: string | null;
}
