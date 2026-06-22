"use server";

import * as z from "zod";
import { prisma } from "@/prisma/prisma";
import bcrypt from "bcryptjs";
import { RegisterSchema } from "@/schemas";
import { createLogger } from "@/lib/logger";
// import { generateVerificationToken } from "@/lib/token";
// import { sendVerificationEmail } from "@/lib/mail";

const logger = createLogger('register');

export const register = async (data: z.infer<typeof RegisterSchema>) => {
  try {
    logger.info('Registration attempt started', { email: data.email });

    // Validate the input data
    const validatedData = RegisterSchema.parse(data);

    //  If the data is invalid, return an error
    if (!validatedData) {
      logger.warn('Invalid input data provided for registration');
      return { error: "Invalid input data" };
    }

    //  Destructure the validated data
    const { email, name, password, passwordConfirmation } = validatedData;

    // Check if passwords match
    if (password !== passwordConfirmation) {
      logger.warn('Password mismatch during registration', { email });
      return { error: "Passwords do not match" };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    logger.debug('Password hashed successfully');

    // Check to see if user already exists
    const userExists = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    // If the user exists, return an error
    if (userExists) {
      logger.warn('Registration attempt with existing email', { email });
      return { error: "Email already is in use. Please try another one." };
    }

    const lowerCaseEmail = email.toLowerCase();

    // Create the user
    const user = await prisma.user.create({
      data: {
        email: lowerCaseEmail,
        name,
        password: hashedPassword,
      },
    });

    logger.logAuth('createUser', user.id, {
      email: user.email,
      name: user.name,
    });

    // Generate Verification Token
    // const verificationToken = await generateVerificationToken(email);

    // await sendVerificationEmail(lowerCaseEmail, verificationToken.token);

    logger.info('User registration completed successfully', { userId: user.id, email: user.email });
    return { success: "Email Verification was sent" };
  } catch (error) {
    // Handle the error, specifically check for a 503 error
    logger.logError(error as Error, {
      action: 'register',
      email: data.email,
    });

    if ((error as { code: string }).code === "ETIMEDOUT") {
      return {
        error: "Unable to connect to the database. Please try again later.",
      };
    } else if ((error as { code: string }).code === "503") {
      return {
        error: "Service temporarily unavailable. Please try again later.",
      };
    } else {
      return { error: "An unexpected error occurred. Please try again later." };
    }
  }
};
