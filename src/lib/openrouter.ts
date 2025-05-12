// Check for API key in environment variables
const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const BASE_URL = 'https://openrouter.ai/api/v1';

// Initial dummy models if API key is not set
const DEFAULT_MODELS: Model[] = [
  {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'For most everyday tasks',
    pricing: { prompt: 0.0005, completion: 0.0015 }
  },
  {
    id: 'openai/gpt-4',
    name: 'GPT-4',
    description: 'Advanced reasoning capabilities',
    pricing: { prompt: 0.003, completion: 0.006 }
  }
];

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: number;
    completion: number;
  };
}

export async function listModels(): Promise<Model[]> {
  if (!API_KEY || API_KEY === 'placeholder-key') {
    console.warn('OpenRouter API key not set or using placeholder. Using default models.');
    return DEFAULT_MODELS;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch models: ${response.statusText}`);
      return DEFAULT_MODELS; // Return default models on error
    }

    const data = await response.json();
    // Filter models that have permission 'chat' (adjust based on actual API response structure if needed)
    return data.data?.filter((model: any) => model.permission === 'chat' || model.id.includes('chat')) || DEFAULT_MODELS;
  } catch (error) {
    console.error('Error fetching models:', error);
    return DEFAULT_MODELS; // Return default models on error
  }
}

// Note: sendChat function using client-side fetch with API Key is insecure for production.
// This should be moved to a server-side API route later.
export async function sendChat(
  messages: ChatMessage[],
  model: string,
  files?: File[]
) {
  if (!API_KEY || API_KEY === 'placeholder-key') {
    // Return a simulated response for testing without an API key
    return simulateStreamingResponse(messages);
  }

  const payload: any = {
    model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    stream: true
  };

  // File handling for multimodal models
  // Currently we only support sending text content without files
  // Add this if files integration is implemented
  if (files?.length) {
    console.warn("File uploads are not yet supported in this implementation");
  }

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Failed to send message: ${response.statusText}`, errorBody);
      throw new Error(`Failed to send message: ${errorBody}`);
    }
    
    // If streaming, return the response body stream directly
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
       return response.body; // Return the ReadableStream for processing
    }

    // If not streaming, parse JSON
    return await response.json(); // Or handle non-streaming response appropriately

  } catch (error) {
    console.error('Error sending chat:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Function to simulate a streaming response for testing without an API key
function simulateStreamingResponse(messages: ChatMessage[]): ReadableStream<Uint8Array> {
  // Create a sample assistant response based on user's last message
  const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()?.content || '';
  const simulatedResponse = `This is a simulated response without an API key. You said: "${lastUserMessage}". To use real AI capabilities, please add your OpenRouter API key to the .env.local file.`;
  
  const chunks = simulatedResponse.split(' ');
  
  return new ReadableStream({
    start(controller) {
      let index = 0;
      
      // Send the SSE format message in chunks
      const interval = setInterval(() => {
        if (index < chunks.length) {
          const chunk = chunks[index];
          // Format according to OpenAI SSE format
          const data = JSON.stringify({
            choices: [{ delta: { content: chunk + ' ' } }]
          });
          
          controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          index++;
        } else {
          // End of message
          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
          clearInterval(interval);
          controller.close();
        }
      }, 100); // Simulated delay between chunks
    }
  });
} 