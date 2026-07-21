import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { HomePlacementPayload, HomePlacementQuery, HomePlacementVO } from './types';

export function listHomePlacements(query: HomePlacementQuery): AxiosPromise<HomePlacementVO[]> {
  return request({
    url: '/dalanbook/admin/home-placements',
    method: 'get',
    params: query
  });
}

export function getHomePlacement(id: string): AxiosPromise<HomePlacementVO> {
  return request({
    url: `/dalanbook/admin/home-placements/${id}`,
    method: 'get'
  });
}

export function addHomePlacement(data: HomePlacementPayload) {
  return request({
    url: '/dalanbook/admin/home-placements',
    method: 'post',
    data
  });
}

export function updateHomePlacement(id: string, data: HomePlacementPayload) {
  return request({
    url: `/dalanbook/admin/home-placements/${id}`,
    method: 'put',
    data
  });
}

export function deleteHomePlacement(id: string) {
  return request({
    url: `/dalanbook/admin/home-placements/${id}`,
    method: 'delete'
  });
}
