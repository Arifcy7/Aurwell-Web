export interface Author {
  _id: string;
  name: string;
  slug: { current: string };
  image?: any;
  role?: string;
  bio?: string;
}

export interface Category {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
}

export interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  mainImage?: any;
  publishedAt: string;
  readingTime?: number;
  likes?: number;
  author?: Author;
  categories?: Category[];
  body?: any;
}
