declare module "react-map-gl" {
  import type { ComponentType, RefObject } from "react";

  export interface MapProps {
    mapboxAccessToken?: string;
    initialViewState?: {
      longitude: number;
      latitude: number;
      zoom: number;
    };
    style?: React.CSSProperties;
    mapStyle?: string;
    children?: React.ReactNode;
    onClick?: (e: any) => void;
    ref?: RefObject<any>;
    [key: string]: any;
  }

  export interface MarkerProps {
    longitude: number;
    latitude: number;
    anchor?: string;
    children?: React.ReactNode;
    onClick?: (e: any) => void;
    [key: string]: any;
  }

  export interface NavigationControlProps {
    position?: string;
    [key: string]: any;
  }

  export type MapRef = any;

  const Map: ComponentType<MapProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const NavigationControl: ComponentType<NavigationControlProps>;

  export default Map;
}
