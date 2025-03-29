import Retell from "retell-sdk";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "./firebase";

const RETELL_API_KEY = import.meta.env.VITE_RETELL_API_KEY;

if (!RETELL_API_KEY) {
  throw new Error("RETELL_API_KEY is not set in environment variables");
}

const client = new Retell({
  apiKey: RETELL_API_KEY,
  headers: {
    Authorization: `Bearer ${RETELL_API_KEY}`,
    "Content-Type": "application/json",
  },
});

interface AgentSkeleton {
  agent_configurations: {
    interruption_sensitivity: number;
    language: string;
    voice_id: string;
  };
  category_id: string;
  llm_configurations: {
    general_prompt: string;
    model: string;
  };
}

export const createRetellLLM = async (
  configurations: AgentSkeleton["llm_configurations"],
) => {
  try {
    const llmResponse = await client.llm.create({
      general_prompt: configurations.general_prompt,
      model: configurations.model,
    });
    if (!llmResponse?.llm_id) {
      throw new Error("Failed to create LLM - no ID returned");
    }
    return llmResponse.llm_id;
  } catch (error) {
    console.error("Error creating Retell LLM:", error);
    throw error;
  }
};

export const createRetellAgent = async (
  llmId: string,
  configurations: AgentSkeleton["agent_configurations"],
  userId: string,
  categoryId: string,
) => {
  try {
    if (!llmId) {
      throw new Error("LLM ID is required to create agent");
    }

    const agentResponse = await client.agent.create({
      response_engine: {
        llm_id: llmId,
        type: "retell-llm",
      },
      agent_name: `${userId}_${categoryId}`,
      ...configurations,
    });

    if (!agentResponse?.agent_id) {
      throw new Error("Failed to create agent - no ID returned");
    }

    // Create entry in agents collection
    await addDoc(collection(db, "agents"), {
      agentId: agentResponse.agent_id,
      llmId: llmId,
      userId: userId,
      categoryId: categoryId,
      createdAt: new Date(),
    });

    return agentResponse.agent_id;
  } catch (error) {
    console.error("Error creating Retell Agent:", error);
    throw error;
  }
};

export const fetchAgentSkeletons = async (): Promise<AgentSkeleton[]> => {
  try {
    const skeletonsSnapshot = await getDocs(collection(db, "agent_skeletons"));
    return skeletonsSnapshot.docs.map((doc) => doc.data() as AgentSkeleton);
  } catch (error) {
    console.error("Error fetching agent skeletons:", error);
    throw error;
  }
};
