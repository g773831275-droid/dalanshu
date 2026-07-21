import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import {
  CircleDetail,
  CirclePayload,
  DalanbookManageQuery,
  DalanbookManageRow,
  DalanbookManageType,
  PinnedItem,
  PinnedItemPayload,
  TopicListItem,
  UserOption
} from './types';

export function listManagedContent<T extends DalanbookManageRow>(type: DalanbookManageType, query: DalanbookManageQuery): AxiosPromise<T[]> {
  return request({
    url: `/dalanbook/admin/${type}`,
    method: 'get',
    params: query
  });
}

export function updateManagedContentStatus(type: DalanbookManageType, id: string, status: string) {
  return request({
    url: `/dalanbook/admin/${type}/${id}/status`,
    method: 'put',
    data: { status }
  });
}

export function updateTopic(id: string, data: Pick<TopicListItem, 'name' | 'description' | 'status'>) {
  return request({
    url: `/dalanbook/admin/topics/${id}`,
    method: 'put',
    data
  });
}

export function getCircle(id: string): AxiosPromise<CircleDetail> {
  return request({
    url: `/dalanbook/admin/circles/${id}`,
    method: 'get'
  });
}

export function listCircleUserOptions(keyword = ''): AxiosPromise<UserOption[]> {
  return request({
    url: '/dalanbook/admin/circle-user-options',
    method: 'get',
    params: { keyword }
  });
}

export function addCircle(data: CirclePayload) {
  return request({
    url: '/dalanbook/admin/circles',
    method: 'post',
    data
  });
}

export function updateCircle(id: string, data: CirclePayload) {
  return request({
    url: `/dalanbook/admin/circles/${id}`,
    method: 'put',
    data
  });
}

export function deleteCircle(id: string) {
  return request({
    url: `/dalanbook/admin/circles/${id}`,
    method: 'delete'
  });
}

export function listPinnedItems(circleId: string): AxiosPromise<PinnedItem[]> {
  return request({
    url: `/dalanbook/admin/circles/${circleId}/pinned-items`,
    method: 'get'
  });
}

export function addPinnedItem(circleId: string, data: PinnedItemPayload) {
  return request({
    url: `/dalanbook/admin/circles/${circleId}/pinned-items`,
    method: 'post',
    data
  });
}

export function updatePinnedItem(circleId: string, itemId: string, data: PinnedItemPayload) {
  return request({
    url: `/dalanbook/admin/circles/${circleId}/pinned-items/${itemId}`,
    method: 'put',
    data
  });
}

export function deletePinnedItem(circleId: string, itemId: string) {
  return request({
    url: `/dalanbook/admin/circles/${circleId}/pinned-items/${itemId}`,
    method: 'delete'
  });
}
