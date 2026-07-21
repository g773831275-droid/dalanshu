export type DalanbookManageType = 'posts' | 'circles' | 'topics';
export type ContentStatus = 'published' | 'hidden' | 'deleted';
export type CircleStatus = ContentStatus | 'frozen';
export type PinnedItemKind = 'rules' | 'announcement' | 'activity';
export type PinnedPublishStatus = 'published' | 'hidden';
export type ActivityStatus = 'active' | 'ended';

export interface DalanbookManageQuery extends PageQuery {
  keyword: string;
  status: string;
}

export interface PostListItem {
  id: string;
  authorId: number;
  authorName: string;
  circleId: string;
  circleName: string;
  title: string;
  content: string;
  cover: string;
  tag: string;
  topics: string[];
  visibility: string;
  status: ContentStatus;
  usefulCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CircleListItem {
  id: string;
  ownerId: number;
  name: string;
  cover: string;
  coverUrl: string;
  description: string;
  category: string;
  tags: string | string[];
  memberCount: number;
  postCount: number;
  recommendWeight: number;
  homeVisible: boolean;
  sortOrder: number;
  status: CircleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CircleDetail extends Omit<CircleListItem, 'tags'> {
  tags: string[];
  adminIds: number[];
}

export interface TopicListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  postCount: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export type DalanbookManageRow = PostListItem | CircleListItem | TopicListItem;

export interface CirclePayload {
  ownerId?: number;
  name: string;
  cover: string;
  description: string;
  category: string;
  tags: string[];
  adminIds: number[];
  recommendWeight: number;
  homeVisible: boolean;
  sortOrder: number;
  status: CircleStatus;
}

export interface CircleForm extends CirclePayload {
  id?: string;
}

export interface UserOption {
  userId: number;
  userName: string;
  nickName: string;
}

export interface PinnedImage {
  ossId: string;
  url: string;
}

export interface PinnedItem {
  id: string;
  circleId: string;
  kind: PinnedItemKind;
  title: string;
  content: string;
  images: PinnedImage[];
  publisherId: number;
  viewCount: number;
  activityStatus: ActivityStatus | null;
  sortOrder: number;
  publishStatus: PinnedPublishStatus;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PinnedItemPayload {
  kind: PinnedItemKind;
  title: string;
  content: string;
  imageOssIds: string[];
  activityStatus: ActivityStatus | null;
  sortOrder: number;
  publishStatus: PinnedPublishStatus;
}

export interface PinnedItemForm extends PinnedItemPayload {
  id: string;
}

export interface OssUploadResult {
  code: number;
  msg?: string;
  data?: {
    ossId: string | number;
    url: string;
  };
}
