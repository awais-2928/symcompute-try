"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger('google-login');

export async function googleAuthenticate() {
    try {
      logger.info('Google authentication attempt started');
      await signIn('google');
      logger.info('Google authentication completed successfully');
    } catch (error) {
      if (error instanceof AuthError) {
        logger.warn('Google authentication failed', {
          error: error.message,
          type: error.type,
        });
        return 'google log in failed'
      }
      logger.logError(error as Error, {
        action: 'googleAuthenticate',
      });
      throw error;
    }
  }