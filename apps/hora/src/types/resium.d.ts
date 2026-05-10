declare module 'resium' {
  import { FC, PropsWithChildren } from 'react';

  export const Entity: FC<PropsWithChildren<any>>;
  export const PointGraphics: FC<any>;
  export const EllipseGraphics: FC<any>;
  export const PolylineGraphics: FC<any>;
  export const PathGraphics: FC<any>;
  export const BillboardGraphics: FC<any>;
  export const LabelGraphics: FC<any>;
  export const Viewer: FC<PropsWithChildren<any>>;
}
