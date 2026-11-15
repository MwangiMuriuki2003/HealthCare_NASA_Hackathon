// The installed next package is missing its type declarations.
// These minimal declarations unblock typechecking for the app routes and
// components. They cover only the symbols actually imported by this project.
// Replace with a full `npm install @types/next` or a reinstall of `next` when
// the environment allows it.

declare module "next" {
  export interface NextConfig {
    [key: string]: unknown;
  }

  export interface Metadata {
    title?: string | undefined;
    description?: string | undefined;
    [key: string]: unknown;
  }

  export type LayoutProps<P extends string = "/"> = {
    children: JSX.Element | JSX.Element[] | (() => JSX.Element | JSX.Element[]);
  } & (P extends "/" ? {} : { params: Promise<{}> });

  export interface ImageProps {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string | undefined;
    priority?: boolean | undefined;
  }

  export function image(props: ImageProps): JSX.Element;
}

declare module "next/font/google" {
  export function Geist(options: {
    variable: string;
    subsets?: string[] | undefined;
  }): {
    variable: string;
    styleClassName?: string | undefined;
  };

  export function Geist_Mono(options: {
    variable: string;
    subsets?: string[] | undefined;
  }): {
    variable: string;
    styleClassName?: string | undefined;
  };
}

declare module "next/navigation" {
  export function redirect(url: string | URL): never;
}

declare module "next/server" {
  export class NextResponse extends Response {
    static json(data: unknown, init?: ResponseInit): NextResponse;
  }
}

declare module "*.css" {
  const content: unknown;
  export default content;
}
