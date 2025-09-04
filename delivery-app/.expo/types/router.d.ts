/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/dashboard` | `/dashboard`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/earnings` | `/earnings`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/orders` | `/orders`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/dashboard` | `/dashboard`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/earnings` | `/earnings`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/orders` | `/orders`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/dashboard${`?${string}` | `#${string}` | ''}` | `/dashboard${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/earnings${`?${string}` | `#${string}` | ''}` | `/earnings${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/orders${`?${string}` | `#${string}` | ''}` | `/orders${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/profile${`?${string}` | `#${string}` | ''}` | `/profile${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/dashboard` | `/dashboard`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/earnings` | `/earnings`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/orders` | `/orders`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownInputParams; };
    }
  }
}
