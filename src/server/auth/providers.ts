import { env } from "@/env";

import DiscordProvider, {
  type DiscordProfile,
} from "next-auth/providers/discord";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import GithubProvider, { type GitHubProfile } from "next-auth/providers/github";
import TwitterProvider, {
  type TwitterProfile,
} from "next-auth/providers/twitter";
import NotionProvider, { type NotionProfile } from "next-auth/providers/notion";
import SpotifyProvider, {
  type SpotifyProfile,
} from "next-auth/providers/spotify";
import CredentialsProvider from "next-auth/providers/credentials";

import type {
  CredentialInput,
  CredentialsConfig,
  OAuthConfig,
} from "next-auth/providers";
import { IS_DEVELOPMENT } from "@/lib/constants";
import { db } from "../db";

// Strava provider profile type
interface StravaProfile {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  profile: string;
  profile_medium: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  premium: boolean;
  created_at: string;
  updated_at: string;
}

// Strava provider using NextAuth OAuth flow
const StravaProvider = (options: {
  clientId: string;
  clientSecret: string;
}): OAuthConfig<StravaProfile> => {
  return {
    id: "strava",
    name: "Strava",
    type: "oauth",
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorization: {
      url: "https://www.strava.com/oauth/authorize",
      params: {
        scope: "read,activity:read_all",
        response_type: "code",
      },
    },
    token: "https://www.strava.com/oauth/token",
    userinfo: "https://www.strava.com/api/v3/athlete",
    profile(profile: StravaProfile) {
      return {
        id: profile.id.toString(),
        name: `${profile.firstname} ${profile.lastname}`,
        email: profile.email || null,
        image: profile.profile || profile.profile_medium || null,
      };
    },
    style: {
      logo: "https://developers.strava.com/images/strava_logo_orange.svg",
      bg: "#fc4c02",
      text: "#fff",
    },
    allowDangerousEmailAccountLinking: true,
  };
};

export const providers: (
  | OAuthConfig<DiscordProfile>
  | OAuthConfig<GoogleProfile>
  | OAuthConfig<GitHubProfile>
  | OAuthConfig<TwitterProfile>
  | OAuthConfig<NotionProfile>
  | OAuthConfig<StravaProfile>
  | OAuthConfig<SpotifyProfile>
  | CredentialsConfig<Record<string, CredentialInput>>
)[] = [
  ...("AUTH_DISCORD_ID" in env && "AUTH_DISCORD_SECRET" in env
    ? [
        DiscordProvider({
          clientId: env.AUTH_DISCORD_ID,
          clientSecret: env.AUTH_DISCORD_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
  ...("AUTH_GOOGLE_ID" in env && "AUTH_GOOGLE_SECRET" in env
    ? [
        GoogleProvider({
          clientId: env.AUTH_GOOGLE_ID,
          clientSecret: env.AUTH_GOOGLE_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
  ...("AUTH_GITHUB_ID" in env && "AUTH_GITHUB_SECRET" in env
    ? [
        GithubProvider({
          clientId: env.AUTH_GITHUB_ID,
          clientSecret: env.AUTH_GITHUB_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
  ...("AUTH_TWITTER_ID" in env && "AUTH_TWITTER_SECRET" in env
    ? [
        TwitterProvider({
          clientId: env.AUTH_TWITTER_ID,
          clientSecret: env.AUTH_TWITTER_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
  ...("AUTH_NOTION_ID" in env && "AUTH_NOTION_SECRET" in env
    ? [
        NotionProvider({
          clientId: env.AUTH_NOTION_ID,
          clientSecret: env.AUTH_NOTION_SECRET,
          redirectUri: `${env.NEXTAUTH_URL}/api/auth/callback/notion`,
          token: {
            conform: async (response: Response) => {
              const body = (await response.json()) as {
                refresh_token?: string;
              };
              if (body?.refresh_token === null) {
                delete body.refresh_token;
              }
              return new Response(JSON.stringify(body), response);
            },
          },
        }),
      ]
    : []),
  ...("AUTH_STRAVA_ID" in env && "AUTH_STRAVA_SECRET" in env
    ? [
        StravaProvider({
          clientId: env.AUTH_STRAVA_ID,
          clientSecret: env.AUTH_STRAVA_SECRET,
        }),
      ]
    : []),
  ...("AUTH_SPOTIFY_ID" in env && "AUTH_SPOTIFY_SECRET" in env
    ? [
        SpotifyProvider({
          clientId: env.AUTH_SPOTIFY_ID,
          clientSecret: env.AUTH_SPOTIFY_SECRET,
          authorization:
            "https://accounts.spotify.com/authorize?scope=user-read-email+playlist-read-private+playlist-read-collaborative+user-library-read",
          allowDangerousEmailAccountLinking: true,
          // Spotify does not allow localhost redirects, so we need to use the IP of localhost instead
          redirectProxyUrl: IS_DEVELOPMENT
            ? `http://127.0.0.1:3000/api/auth`
            : undefined,
        }),
      ]
    : []),
  ...(IS_DEVELOPMENT
    ? [
        CredentialsProvider({
          id: "guest",
          name: "Guest",
          credentials: {},
          async authorize() {
            const existingUser = await db.user.findUnique({
              where: {
                email: "guest@toolkit.dev",
              },
            });

            if (existingUser) {
              return {
                id: existingUser.id,
                name: existingUser.name,
                email: existingUser.email,
                image: existingUser.image,
              };
            }

            const user = await db.user.create({
              data: {
                name: "Guest",
                email: "guest@toolkit.dev",
                image: "/manifest/web-app-manifest-512x512.png",
              },
            });

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
            };
          },
        }),
      ]
    : []),
];
