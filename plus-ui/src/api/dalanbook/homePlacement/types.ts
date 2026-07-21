export type HomePlacementType = 'popup_ad' | 'pinned_notice';
export type HomePlacementStatus = 'published' | 'hidden';

export interface HomePlacementVO {
  id: string;
  placementType: HomePlacementType;
  title: string;
  summary: string | null;
  content: string | null;
  imageOssId: number | null;
  imageUrl: string | null;
  ctaText: string | null;
  targetUrl: string | null;
  priority: number;
  status: HomePlacementStatus;
  startsAt: string | null;
  endsAt: string | null;
  version: number;
  publishedAt: string | null;
  operatorId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface HomePlacementQuery extends PageQuery {
  placementType: HomePlacementType;
  status: '' | HomePlacementStatus;
  keyword: string;
}

export interface HomePlacementForm {
  id?: string;
  placementType: HomePlacementType;
  title: string;
  summary: string;
  content: string;
  imageOssId: string;
  ctaText: string;
  targetUrl: string;
  priority: number;
  status: HomePlacementStatus;
  startsAt: string | null;
  endsAt: string | null;
}

export interface HomePlacementPayload {
  placementType: HomePlacementType;
  title: string;
  summary: string | null;
  content: string | null;
  imageOssId: number | null;
  ctaText: string | null;
  targetUrl: string | null;
  priority: number;
  status: HomePlacementStatus;
  startsAt: string | null;
  endsAt: string | null;
}
