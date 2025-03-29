import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError,
} from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import {
  createRetellLLM,
  createRetellAgent,
  fetchAgentSkeletons,
} from "../lib/retell";
import { UserPlus, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import type { CreateUserData } from "../types/user";

interface AuthFormProps {
  isSignUp?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({ isSignUp = false }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const setupUserResources = async (userId: string) => {
    try {
      // Create user document with typed data
      const userData: CreateUserData = {
        name,
        email,
        createdAt: new Date(),
        llmIds: [],
        agentIds: [],
        isOnboarded: false,
      };

      // Create initial user document
      await setDoc(doc(db, "users", userId), {
        ...userData,
        updatedAt: serverTimestamp(),
      });

      // Create Retell resources in the background
      createRetellResources(userId).catch((error) => {
        console.error("Error creating Retell resources:", error);
        toast.error(
          "Some AI features may be unavailable. Please contact support if issues persist.",
        );
      });
    } catch (error) {
      console.error("Error setting up user resources:", error);
      toast.error(
        "Some features may be unavailable. Please try refreshing the page.",
      );
    }
  };

  const createRetellResources = async (userId: string) => {
    const llmIds: string[] = [];
    const agentIds: string[] = [];

    try {
      // Fetch agent skeletons from Firestore
      const skeletons = await fetchAgentSkeletons();

      // Create an LLM and agent for each skeleton
      for (const skeleton of skeletons) {
        // Create LLM with skeleton configurations
        const llmId = await createRetellLLM(skeleton.llm_configurations);
        if (!llmId) {
          throw new Error(
            `Failed to create LLM for category ${skeleton.category_id}`,
          );
        }
        llmIds.push(llmId);

        // Create agent with the LLM ID and skeleton configurations
        const agentId = await createRetellAgent(
          llmId,
          skeleton.agent_configurations,
          userId,
          skeleton.category_id,
        );
        if (!agentId) {
          throw new Error(
            `Failed to create agent for category ${skeleton.category_id}`,
          );
        }
        agentIds.push(agentId);
      }

      // Save the IDs to Firestore
      await updateDoc(doc(db, "users", userId), {
        llmIds,
        agentIds,
        updatedAt: serverTimestamp(),
      });

      console.log("Successfully created Retell resources:", {
        llmIds,
        agentIds,
      });
      toast.success("AI resources setup completed!");
    } catch (error) {
      console.error("Error creating Retell resources:", error);
      throw error;
    }
  };

  const handleAuthError = (error: AuthError | Error) => {
    console.error("Authentication error:", error);

    const errorMessages: Record<string, string> = {
      "auth/invalid-credential": "Invalid email or password. Please try again.",
      "auth/wrong-password": "Invalid email or password. Please try again.",
      "auth/user-not-found":
        "No account found with this email. Please sign up first.",
      "auth/email-already-in-use":
        "An account with this email already exists. Please sign in instead.",
      "auth/weak-password": "Password should be at least 6 characters long.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/network-request-failed":
        "Network error. Please check your connection.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/operation-not-allowed": "This sign-in method is not enabled.",
    };

    const code = (error as AuthError).code;
    const message = code ? errorMessages[code] : error.message;
    toast.error(message || "An error occurred. Please try again.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Create user account first
        const { user } = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        // Navigate to dashboard immediately
        navigate("/stories");

        // Show initial success message
        toast.success("Account created! Setting up your profile...");

        // Handle profile setup in the background
        await setupUserResources(user.uid);
      } else {
        const { user } = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );

        navigate("/stories");

        // Update last login timestamp
        await updateDoc(doc(db, "users", user.uid), {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast.success("Signed in successfully!");
      }
    } catch (error) {
      handleAuthError(error as Error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isSignUp ? "Create an Account" : "Sign In"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              minLength={6}
            />
            <p className="mt-1 text-sm text-gray-500">
              Password must be at least 6 characters long
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              "Processing..."
            ) : isSignUp ? (
              <>
                <UserPlus className="w-5 h-5 mr-2" />
                Sign Up
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </>
            )}
          </button>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <Link
                    to="/signin"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
