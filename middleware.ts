import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

const publicRoutes = ["/login", "/register"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

  // Redirect logged in users away from login/register
  if (isLoggedIn && isPublicRoute) {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }

  // Redirect non-authenticated users to login
  if (!isLoggedIn && !isPublicRoute) {
    const redirectUrl = new URL("/login", nextUrl);
    redirectUrl.searchParams.set("callbackUrl", nextUrl.href);
    return Response.redirect(redirectUrl);
  }

  return;
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
