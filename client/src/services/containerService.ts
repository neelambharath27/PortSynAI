import { api } from "./api";
import type { ContainerOption } from "../types/container";

export async function fetchContainerOptions(): Promise<ContainerOption[]> {
  const { data } = await api.get<ContainerOption[]>("/containers", {
    params: { limit: 200 },
  });
  return data;
}

export interface ContainerPosition {
  id: string;
  container_code: string;
  current_lat: number;
  current_lng: number;
  status: string;
  cargo_type: string;
}

export async function fetchContainerPositions(): Promise<ContainerPosition[]> {
  const { data } = await api.get<ContainerPosition[]>("/containers", {
    params: { limit: 200 },
  });
  return data;
}
